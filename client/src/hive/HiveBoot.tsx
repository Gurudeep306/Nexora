import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiveLogo } from './HiveLogo'

/**
 * The boot screen: the Hive mark writing itself, the name, and one honest
 * line about what is happening. If opening takes long (the server can be
 * waking up), it says so; it never shows a made-up percentage.
 */
export function BootScreen({ failed }: { failed?: string }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (failed) return
    const t = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(t)
  }, [failed])
  return (
    <div className="hive-root hive-boot" role={failed ? 'alert' : 'status'} aria-live="polite">
      <div className="hive-boot-card">
        <HiveLogo size={72} loop={!failed} />
        <div className="hive-boot-name">
          <small>NexoraGuru</small>
          <span>Hive</span>
        </div>
        {failed ? (
          <>
            <p className="hive-boot-line m-0">{failed}</p>
            <div className="flex items-center gap-5 text-[13px]">
              <button type="button" onClick={() => window.location.reload()} className="hv-link cursor-pointer border-0 bg-transparent p-0">
                Try again
              </button>
              <Link to="/hub" className="hv-link">
                Back to NexoraGuru
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="hive-boot-rule" aria-hidden="true" />
            <p className="hive-boot-line hive-boot-in m-0">{slow ? 'Still opening — the server may be waking up.' : 'Opening your workspace'}</p>
            <span className="sr-only">Loading Hive</span>
          </>
        )}
      </div>
    </div>
  )
}

