import type { Algorithm } from './types'

/**
 * Every animation a lesson can embed, by id. The original Arrays and
 * Complexity animations register at start-up (see ../algorithms); every other
 * topic ships its animations inside its own lazily loaded chunk and registers
 * them when the topic loads (see ui/useTopic.ts).
 */
const REGISTRY = new Map<string, Algorithm>()

export function registerAlgorithms(list: Algorithm[] | undefined) {
  for (const a of list ?? []) REGISTRY.set(a.id, a)
}

export function getAlgorithm(id: string) {
  return REGISTRY.get(id)
}

export function allAlgorithms() {
  return [...REGISTRY.values()]
}
