import { Link } from 'react-router-dom'
import { IconBadge } from '@/components/icon/Icon'
import { FEATURE_LABELS, type FeatureFlag } from '@/lib/site'

/** Rendered in place of a page whose section an admin switched off. */
export function SectionOff({ flag }: { flag: FeatureFlag }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <IconBadge name="lock" tone="neutral" box="lg" />
      <h1 className="mt-5 font-display text-xl font-semibold text-text-primary">{FEATURE_LABELS[flag]} is switched off</h1>
      <p className="mt-2 text-sm text-text-secondary">This section is temporarily unavailable. Please check back later.</p>
      <Link to="/hub" className="mt-6 text-sm font-medium text-accent-brand hover:underline">
        Back to home
      </Link>
    </div>
  )
}
