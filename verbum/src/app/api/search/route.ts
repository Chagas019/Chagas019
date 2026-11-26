import { NextResponse, type NextRequest } from "next/server";
import { searchCatalog, CATEGORY_LABEL, type Category } from "@/lib/search";

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  const cats = (req.nextUrl.searchParams.get("cat") ?? "").split(",").filter((c): c is Category => c in CATEGORY_LABEL);
  const themes = (req.nextUrl.searchParams.get("temas") ?? "").split(",").filter(Boolean);
  if (!q.trim() && !themes.length) return NextResponse.json({ results: [], matchedThemes: [], reference: null });
  return NextResponse.json(searchCatalog(q, { categories: cats, themes, limit: 80 }));
}
