/** Start fetching the AI markdown engine early (e.g. when the assistant opens). */
export function preloadAiMarkdown() {
  void import('./AiMarkdownImpl')
}
