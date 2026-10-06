#!/bin/bash
# Starts the Sahiti dev server (used by launchctl; safe to run manually too)
export PATH="$HOME/.bun/bin:$PATH"
cd "/Users/Jayesh/Downloads/sahiti source" || exit 1
exec bun run dev
