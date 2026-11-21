/**
 * The translation on screen per statement, kept outside the components: a
 * layout change rebuilds the panels, and the reader's translation must stay.
 */
export const shown = new Map<string, { lang: string; html: string; engine: string }>()
export const shownTranslation = (html: string) => shown.get(html) ?? null
