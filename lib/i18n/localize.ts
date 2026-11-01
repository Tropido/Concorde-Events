import type { Language } from "./translations";

// Staff-entered content lives in `<field>_fr`, `_en` and `_ar` columns. French is the source:
// an empty translation shows the French text.

type Row = object;
const read = (row: Row, key: string) => (row as Record<string, unknown>)[key];

export function localized(row: Row, field: string, lang: Language): string | null {
  return ((lang !== "fr" && read(row, `${field}_${lang}`)) || read(row, `${field}_fr`) || null) as string | null;
}

export function localizedList(row: Row, field: string, lang: Language): string[] {
  const list = lang === "fr" ? undefined : (read(row, `${field}_${lang}`) as string[] | undefined);
  return list?.length ? list : ((read(row, `${field}_fr`) as string[] | undefined) ?? []);
}
