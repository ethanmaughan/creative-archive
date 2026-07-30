/**
 * A tiny force-directed layout step — pure and dependency-free. All-pairs repulsion (fine at
 * personal-archive scale) + spring attraction along edges + a gentle pull to center. Nodes flagged
 * `fixed` (e.g. being dragged) exert force but don't move.
 */
export interface SimNode {
  x: number
  y: number
  vx: number
  vy: number
  fixed?: boolean
}

export interface SimEdge {
  a: number
  b: number
}

export interface ForceParams {
  repulsion: number
  spring: number
  springLen: number
  damping: number
  center: number
  cx: number
  cy: number
}

export const DEFAULT_FORCES: ForceParams = {
  repulsion: 7000,
  spring: 0.03,
  springLen: 90,
  damping: 0.86,
  center: 0.004,
  cx: 0,
  cy: 0,
}

/** Advance the simulation by one step, mutating node positions in place. */
export function simulateStep(nodes: SimNode[], edges: SimEdge[], params: ForceParams): void {
  const n = nodes.length
  const fx = new Float64Array(n)
  const fy = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    const a = nodes[i]!
    for (let j = i + 1; j < n; j++) {
      const b = nodes[j]!
      let dx = a.x - b.x
      let dy = a.y - b.y
      let d2 = dx * dx + dy * dy
      if (d2 < 0.01) {
        dx = (i - j) * 0.1 + 0.01
        dy = 0.05
        d2 = dx * dx + dy * dy
      }
      const inv = 1 / Math.sqrt(d2)
      const f = params.repulsion / d2
      fx[i]! += f * dx * inv
      fy[i]! += f * dy * inv
      fx[j]! -= f * dx * inv
      fy[j]! -= f * dy * inv
    }
    fx[i]! += (params.cx - a.x) * params.center
    fy[i]! += (params.cy - a.y) * params.center
  }

  for (const edge of edges) {
    const a = nodes[edge.a]!
    const b = nodes[edge.b]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01
    const f = params.spring * (d - params.springLen)
    const ux = (dx / d) * f
    const uy = (dy / d) * f
    fx[edge.a]! += ux
    fy[edge.a]! += uy
    fx[edge.b]! -= ux
    fy[edge.b]! -= uy
  }

  for (let i = 0; i < n; i++) {
    const node = nodes[i]!
    if (node.fixed) {
      node.vx = 0
      node.vy = 0
      continue
    }
    node.vx = (node.vx + fx[i]!) * params.damping
    node.vy = (node.vy + fy[i]!) * params.damping
    node.x += node.vx
    node.y += node.vy
  }
}
