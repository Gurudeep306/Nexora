/*
  Pratibimb on a phone (docs/pratibimb/SPEC.md, stage C1): opened from the QR code on the Studio page.
  Not signed in: the link's token adds photos and videos to that one model for two hours, nothing else.
  The same live coach as the computer; the photos appear on the computer as they are taken.
*/
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { deviceModel, deviceUpload, type DeviceModel } from './api'
import { CaptureStep } from './capture/CaptureStep'
import './pratibimb.css'

export default function DeviceCapturePage() {
  const { token = '' } = useParams()
  const [model, setModel] = useState<DeviceModel | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try {
      setModel(await deviceModel(token))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This link has expired. Make a new one on the computer.')
    }
  }, [token])
  useEffect(() => {
    deviceModel(token)
      .then(setModel)
      .catch((e) => setError(e instanceof Error ? e.message : 'This link has expired. Make a new one on the computer.'))
  }, [token])

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6">
      <header className="flex items-center gap-3">
        <LogoMark className="size-8" />
        <div>
          <h1 className="m-0 text-xl font-semibold text-text-primary">Pratibimb photos</h1>
          <p className="m-0 text-sm text-text-secondary">Each photo is checked as you take it. They go straight to your computer.</p>
        </div>
      </header>
      {error && (
        <p className="pbs-error" role="alert">
          {error}
        </p>
      )}
      {!error && !model && <p className="text-sm text-text-muted">Opening…</p>}
      {model && (
        <CaptureStep
          shots={model.shots}
          videos={model.videos}
          upload={(kind, blob, shot) => deviceUpload(token, kind, blob, shot)}
          refresh={refresh}
          onPhone
        />
      )}
    </main>
  )
}
