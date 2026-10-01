import { useMemo, useRef, useState } from 'react';
import type { DiameterAnalysis, Tree } from '@workspace/api-client-react';
import { LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import { normalizeNodeLabel, type NodeLabel } from '@/lib/manual-tree';

type Props = {
  tree: Tree;
  result?: DiameterAnalysis | null;
  showAllLabels?: boolean;
};
type Point = { x: number; y: number };
type Pan = { x: number; y: number };

function edgeKey(source: NodeLabel, target: NodeLabel): string {
  const sourceKey = normalizeNodeLabel(source);
  const targetKey = normalizeNodeLabel(target);
  return sourceKey < targetKey
    ? `${sourceKey}:${targetKey}`
    : `${targetKey}:${sourceKey}`;
}

function buildLayout(tree: Tree) {
  const nodeKeys = tree.nodes.map(normalizeNodeLabel);
  const adjacency = new Map<string, string[]>();
  nodeKeys.forEach((node) => adjacency.set(node, []));
  tree.edges.forEach(({ source, target }) => {
    const sourceKey = normalizeNodeLabel(source);
    const targetKey = normalizeNodeLabel(target);
    adjacency.get(sourceKey)?.push(targetKey);
    adjacency.get(targetKey)?.push(sourceKey);
  });
  const rootLabel = tree.nodes[0];
  const root = rootLabel === undefined ? '1' : normalizeNodeLabel(rootLabel);
  const parent = new Map<string, string>();
  const depth = new Map<string, number>([[root, 0]]);
  const children = new Map<string, string[]>();
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    const nextChildren = (adjacency.get(current) ?? []).filter((node) => node !== parent.get(current));
    children.set(current, nextChildren);
    nextChildren.forEach((node) => {
      parent.set(node, current);
      depth.set(node, (depth.get(current) ?? 0) + 1);
      queue.push(node);
    });
  }
  const spacing = tree.nodeCount > 600 ? 17 : tree.nodeCount > 220 ? 25 : 42;
  const cursor = { value: 0 };
  const positions = new Map<string, Point>();
  const postorder = [...nodeKeys].sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0));
  postorder.forEach((node) => {
    const nodeChildren = children.get(node) ?? [];
    if (nodeChildren.length === 0) {
      positions.set(node, { x: cursor.value * spacing, y: 0 });
      cursor.value += 1;
    } else {
      const xs = nodeChildren.map((child) => positions.get(child)?.x ?? 0);
      positions.set(node, { x: xs.reduce((sum, value) => sum + value, 0) / xs.length, y: 0 });
    }
  });
  const maxDepth = Math.max(...Array.from(depth.values()), 0);
  const levelGap = tree.nodeCount > 600 ? 48 : tree.nodeCount > 220 ? 60 : 76;
  const margin = tree.nodeCount > 220 ? 46 : 78;
  positions.forEach((point, node) => {
    positions.set(node, { x: point.x + margin, y: margin + (depth.get(node) ?? 0) * levelGap });
  });
  return { positions, width: Math.max(560, cursor.value * spacing + margin * 2), height: Math.max(360, maxDepth * levelGap + margin * 2) };
}

export function TreeCanvas({ tree, result, showAllLabels = false }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const layout = useMemo(() => buildLayout(tree), [tree]);
  const highlighted = useMemo(
    () => new Set((result?.diameterPath ?? []).map(normalizeNodeLabel)),
    [result],
  );
  const pathEdges = useMemo(() => new Set((result?.diameterPath ?? []).slice(1).map((node, index) => {
    const a = result!.diameterPath[index];
    return edgeKey(a, node);
  })), [result]);
  const radius = tree.nodeCount > 600 ? 4 : tree.nodeCount > 220 ? 5 : 8;
  const labels = showAllLabels || tree.nodeCount <= 80;
  const center = { x: layout.width / 2, y: layout.height / 2 };
  const zoomBy = (delta: number) => setZoom((value) => Math.min(4, Math.max(.35, Number((value + delta).toFixed(2)))));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  return (
    <div className="relative h-[min(70vh,680px)] min-h-[390px] overflow-hidden rounded-[1.25rem] border border-border bg-[hsl(var(--card))]" data-testid="tree-visualization">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={(event) => { event.preventDefault(); zoomBy(event.deltaY > 0 ? -.12 : .12); }}
        onPointerDown={(event) => { drag.current = { x: pan.x, y: pan.y, px: event.clientX, py: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (drag.current) setPan({ x: drag.current.x + (event.clientX - drag.current.px) / Math.max(zoom, .35), y: drag.current.y + (event.clientY - drag.current.py) / Math.max(zoom, .35) }); }}
        onPointerUp={() => { drag.current = null; }}
        aria-label="Interactive hierarchical tree visualization"
      >
        <g transform={`translate(${center.x} ${center.y}) translate(${pan.x} ${pan.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`}>
          <g>
            {tree.edges.map((edge, index) => {
              const a = layout.positions.get(normalizeNodeLabel(edge.source));
              const b = layout.positions.get(normalizeNodeLabel(edge.target));
              if (!a || !b) return null;
              const active = pathEdges.has(edgeKey(edge.source, edge.target));
              return <line key={`edge-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? 'hsl(var(--accent))' : result ? 'hsl(var(--muted-foreground) / .22)' : 'hsl(var(--chart-2) / .45)'} strokeWidth={active ? 3.5 : tree.nodeCount > 220 ? 1.1 : 1.8} strokeLinecap="round" />;
            })}
          </g>
          <g>
            {tree.nodes.map((node) => {
              const nodeKey = normalizeNodeLabel(node);
              const point = layout.positions.get(nodeKey);
              if (!point) return null;
              const active = highlighted.has(nodeKey);
              const endpoint = result && (
                nodeKey === normalizeNodeLabel(result.startNode) ||
                nodeKey === normalizeNodeLabel(result.endNode)
              );
              return <g key={`node-${node}`} transform={`translate(${point.x} ${point.y})`}>
                {active && <circle r={radius + (endpoint ? 5 : 3)} fill="hsl(var(--accent) / .14)" />}
                <circle r={active ? radius + (endpoint ? 1.5 : 0) : radius} fill={active ? 'hsl(var(--accent))' : result ? 'hsl(var(--muted-foreground) / .28)' : 'hsl(var(--chart-2))'} stroke={endpoint ? 'hsl(var(--primary))' : 'none'} strokeWidth={endpoint ? 2.5 : 0} />
                <title>Node {node}{endpoint ? (node === result?.startNode ? ' · start' : ' · end') : ''}</title>
                {labels && <text y={-(radius + 7)} textAnchor="middle" fontFamily="var(--app-font-mono)" fontSize="10" fill={active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}>{node}</text>}
              </g>;
            })}
          </g>
        </g>
      </svg>
      <div className="absolute bottom-4 left-4 rounded-lg border border-border/80 bg-[hsl(var(--card)/.92)] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground backdrop-blur-sm">
        Drag to pan · scroll to zoom · {labels ? 'labels on' : 'dense mode'}
      </div>
      <div className="absolute right-4 top-4 flex overflow-hidden rounded-xl border border-border/80 bg-[hsl(var(--card)/.94)] shadow-sm backdrop-blur-sm">
        <button type="button" data-testid="button-zoom-out" aria-label="Zoom out" onClick={() => zoomBy(-.18)} className="p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Minus size={15} /></button>
        <span className="flex min-w-14 items-center justify-center border-x border-border/80 px-2 font-mono text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button type="button" data-testid="button-zoom-in" aria-label="Zoom in" onClick={() => zoomBy(.18)} className="p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Plus size={15} /></button>
        <button type="button" data-testid="button-fit-screen" aria-label="Fit to Screen" title="Fit to Screen" onClick={resetView} className="flex items-center gap-1.5 border-l border-border/80 px-3 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><LocateFixed size={14} /><span className="hidden sm:inline">Fit</span></button>
        <button type="button" data-testid="button-reset-view" aria-label="Reset View" title="Reset View" onClick={resetView} className="flex items-center gap-1.5 border-l border-border/80 px-3 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><RotateCcw size={14} /><span className="hidden sm:inline">Reset</span></button>
      </div>
    </div>
  );
}
