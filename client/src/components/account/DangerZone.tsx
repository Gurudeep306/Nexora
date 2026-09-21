import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, Card, CardContent, ConfirmDialog, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SettingsSection } from './SettingsPrimitives'

type ConfirmAction = 'logout' | 'reset' | null

export function DangerZone({ settings }: { settings: Record<string, string> }) {
  const { logout, refresh, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [confirm, setConfirm] = useState<ConfirmAction>(null)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const doLogout = async () => {
    setBusy(true)
    try {
      await logout()
      toast.info('Signed out', 'See you in the next rift.')
      navigate('/auth')
    } catch (err) {
      toast.error('Logout failed', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const doReset = async () => {
    setBusy(true)
    try {
      const res = await api.post<{ ok: boolean; error?: string }>('/api/reset-progress')
      if (!res?.ok) throw new Error(res?.error ?? 'Reset rejected by server')
      toast.success('Progress wiped', 'A clean slate — the climb starts again.')
      await refresh()
    } catch (err) {
      toast.error('Reset failed', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const doSyncSolved = async () => {
    setSyncing(true)
    try {
      const res = await api.post<{ ok: boolean; synced?: number; total?: number; error?: string }>(
        '/api/sync-solved',
      )
      if (!res?.ok) throw new Error(res?.error ?? 'Sync failed')
      toast.success('Solved list synced', `Imported ${res.synced ?? 0} of ${res.total ?? 0} solves.`)
      await refresh()
    } catch (err) {
      toast.error(
        'Sync failed',
        err instanceof Error ? err.message : 'Set your Codeforces handle first.',
      )
    } finally {
      setSyncing(false)
    }
  }

  const doExport = async () => {
    try {
      const [stats, bookmarks] = await Promise.all([
        api.get<unknown>('/api/stats', { query: { username: user?.username || undefined } }),
        api.get<unknown>('/api/bookmarks', { query: { username: user?.username || undefined } }),
      ])
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), settings, stats, bookmarks }, null, 2)],
        { type: 'application/json' },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nexora-progress.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded', 'nexora-progress.json')
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardContent className="py-5">
            <SettingsSection
              title="Data & sync"
              description="Move your progress in and out of Nexora."
              icon={<Download />}
            >
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" loading={syncing} onClick={() => void doSyncSolved()}>
                  {!syncing && <RefreshCw aria-hidden="true" />} Sync solved from Codeforces
                </Button>
                <Button variant="subtle" size="sm" onClick={() => void doExport()}>
                  <Download aria-hidden="true" /> Export data (JSON)
                </Button>
              </div>
            </SettingsSection>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardContent className="py-5">
            <SettingsSection
              title="Danger zone"
              description="These actions are destructive or end your session."
              icon={<TriangleAlert />}
            >
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" size="sm" onClick={() => setConfirm('logout')}>
                  <LogOut aria-hidden="true" /> Sign out
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirm('reset')}>
                  <TriangleAlert aria-hidden="true" /> Reset all progress
                </Button>
              </div>
            </SettingsSection>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'logout'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => void doLogout()}
        title="Sign out?"
        confirmLabel="Sign out"
        loading={busy}
        message="You will need to log in again to continue your streak."
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => void doReset()}
        title="Reset all progress?"
        confirmLabel="Wipe everything"
        danger
        loading={busy}
        message={
          <>
            This permanently deletes <span className="font-semibold text-foreground">all</span>{' '}
            solve progress, submissions, activity history, replays and achievement unlocks. There is
            no undo — consider exporting your data first.
          </>
        }
      />
    </>
  )
}
