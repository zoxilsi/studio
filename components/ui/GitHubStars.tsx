"use client";

import { useEffect, useState } from "react";
import { GithubIcon, StarIcon } from "@/components/ui/icons";

export function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/zoxilsi/studio")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href="https://github.com/zoxilsi/studio"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub Repository"
      title="View GitHub repository"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-glass-border bg-glass-soft px-0 text-muted transition-colors duration-150 hover:bg-hover hover:text-ink md:w-auto md:px-3"
    >
      <GithubIcon className="h-4 w-4 shrink-0" />
      <StarIcon className="hidden h-3.5 w-3.5 shrink-0 md:block" />
      {stars !== null && (
        <span className="hidden tabular-nums font-mono text-[11px] font-semibold md:inline">{stars}</span>
      )}
    </a>
  );
}
