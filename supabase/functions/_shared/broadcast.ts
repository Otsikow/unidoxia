export const renderTemplateVariables = (
  input: string,
  vars: Record<string, string | null | undefined>,
) => input.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => vars[key] ?? "");

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);

export const safeHttpsUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};
