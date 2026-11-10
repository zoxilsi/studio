"use client";
import { GithubIcon } from "@/components/ui/icons";

/** A repository link needs no background API request or remote counter. */
export function GitHubStars() {
  return <a href="https://github.com/JK-levi/wallpaper-studio" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository" title="View GitHub repository" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-glass-border bg-glass-soft text-muted hover:bg-hover hover:text-ink"><GithubIcon className="h-4 w-4" /></a>;
}
