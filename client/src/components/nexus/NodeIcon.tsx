import { createElement } from 'react'
import { nodeIcon } from './icons'

/* Renders the lucide icon mapped from a skill node's legacy icon string. */
export function NodeIcon({ icon, className }: { icon: string | undefined; className?: string }) {
  return createElement(nodeIcon(icon), { className, 'aria-hidden': true })
}
