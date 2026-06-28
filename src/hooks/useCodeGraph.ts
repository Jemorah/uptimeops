// UptimeOps v2.1 — CodeGraph Hook
// Fetches codegraph_snapshots and parses graph data

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface CodeGraphNode {
  id: string;
  label: string;
  type: 'entry' | 'function' | 'class' | 'vulnerability' | 'db_query' | 'auth_flow';
  x?: number;
  y?: number;
}

export interface CodeGraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface CodeGraphData {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  entry_points: string[];
  dead_code_paths: string[];
  auth_flow_paths: string[];
  db_query_paths: string[];
}

export function useCodeGraph(incidentId: string | null) {
  const [graph, setGraph] = useState<CodeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!incidentId) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('codegraph_snapshots')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      setError(error.message);
      setGraph(null);
    } else if (data) {
      const graphData = data.graph_data || {};
      const nodes: CodeGraphNode[] = (graphData.nodes || []).map((n: any, i: number) => ({
        id: n.id || `node-${i}`,
        label: n.label || n.name || `Node ${i}`,
        type: n.type || 'function',
        x: n.x,
        y: n.y,
      }));

      // Add vulnerability nodes if findings exist
      const vulnNodes: CodeGraphNode[] = (graphData.vulnerabilities || []).map((v: any, i: number) => ({
        id: `vuln-${i}`,
        label: v.message || `Vuln ${i}`,
        type: 'vulnerability',
      }));

      const edges: CodeGraphEdge[] = (graphData.edges || []).map((e: any) => ({
        source: e.source,
        target: e.target,
        label: e.label,
      }));

      setGraph({
        nodes: [...nodes, ...vulnNodes],
        edges,
        entry_points: data.entry_points || [],
        dead_code_paths: data.dead_code_paths || [],
        auth_flow_paths: data.auth_flow_paths || [],
        db_query_paths: data.db_query_paths || [],
      });
    }

    setLoading(false);
  }, [incidentId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, loading, error, refresh: fetchGraph };
}
