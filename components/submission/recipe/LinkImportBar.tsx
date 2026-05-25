"use client";

import { useState } from "react";
import type { ScrapedRecipe } from "@/lib/enrichment/recipe-scraper";
import { cn } from "@/lib/utils/cn";

interface Props {
  onRecipeScraped: (recipe: ScrapedRecipe) => void;
}

type Status = "idle" | "loading" | "success" | "error";

/**
 * Collapsible link-paste bar at the top of the RecipeWizard. By
 * default renders as a single text link ("Έχω link από συνταγή ›");
 * tapping expands a paste input + Φόρτωση button. On success the
 * wizard fields are pre-filled (parent owns merging — see
 * onRecipeScraped) and the bar collapses back, showing a small
 * "✓ Εισαγωγή από <host>" pill the user can dismiss.
 *
 * Failure path stays explicit — the bar shows "Δεν βρήκα συνταγή στη
 * σελίδα" + a "Συμπλήρωσε χειροκίνητα" hint so the user understands
 * the form isn't lying to them.
 */
export function LinkImportBar({ onRecipeScraped }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scrapedHost, setScrapedHost] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus("error");
        setError(
          body?.code === "no_recipe"
            ? "Δεν βρήκα συνταγή σε αυτή τη σελίδα."
            : body?.code === "no_url"
              ? "Δεν είναι έγκυρο URL."
              : "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
        );
        return;
      }
      const body = (await res.json()) as { recipe: ScrapedRecipe };
      onRecipeScraped(body.recipe);
      // Show a brief success pill, then collapse.
      try {
        setScrapedHost(new URL(body.recipe.source_url).host.replace(/^www\./, ""));
      } catch {
        setScrapedHost(null);
      }
      setStatus("success");
      setUrl("");
      setExpanded(false);
    } catch {
      setStatus("error");
      setError("Δεν μπόρεσα να φορτώσω τη σελίδα.");
    }
  };

  // Collapsed states
  if (!expanded && status !== "loading") {
    if (status === "success" && scrapedHost) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>✓</span>
            <span>Εισαγωγή από {scrapedHost}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setScrapedHost(null);
            }}
            className="text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm font-medium text-coral-600 active:text-coral-700"
      >
        Έχω link από συνταγή ›
      </button>
    );
  }

  // Expanded paste-bar
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        Επικόλλησε link συνταγής
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="https://..."
          className="flex-1 h-10 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          autoFocus
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === "loading" || !url.trim()}
          className={cn(
            "h-10 px-4 rounded-lg text-sm font-semibold transition-colors",
            status === "loading" || !url.trim()
              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
              : "bg-coral-600 text-white active:bg-coral-700",
          )}
        >
          {status === "loading" ? "Φόρτωση…" : "Εισαγωγή"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setUrl("");
            setStatus("idle");
            setError(null);
          }}
          className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
          aria-label="Άκυρο"
        >
          ×
        </button>
      </div>
      {error && (
        <p className="text-xs text-zinc-500">
          {error}{" "}
          <span className="text-zinc-400">— συμπλήρωσε χειροκίνητα παρακάτω.</span>
        </p>
      )}
    </div>
  );
}
