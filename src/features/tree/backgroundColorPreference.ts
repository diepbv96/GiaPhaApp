function treeKey(treeId: string): string {
  return `giapha:bg-color:tree:${treeId}`;
}

const ALL_TREES_KEY = "giapha:bg-color:all-trees";

export function getTreeColor(treeId: string): string | undefined {
  return sessionStorage.getItem(treeKey(treeId)) ?? undefined;
}

export function setTreeColor(treeId: string, colorHex: string): void {
  sessionStorage.setItem(treeKey(treeId), colorHex);
}

export function clearTreeColor(treeId: string): void {
  sessionStorage.removeItem(treeKey(treeId));
}

export function getAllTreesDefaultColor(): string | undefined {
  return sessionStorage.getItem(ALL_TREES_KEY) ?? undefined;
}

export function setAllTreesDefaultColor(colorHex: string): void {
  sessionStorage.setItem(ALL_TREES_KEY, colorHex);
}

export function clearAllTreesDefaultColor(): void {
  sessionStorage.removeItem(ALL_TREES_KEY);
}

/** Tree-specific override wins over the all-trees default; `undefined` means "no
 * override — keep the application's default background" (spec FR-007). */
export function resolveBackgroundColor(treeId: string): string | undefined {
  return getTreeColor(treeId) ?? getAllTreesDefaultColor();
}
