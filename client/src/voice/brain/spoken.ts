/*
  A model's reply made fit to say aloud, like the server's guru.spoken():
  no code blocks, no markdown, short. Dependency-free and type-strippable.
*/
export function spoken(text: string, max = 900): string {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```[\s\S]*?```/g, ' (see the screen) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, max)
}
