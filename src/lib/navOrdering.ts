export function applyNavOrder<T>(
  items: T[],
  getId: (item: T) => string,
  savedOrder: string[] | null | undefined,
): T[] {
  if (!savedOrder || savedOrder.length === 0) return items;

  const byId = new Map(items.map((item) => [getId(item), item] as const));
  const used = new Set<string>();
  const ordered: T[] = [];

  for (const id of savedOrder) {
    const item = byId.get(id);
    if (!item) continue;
    if (used.has(id)) continue;
    used.add(id);
    ordered.push(item);
  }

  for (const item of items) {
    const id = getId(item);
    if (used.has(id)) continue;
    ordered.push(item);
  }

  return ordered;
}

export function moveArrayItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  if (fromIndex < 0 || fromIndex >= arr.length) return arr;
  if (toIndex < 0 || toIndex >= arr.length) return arr;

  const copy = arr.slice();
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}
