import jsPDF from "jspdf";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCHEME_SECTORS, SCHEMES } from "@/data/schemes";
import { Panel, ShareBar } from "./shared";

/*
 * Paperwork does not arrive in one pile. Banks ask for it in stages, so the
 * checklist is grouped by the aspect a person actually gathers it under.
 */

type AspectId = "identity" | "business" | "finance" | "project" | "premises" | "scheme";

const ASPECTS: Array<{ id: AspectId; title: string; blurb: string }> = [
  { id: "identity", title: "Identity and address", blurb: "What the bank verifies first." },
  { id: "business", title: "Business registration", blurb: "Proof the venture actually exists." },
  { id: "finance", title: "Financial records", blurb: "What you earn, spend and already owe." },
  {
    id: "project",
    title: "Project and quotations",
    blurb: "Backs up the amount you are asking for.",
  },
  { id: "premises", title: "Premises", blurb: "Where the work really happens." },
  { id: "scheme", title: "Scheme specific", blurb: "Extras your chosen scheme insists on." },
];

type DocItem = {
  id: string;
  label: string;
  aspect: AspectId;
  /** Only offered for these business categories. Empty means every category. */
  sectors?: string[];
  /** Only offered for these scheme ids. Empty means every scheme. */
  schemes?: string[];
};

const DOCUMENTS: DocItem[] = [
  // Identity and address
  { id: "photo", label: "Passport size photographs", aspect: "identity" },
  { id: "id-proof", label: "Aadhaar and PAN copies", aspect: "identity" },
  { id: "addr-proof", label: "Address proof for home and business place", aspect: "identity" },

  // Business registration
  { id: "udyam", label: "Udyam registration certificate", aspect: "business" },
  { id: "gst", label: "GST registration, if your turnover requires it", aspect: "business" },
  { id: "shop-est", label: "Shop and establishment registration", aspect: "business" },
  {
    id: "fssai",
    label: "FSSAI registration or licence",
    aspect: "business",
    sectors: ["Food"],
  },
  {
    id: "craft-proof",
    label: "Proof of craft or trade being practised",
    aspect: "business",
    sectors: ["Artisan"],
  },

  // Financial records
  { id: "bank-6m", label: "Bank statements for the last six months", aspect: "finance" },
  { id: "existing-loans", label: "Details of loans or EMIs already running", aspect: "finance" },
  { id: "itr", label: "Last year's income tax return, if filed", aspect: "finance" },
  {
    id: "milk-buyer",
    label: "Milk collection or buyer arrangement note",
    aspect: "finance",
    sectors: ["Dairy"],
  },

  // Project and quotations
  { id: "quotes", label: "Quotations for equipment, stock or machinery", aspect: "project" },
  { id: "cost-sheet", label: "Project cost working sheet", aspect: "project" },
  { id: "plan", label: "Short business plan with expected sales and costs", aspect: "project" },
  {
    id: "supplier-list",
    label: "Supplier list with price comparisons",
    aspect: "project",
    sectors: ["Retail", "General store", "Hardware"],
  },
  {
    id: "cattle-quote",
    label: "Cattle purchase quotation",
    aspect: "project",
    sectors: ["Dairy"],
  },
  {
    id: "crop-plan",
    label: "Crop or input purchase plan",
    aspect: "project",
    sectors: ["Agriculture"],
  },
  {
    id: "tool-quote",
    label: "Tool purchase quotation",
    aspect: "project",
    sectors: ["Repair", "Artisan"],
  },
  {
    id: "machinery-quote",
    label: "Machinery quotation",
    aspect: "project",
    sectors: ["Manufacturing", "Textiles"],
  },

  // Premises
  { id: "rent", label: "Rent agreement or ownership proof", aspect: "premises" },
  {
    id: "kitchen",
    label: "Kitchen or stall premises proof",
    aspect: "premises",
    sectors: ["Food"],
  },
  {
    id: "land",
    label: "Land record or lease agreement",
    aspect: "premises",
    sectors: ["Agriculture", "Dairy"],
  },
  {
    id: "workshop",
    label: "Workshop premises proof",
    aspect: "premises",
    sectors: ["Repair", "Garage"],
  },
  {
    id: "power",
    label: "Power connection or approval proof",
    aspect: "premises",
    sectors: ["Manufacturing"],
  },

  // Scheme specific
  {
    id: "trade-list",
    label: "Trade declaration against the notified artisan list",
    aspect: "scheme",
    schemes: ["pm-vishwakarma"],
  },
  {
    id: "vending-cert",
    label: "Certificate of vending or letter of recommendation",
    aspect: "scheme",
    schemes: ["pm-svanidhi"],
  },
  {
    id: "vending-photo",
    label: "Photograph of the vending spot",
    aspect: "scheme",
    schemes: ["pm-svanidhi"],
  },
  {
    id: "category-cert",
    label: "Category certificate, where applicable",
    aspect: "scheme",
    schemes: ["stand-up-india", "pmegp"],
  },
  {
    id: "greenfield",
    label: "Greenfield project declaration",
    aspect: "scheme",
    schemes: ["stand-up-india"],
  },
  {
    id: "margin-proof",
    label: "Proof of margin money",
    aspect: "scheme",
    schemes: ["sidbi-micro"],
  },
  {
    id: "collateral",
    label: "Collateral or guarantee details, if asked",
    aspect: "scheme",
    schemes: ["sidbi-term-loan", "cgtmse"],
  },
  {
    id: "project-report",
    label: "Detailed project report",
    aspect: "scheme",
    schemes: ["sidbi-term-loan", "ahidf", "nlm"],
  },
  {
    id: "education-cert",
    label: "Education certificate",
    aspect: "scheme",
    schemes: ["pmegp"],
  },
  {
    id: "licence",
    label: "Manufacturing or trade licence",
    aspect: "scheme",
    schemes: ["pli-pharma", "pli-telecom", "spi", "amdcf"],
  },
];

function matches(item: DocItem, sector: string, schemeId: string) {
  if (item.sectors && item.sectors.length > 0 && !item.sectors.includes(sector)) return false;
  if (item.schemes && item.schemes.length > 0 && !item.schemes.includes(schemeId)) return false;
  return true;
}

export function DocumentsTab() {
  const [sector, setSector] = useState<string>("Retail");
  const [schemeId, setSchemeId] = useState<string>("pmmy-mudra");
  const [collected, setCollected] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const visible = DOCUMENTS.filter((item) => matches(item, sector, schemeId));
    return ASPECTS.map((aspect) => ({
      ...aspect,
      items: visible.filter((item) => item.aspect === aspect.id),
    })).filter((group) => group.items.length > 0);
  }, [sector, schemeId]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = groups.reduce(
    (sum, group) => sum + group.items.filter((item) => collected[item.id]).length,
    0,
  );
  const selectedScheme = SCHEMES.find((scheme) => scheme.id === schemeId);

  function download() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Sahiti document checklist", 14, 20);
    doc.setFontSize(11);
    doc.text(`Business category: ${sector}`, 14, 30);
    doc.text(`Scheme: ${selectedScheme?.name ?? "Not selected"}`, 14, 37);
    doc.text(`Progress: ${done} of ${total}`, 14, 44);

    let y = 56;
    for (const group of groups) {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(group.title, 14, y);
      y += 7;
      doc.setFontSize(10);
      for (const item of group.items) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${collected[item.id] ? "[x]" : "[ ]"} ${item.label}`, 18, y);
        y += 6;
      }
      y += 4;
    }

    doc.setFontSize(9);
    doc.text("Confirm the final list with your bank branch.", 14, Math.min(y + 4, 285));
    doc.save("sahiti-document-checklist.pdf");
    toast.success("Checklist downloaded");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel title="What are you preparing for?" className="h-fit">
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-sector">Business category</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger id="doc-sector" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_SECTORS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doc-scheme">Scheme you have in mind</Label>
              <Select value={schemeId} onValueChange={setSchemeId}>
                <SelectTrigger id="doc-scheme" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((scheme) => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-secondary p-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Overall</span>
                <span className="tabular-nums text-muted-foreground">
                  {done} of {total}
                </span>
              </div>
              <div className="mt-2">
                <ShareBar
                  percent={total === 0 ? 0 : (done / total) * 100}
                  label="Documents collected"
                />
              </div>
            </div>

            <Button className="w-full" onClick={download}>
              <Download aria-hidden="true" className="size-4" />
              Download checklist
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          {groups.map((group) => {
            const groupDone = group.items.filter((item) => collected[item.id]).length;
            const complete = groupDone === group.items.length;
            return (
              <section key={group.id} className="rounded-md border">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold">{group.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{group.blurb}</p>
                  </div>
                  <span
                    className={
                      complete
                        ? "text-xs font-medium text-success"
                        : "text-xs tabular-nums text-muted-foreground"
                    }
                  >
                    {groupDone}/{group.items.length}
                  </span>
                </header>
                <ul className="divide-y">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <Checkbox
                        id={`doc-${item.id}`}
                        checked={Boolean(collected[item.id])}
                        onCheckedChange={(value) =>
                          setCollected((current) => ({ ...current, [item.id]: value === true }))
                        }
                      />
                      <Label
                        htmlFor={`doc-${item.id}`}
                        className="text-sm font-normal leading-6 text-foreground"
                      >
                        {item.label}
                      </Label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="text-xs leading-5 text-muted-foreground">
            A starting list. Branches ask for more depending on the case and the amount.
          </p>
        </div>
      </div>
    </div>
  );
}
