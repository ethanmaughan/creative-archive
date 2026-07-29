import { useEffect, useState, type JSX } from 'react'
import { useParams } from 'react-router-dom'
import { useSource } from '@/data/worker/hooks'
import { getDataClient } from '@/data/worker/data-client'
import { Spinner } from '@/shared/ui/Spinner'

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Loads an image source's bytes into an object URL for preview, cleaning up on unmount. */
function ImagePreview({
  relPath,
  ext,
  alt,
}: {
  relPath: string
  ext: string
  alt: string
}): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    void getDataClient()
      .readSourceBytes(relPath)
      .then((bytes) => {
        if (revoked || !bytes) return
        // Copy into a standalone ArrayBuffer so the Blob part is unambiguously typed.
        const buffer = new ArrayBuffer(bytes.byteLength)
        new Uint8Array(buffer).set(bytes)
        const blob = new Blob([buffer], { type: IMAGE_MIME[ext] ?? 'application/octet-stream' })
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [relPath, ext])

  if (!url) {
    return (
      <div className="row">
        <Spinner /> Loading preview…
      </div>
    )
  }
  return <img className="source-image" src={url} alt={alt} />
}

export function SourceView(): JSX.Element {
  const params = useParams()
  const relPath = params['*'] ?? ''
  const { data: source, isLoading } = useSource(relPath)

  if (isLoading) {
    return (
      <div className="content__inner">
        <div className="row">
          <Spinner /> Opening file…
        </div>
      </div>
    )
  }

  if (!source) {
    return (
      <div className="content__inner">
        <p className="page-sub">File not found, or it isn’t a readable source.</p>
      </div>
    )
  }

  return (
    <div className="content__inner">
      <div className="doc-head">
        <span className="chip">Read-only · {source.ext.toUpperCase() || 'file'}</span>
        <h1 className="page-title">{source.name}</h1>
        <div className="doc-head__path">
          {source.relPath} · {formatSize(source.size)}
        </div>
      </div>

      {source.category === 'image' ? (
        <ImagePreview relPath={source.relPath} ext={source.ext} alt={source.name} />
      ) : source.hasText ? (
        <pre className="source-text">{source.text}</pre>
      ) : (
        <p className="page-sub">
          This file type can’t be previewed here yet. It stays in your folder untouched — open it
          with the app it belongs to.
        </p>
      )}
    </div>
  )
}
