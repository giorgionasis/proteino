import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectRecipeUrl, scrapeRecipe } from "@/lib/enrichment/recipe-scraper";

/**
 * POST /api/recipes/scrape
 *
 * Body: { url: string }  OR  { text: string }
 *   When `text` is provided we extract the first URL via
 *   detectRecipeUrl, so the wizard can hand the textarea content
 *   straight through without parsing on the client.
 *
 * Response: { recipe: ScrapedRecipe }  on success
 *           { error: string, code: ... }  on failure
 *
 * Auth-required — keep the bot footprint per-user and prevent
 * anonymous scraping abuse via this endpoint. Wizard is only
 * accessible to authenticated users anyway.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    text?: string;
  };

  const candidate = body.url?.trim() || (body.text ? detectRecipeUrl(body.text) : null);
  if (!candidate) {
    return NextResponse.json(
      { error: "No URL found", code: "no_url" },
      { status: 400 },
    );
  }

  try {
    const recipe = await scrapeRecipe(candidate);
    if (!recipe) {
      return NextResponse.json(
        {
          error: "Could not extract a recipe from this URL",
          code: "no_recipe",
          url: candidate,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ recipe });
  } catch (err: any) {
    console.error("[recipes/scrape]", err?.message ?? err);
    return NextResponse.json(
      { error: "Scrape failed", code: "scrape_error" },
      { status: 500 },
    );
  }
}
