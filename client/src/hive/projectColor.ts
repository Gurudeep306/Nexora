export const PROJECT_COLORS: Record<string, string> = {
  violet: 'oklch(66% 0.16 295)',
  blue: 'oklch(66% 0.15 255)',
  cyan: 'oklch(72% 0.12 210)',
  green: 'oklch(70% 0.14 155)',
  amber: 'oklch(78% 0.14 80)',
  rose: 'oklch(68% 0.17 15)',
  slate: 'oklch(62% 0.03 260)',
}
export const projectColor = (c: string) => PROJECT_COLORS[c] ?? PROJECT_COLORS.violet
