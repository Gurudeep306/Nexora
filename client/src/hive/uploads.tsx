import { useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/ui'
import { hiveApi } from './api'
import type { HiveFile } from './types'

/** Uploads for chat messages and session briefs (images, PDFs, code). */
export function useUploads() {
  const toast = useToast()
  const [files, setFiles] = useState<(HiveFile & { uploading?: boolean })[]>([])
  const add = async (list: FileList | File[]) => {
    for (const f of Array.from(list).slice(0, 12)) {
      const temp = { id: `tmp-${f.name}-${Date.now()}`, name: f.name, mime: f.type, size: f.size, uploading: true }
      setFiles((x) => [...x, temp])
      try {
        const r = await hiveApi.upload(f)
        setFiles((x) => x.map((y) => (y.id === temp.id ? r.file : y)))
      } catch (e) {
        setFiles((x) => x.filter((y) => y.id !== temp.id))
        toast.error(e instanceof Error ? e.message : 'Upload failed')
      }
    }
  }
  return { files, setFiles, add, remove: (id: string) => setFiles((x) => x.filter((y) => y.id !== id)), busy: files.some((f) => f.uploading) }
}

export function FileChips({ files, onRemove }: { files: (HiveFile & { uploading?: boolean })[]; onRemove?: (id: string) => void }) {
  if (!files.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f) => (
        <span key={f.id} className="inline-flex max-w-56 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] py-1 pl-2 pr-1 text-[12px] text-text-secondary">
          {f.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5 text-text-muted" />}
          <span className="truncate">{f.name}</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(f.id)} className="grid size-4 place-items-center rounded text-text-muted hover:text-text-primary" aria-label={`Remove ${f.name}`}>
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
