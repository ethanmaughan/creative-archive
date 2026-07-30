// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { simulateStep, DEFAULT_FORCES, type SimNode } from '@/features/graph/force'

function dist(nodes: SimNode[]): number {
  const dx = nodes[0]!.x - nodes[1]!.x
  const dy = nodes[0]!.y - nodes[1]!.y
  return Math.sqrt(dx * dx + dy * dy)
}

describe('force simulation', () => {
  it('pulls connected nodes toward the spring length, not collapsing them', () => {
    const nodes: SimNode[] = [
      { x: -300, y: 0, vx: 0, vy: 0 },
      { x: 300, y: 0, vx: 0, vy: 0 },
    ]
    for (let i = 0; i < 400; i++) simulateStep(nodes, [{ a: 0, b: 1 }], DEFAULT_FORCES)
    const d = dist(nodes)
    expect(d).toBeLessThan(600) // moved much closer than the 600 start
    expect(d).toBeGreaterThan(20) // repulsion keeps them apart
  })

  it('pushes unconnected nodes apart', () => {
    const nodes: SimNode[] = [
      { x: -3, y: 0, vx: 0, vy: 0 },
      { x: 3, y: 0, vx: 0, vy: 0 },
    ]
    for (let i = 0; i < 200; i++) simulateStep(nodes, [], DEFAULT_FORCES)
    expect(dist(nodes)).toBeGreaterThan(20)
  })

  it('does not move a fixed node', () => {
    const nodes: SimNode[] = [
      { x: 100, y: 100, vx: 0, vy: 0, fixed: true },
      { x: -50, y: 0, vx: 0, vy: 0 },
    ]
    for (let i = 0; i < 50; i++) simulateStep(nodes, [{ a: 0, b: 1 }], DEFAULT_FORCES)
    expect(nodes[0]!.x).toBe(100)
    expect(nodes[0]!.y).toBe(100)
  })
})
