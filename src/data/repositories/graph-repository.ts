/** The knowledge graph: documents as nodes, resolved `[[wikilinks]]` as edges (deduped,
 *  undirected). Feeds the graph view. */
import type { Sqlite } from '../storage/sqlite-index/migrator'

export interface GraphNode {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly kind: string
}

export interface GraphEdge {
  readonly source: string
  readonly target: string
}

export interface Graph {
  readonly nodes: GraphNode[]
  readonly edges: GraphEdge[]
}

export class GraphRepository {
  constructor(private readonly db: Sqlite) {}

  graph(): Graph {
    const nodes = this.db
      .selectRows<{ id: string; rel_path: string; title: string | null; kind: string }>(
        'SELECT id, rel_path, title, kind FROM documents ORDER BY title;',
      )
      .map((r) => ({ id: r.id, relPath: r.rel_path, title: r.title, kind: r.kind }))

    const raw = this.db.selectRows<{ s: string; t: string }>(
      'SELECT DISTINCT source_id AS s, target_id AS t FROM links WHERE target_id IS NOT NULL AND source_id <> target_id;',
    )

    const present = new Set(nodes.map((n) => n.id))
    const seen = new Set<string>()
    const edges: GraphEdge[] = []
    for (const { s, t } of raw) {
      if (!present.has(s) || !present.has(t)) continue // skip edges to unindexed ids
      const key = s < t ? `${s}|${t}` : `${t}|${s}` // dedup undirected
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ source: s, target: t })
    }
    return { nodes, edges }
  }
}
