import { useEffect, useRef, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { mountGraph } from './graph-canvas'

export function GraphPage(): JSX.Element {
  const { data, isLoading } = useGraph()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!data || data.nodes.length === 0 || !canvasRef.current || !wrapRef.current) return
    return mountGraph(canvasRef.current, wrapRef.current, data, (relPath) =>
      navigate(`/doc/${relPath}`),
    )
  }, [data, navigate])

  const nodeCount = data?.nodes.length ?? 0
  const edgeCount = data?.edges.length ?? 0

  return (
    <div className="content__inner graph-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Graph</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {nodeCount} {nodeCount === 1 ? 'document' : 'documents'} · {edgeCount}{' '}
            {edgeCount === 1 ? 'link' : 'links'} — drag to arrange, click a node to open it.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="row">
          <Spinner /> Building the graph…
        </div>
      ) : nodeCount === 0 ? (
        <p className="page-sub">
          Nothing to graph yet. Link some notes with <code>[[wikilinks]]</code> and they’ll appear
          here, connected.
        </p>
      ) : (
        <div className="graph-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  )
}
