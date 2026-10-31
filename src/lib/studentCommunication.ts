export * from "../../supabase/functions/_shared/studentCommunicationContent";
/** Quote PostgREST search values so punctuation cannot introduce another filter. */
export function studentContactSearch(value: string): string {
  const term = value
    .trim()
    .slice(0, 100)
    .replace(/[%_\\]/g, "\\$&");
  const pattern = JSON.stringify(`%${term}%`);
  return ["legal_name", "preferred_name", "contact_email", "reference_code"]
    .map((column) => `${column}.ilike.${pattern}`)
    .join(",");
}
