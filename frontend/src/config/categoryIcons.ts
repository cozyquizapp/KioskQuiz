// Liefert den Root-Pfad zu den bestehenden Kategorie-Badges im public/categories Ordner.
export function getCategoryBadgeSrc(categoryKey: string): string {
  return `/categories/${categoryKey}.png`;
}
