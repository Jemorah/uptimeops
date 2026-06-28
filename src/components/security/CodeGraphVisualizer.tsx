// UptimeOps v2.1 — CodeGraph Visualizer
// Simplified interactive graph using SVG. Dark theme.

import { useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move, Download } from 'lucide-react';
import type { CodeGraphData } from '@/hooks/useCodeGraph';

interface Props {
  graph: CodeGraphData | null;
  height?: number;
  highlightVuln?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  entry: '#a3e635', function: '#22d3ee', class: '#3b82f6',
  vulnerability: '#e879f9', db_query: '#f59e0b', auth_flow: '#22c55e',
};

export function CodeGraphVisualizer({ graph, height = 300 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (!graph || !graph.nodes.length) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-white/30">No CodeGraph data available</p>
      </div>
    );
  }

  // Layout nodes in a simple force-directed approximation
  const nodes = graph.nodes.map((n, i) => ({
    ...n,
    x: n.x ?? (150 + (i % 5) * 120 + Math.random() * 40),
    y: n.y ?? (50 + Math.floor(i / 5) * 80 + Math.random() * 30),
  }));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0); const a = document.createElement('a'); a.download = 'codegraph.png'; a.href = canvas.toDataURL(); a.click(); };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/5">
        <button onClick={() => setZoom(z => z * 1.2)} className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
        <button onClick={() => setZoom(z => z / 1.2)} className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
        <span className="text-[10px] text-white/30">{Math.round(zoom * 100)}%</span>
        <div className="flex items-center gap-1 ml-2 text-[10px] text-white/30"><Move className="w-3 h-3" /> Drag to pan</div>
        <button onClick={exportPng} className="ml-auto p-1 rounded hover:bg-white/5 text-white/40 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
      </div>

      {/* Graph */}
      <div style={{ height }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setDragging(false)} className="cursor-move overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%" viewBox={`${-pan.x} ${-pan.y} ${800 / zoom} ${height / zoom}`}>
          {/* Edges */}
          {graph.edges.map((e, i) => {
            const src = nodes.find(n => n.id === e.source);
            const tgt = nodes.find(n => n.id === e.target);
            if (!src || !tgt) return null;
            return <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
          })}
          {/* Nodes */}
          {nodes.map(n => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)} className="cursor-pointer">
              <circle r={selectedNode === n.id ? 10 : 7} fill={NODE_COLORS[n.type] || '#666'} opacity={0.9} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
              <text y={18} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={8} fontFamily="monospace">{n.label.slice(0, 15)}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-2 border-t border-white/5">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-white/40 capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
