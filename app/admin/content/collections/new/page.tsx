import { CollectionEditor } from "@/components/admin/CollectionEditor";

/** Accept Explorer deeplink query params and pre-populate the form.
 *  See `buildCollectionDeeplink` in CombinatorialExplorer.tsx for the
 *  exact contract — and §48 in CLAUDE.md for the rationale on what
 *  carries vs what gets skipped. */
interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function readJsonArray<T>(v: string | string[] | undefined, predicate: (x: any) => x is T): T[] {
  if (typeof v !== "string" || v === "") return [];
  try {
    const parsed = JSON.parse(v);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(predicate);
  } catch {
    return [];
  }
}

export default async function NewCollectionPage(props: Props) {
  const sp = await props.searchParams;

  const source_category = readString(sp.source_category);
  const title_specific  = readString(sp.title_specific);
  const tags            = readJsonArray<string>(sp.tags, (x): x is string => typeof x === "string");
  const filters         = readJsonArray<{ field: string; value: string }>(
    sp.filters,
    (x): x is { field: string; value: string } =>
      !!x && typeof x.field === "string" && typeof x.value === "string",
  );

  const fromExplorerRaw = readString(sp.from_explorer);
  const fromExplorerMatchCount =
    fromExplorerRaw && !Number.isNaN(Number(fromExplorerRaw))
      ? Number(fromExplorerRaw)
      : undefined;

  const initial: Parameters<typeof CollectionEditor>[0]["initial"] = {};
  if (source_category) initial.source_category = source_category;
  if (title_specific)  initial.title_specific = title_specific;
  if (tags.length > 0) initial.tags = tags;
  if (filters.length > 0) initial.filters = filters;

  return (
    <CollectionEditor
      initial={Object.keys(initial).length > 0 ? initial : undefined}
      origin={fromExplorerMatchCount !== undefined ? { source: "explorer", matchCount: fromExplorerMatchCount } : undefined}
    />
  );
}
