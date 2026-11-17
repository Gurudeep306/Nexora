import { Link } from 'react-router-dom'
import { IconBadge } from '@/components/icon/Icon'
import { FEATURE_LABELS, type BlockedPart, type FeatureFlag } from '@/lib/site'

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

/**
 * Rendered in place of a page from a part of the site this viewer can't use
 * (Admin → Site map). Coming soon says so; staff-only and hidden parts read
 * as not found, so nothing hints at what is there.
 */
export function PartOff({ part }: { part: BlockedPart }) {
  const soon = part.mode === 'soon'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <IconBadge name={soon ? 'clock' : 'compass'} tone="neutral" box="lg" />
      <h1 className="mt-5 font-display text-xl font-semibold text-text-primary">{soon ? `${part.label} is coming soon` : 'Page not found'}</h1>
      <p className="mt-2 text-sm text-text-secondary">{soon ? 'We are still putting it together. Check back soon.' : 'This page does not exist, or it is not open yet.'}</p>
      <Link to="/hub" className="mt-6 text-sm font-medium text-accent-brand hover:underline">
        Back to home
      </Link>
    </div>
  )
}
