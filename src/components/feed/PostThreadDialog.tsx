import { Bookmark, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { findSchemeByLabel, formatSchemeAmount } from "@/data/schemes";
import { timeAgo } from "@/lib/format";

export type FeedPost = {
  id: string;
  author_id: string | null;
  author_name: string;
  author_initials: string;
  post_type: string;
  content: string;
  category: string;
  region: string;
  scheme_type: string;
  created_at: string;
};

export type FeedComment = {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function sourceLabel(post: FeedPost) {
  if (post.post_type === "government") return "Scheme desk";
  if (post.post_type === "news") return "Sahiti research";
  if (post.post_type === "finance") return "Industry desk";
  return "Member";
}

export function PostThreadDialog({
  post,
  comments,
  isSaved,
  onClose,
  onToggleSave,
  onAddComment,
  onShare,
}: {
  post: FeedPost | null;
  comments: FeedComment[];
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void> | void;
  onShare: (content: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scheme = post ? findSchemeByLabel(post.scheme_type) : undefined;

  async function submitComment() {
    if (!post) return;
    const content = draft.trim();
    if (!content) return;
    await onAddComment(post.id, content);
    setDraft("");
  }

  return (
    <Dialog open={Boolean(post)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        {post && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-left text-lg">
                {post.author_name}
                <Badge
                  variant={post.post_type === "user" ? "secondary" : "default"}
                  className="font-medium"
                >
                  {sourceLabel(post)}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-left">
                {[post.category, post.scheme_type, post.region, timeAgo(post.created_at)]
                  .filter(Boolean)
                  .join(" · ")}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm leading-7">{post.content}</p>

            {scheme && (
              <section className="rounded-md border bg-secondary p-4">
                <h3 className="text-sm font-semibold">{scheme.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scheme.agency} · {formatSchemeAmount(scheme)}
                </p>
                <p className="mt-3 text-sm leading-6">{scheme.summary}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{scheme.audience}</p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What you get
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {scheme.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2">
                      <span aria-hidden="true" className="text-primary">
                        ·
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Who qualifies
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {scheme.eligibility.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true">·</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Papers usually asked for
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {scheme.documents.map((doc) => (
                    <li key={doc} className="flex gap-2">
                      <span aria-hidden="true">·</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={scheme.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Confirm current terms on Udyamimitra
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </section>
            )}

            {!scheme && post.scheme_type && (
              <p className="rounded-md border bg-secondary p-3 text-xs leading-5 text-muted-foreground">
                This note is tagged {post.scheme_type} and does not map to a single programme. Treat
                it as a local observation rather than a scheme summary.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => onToggleSave(post.id)}>
                <Bookmark className={isSaved ? "size-4 fill-current" : "size-4"} />
                {isSaved ? "Saved" : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onShare(post.content)}>
                <Share2 className="size-4" />
                Share
              </Button>
            </div>

            <section className="border-t pt-4">
              <h3 className="text-sm font-semibold">
                {comments.length} comment{comments.length === 1 ? "" : "s"}
              </h3>
              <ul className="mt-3 space-y-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="text-sm">
                    <span className="font-medium">{comment.author_name}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                    <p className="leading-6">{comment.content}</p>
                  </li>
                ))}
                {comments.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Nobody has replied yet. Ask the first question.
                  </li>
                )}
              </ul>

              <div className="mt-3 flex gap-2">
                <Input
                  className="bg-muted"
                  aria-label="Write a comment"
                  placeholder="Add a reply"
                  value={draft}
                  maxLength={500}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button onClick={() => void submitComment()}>Comment</Button>
              </div>
            </section>

            <p className="text-xs leading-5 text-muted-foreground">
              Scheme details are summaries for orientation. Confirm with the portal or your bank
              before acting.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
