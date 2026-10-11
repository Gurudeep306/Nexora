import { Icon } from '@/components/icon/Icon'
import { nodeIcon } from './icons'

/* Renders the semantic icon mapped from a skill node's legacy icon string. */
export function NodeIcon({ icon, className }: { icon: string | undefined; className?: string }) {
  return <Icon name={nodeIcon(icon)} className={className} />
}
