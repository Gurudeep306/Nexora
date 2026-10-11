/**
 * Compatibility shim: the player now lives in `@/components/ai/CyberMatrixPlayer`.
 * Kept only so the assistant thread's existing import keeps resolving; delete
 * once nothing imports this path.
 */
export * from '@/components/ai/CyberMatrixPlayer'
