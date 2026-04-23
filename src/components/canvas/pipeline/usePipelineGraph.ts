import { useMemo } from 'react'
import { alg, Graph } from '@dagrejs/graphlib'
import type { Connection } from '@/types/canvas'

export interface PipelineGraph {
    graph: Graph
    outgoing: Map<string, Connection[]>  // blockId → outbound dep connections
    incoming: Map<string, Connection[]>  // blockId → inbound dep connections
    cyclicEdgeIds: Set<string>
}

/** Build a directed graph from dependency connections. Returns adjacency + cycle set. */
export function usePipelineGraph(connections: Connection[]): PipelineGraph {
    return useMemo(() => {
        const g = new Graph({ directed: true, multigraph: true })
        const outgoing = new Map<string, Connection[]>()
        const incoming = new Map<string, Connection[]>()
        const cyclic = new Set<string>()

        for (const c of connections) {
            if (c.kind !== 'dependency') continue
            g.setNode(c.fromBlockId)
            g.setNode(c.toBlockId)
            g.setEdge(c.fromBlockId, c.toBlockId, c.id, c.id)
            const out = outgoing.get(c.fromBlockId) ?? []
            out.push(c); outgoing.set(c.fromBlockId, out)
            const inc = incoming.get(c.toBlockId) ?? []
            inc.push(c); incoming.set(c.toBlockId, inc)
        }

        // Mark edges inside any strongly-connected component of size > 1 as cyclic.
        try {
            const sccs = alg.tarjan(g)
            for (const comp of sccs) {
                if (comp.length <= 1) continue
                const set = new Set(comp)
                for (const c of connections) {
                    if (c.kind === 'dependency' && set.has(c.fromBlockId) && set.has(c.toBlockId)) {
                        cyclic.add(c.id)
                    }
                }
            }
        } catch {
            // graphlib throws on self-loops in some versions; ignore.
        }

        return { graph: g, outgoing, incoming, cyclicEdgeIds: cyclic }
    }, [connections])
}
