/**
 * Imperative canvas renderer for the graph view: builds a simulation from a GraphDTO, runs the
 * force layout on requestAnimationFrame (stopping once it settles, restarting on interaction),
 * fits the whole graph to the canvas each frame, and handles hover / drag / click-to-open.
 */
import type { GraphDTO } from '@/data/worker/types'
import { DEFAULT_FORCES, simulateStep, type SimEdge, type SimNode } from './force'

interface MountedNode extends SimNode {
  id: string
  relPath: string
  label: string
}

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v === '' ? fallback : v
}

export function mountGraph(
  canvas: HTMLCanvasElement,
  wrap: HTMLElement,
  data: GraphDTO,
  onOpen: (relPath: string) => void,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => undefined

  // Seed positions on a circle (deterministic), centered at the origin.
  const n = data.nodes.length
  const nodes: MountedNode[] = data.nodes.map((node, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2
    const radius = 40 + n * 2
    return {
      id: node.id,
      relPath: node.relPath,
      label: node.title ?? node.relPath,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    }
  })
  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const edges: SimEdge[] = []
  for (const edge of data.edges) {
    const a = index.get(edge.source)
    const b = index.get(edge.target)
    if (a !== undefined && b !== undefined) edges.push({ a, b })
  }
  const degree = new Float64Array(n)
  for (const e of edges) {
    degree[e.a]! += 1
    degree[e.b]! += 1
  }

  let width = 0
  let height = 0
  let dpr = 1
  const resize = (): void => {
    dpr = window.devicePixelRatio || 1
    width = wrap.clientWidth
    height = wrap.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  resize()

  // View transform (world → screen), recomputed each frame to fit.
  let scale = 1
  let ox = 0
  let oy = 0
  const PAD = 48
  const fit = (): void => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of nodes) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x)
      maxY = Math.max(maxY, node.y)
    }
    if (!Number.isFinite(minX)) {
      minX = minY = -1
      maxX = maxY = 1
    }
    const bw = Math.max(maxX - minX, 1)
    const bh = Math.max(maxY - minY, 1)
    scale = Math.min((width - 2 * PAD) / bw, (height - 2 * PAD) / bh, 1.6)
    ox = (width - bw * scale) / 2 - minX * scale
    oy = (height - bh * scale) / 2 - minY * scale
  }
  const sx = (x: number): number => x * scale + ox
  const sy = (y: number): number => y * scale + oy

  let hovered = -1
  let dragging = -1
  let dragMoved = false

  const draw = (): void => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const line = cssVar(canvas, '--line', '#d6d4c8')
    const accent = cssVar(canvas, '--accent', '#0e8a5f')
    const counter = cssVar(canvas, '--counter', '#c9552a')
    const ink = cssVar(canvas, '--ink', '#1b1d20')

    ctx.strokeStyle = line
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.7
    for (const edge of edges) {
      const a = nodes[edge.a]!
      const b = nodes[edge.b]!
      ctx.beginPath()
      ctx.moveTo(sx(a.x), sy(a.y))
      ctx.lineTo(sx(b.x), sy(b.y))
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const showAllLabels = n <= 70
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < n; i++) {
      const node = nodes[i]!
      const r = 4 + Math.min(degree[i]!, 6) * 0.7 + (i === hovered ? 2 : 0)
      ctx.beginPath()
      ctx.arc(sx(node.x), sy(node.y), r, 0, Math.PI * 2)
      ctx.fillStyle = i === hovered ? counter : accent
      ctx.fill()
      if (showAllLabels || i === hovered) {
        ctx.fillStyle = ink
        ctx.globalAlpha = i === hovered ? 1 : 0.75
        ctx.fillText(node.label, sx(node.x), sy(node.y) + r + 13)
        ctx.globalAlpha = 1
      }
    }
  }

  let raf = 0
  const frame = (): void => {
    simulateStep(nodes, edges, DEFAULT_FORCES)
    fit()
    draw()
    let energy = 0
    for (const node of nodes) energy += node.vx * node.vx + node.vy * node.vy
    if (dragging !== -1 || energy / Math.max(n, 1) > 0.04) {
      raf = requestAnimationFrame(frame)
    } else {
      raf = 0
    }
  }
  const kick = (): void => {
    if (raf === 0) raf = requestAnimationFrame(frame)
  }

  const hitTest = (px: number, py: number): number => {
    for (let i = n - 1; i >= 0; i--) {
      const dx = px - sx(nodes[i]!.x)
      const dy = py - sy(nodes[i]!.y)
      if (dx * dx + dy * dy < 144) return i
    }
    return -1
  }

  const onDown = (e: PointerEvent): void => {
    const hit = hitTest(e.offsetX, e.offsetY)
    if (hit === -1) return
    dragging = hit
    dragMoved = false
    nodes[hit]!.fixed = true
    canvas.setPointerCapture(e.pointerId)
    kick()
  }
  const onMove = (e: PointerEvent): void => {
    if (dragging !== -1) {
      dragMoved = true
      nodes[dragging]!.x = (e.offsetX - ox) / scale
      nodes[dragging]!.y = (e.offsetY - oy) / scale
      kick()
      return
    }
    const hit = hitTest(e.offsetX, e.offsetY)
    canvas.style.cursor = hit === -1 ? 'default' : 'pointer'
    if (hit !== hovered) {
      hovered = hit
      if (raf === 0) draw()
    }
  }
  const onUp = (e: PointerEvent): void => {
    if (dragging === -1) return
    const node = nodes[dragging]!
    node.fixed = false
    const wasClick = !dragMoved
    const relPath = node.relPath
    dragging = -1
    canvas.releasePointerCapture(e.pointerId)
    if (wasClick) onOpen(relPath)
    else kick()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  const ro = new ResizeObserver(() => {
    resize()
    if (raf === 0) draw()
  })
  ro.observe(wrap)
  kick()

  return () => {
    if (raf !== 0) cancelAnimationFrame(raf)
    ro.disconnect()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
  }
}
