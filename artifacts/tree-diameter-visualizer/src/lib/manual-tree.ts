import type { Tree, TreeEdge } from '@workspace/api-client-react';

export type NodeLabel = number | string;

export function normalizeNodeLabel(label: NodeLabel): string {
  return BigInt(label).toString();
}

type ManualTreeBuildResult =
  | { ok: true; tree: Tree }
  | { ok: false; error: string };

export function getManualTreeProgress(edgeText: string) {
  const lines = edgeText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const labels = new Set<string>();

  for (const line of lines) {
    const values = line.trim().split(/\s+/);
    if (values.length !== 2) continue;
    for (const value of values) {
      if (!/^[+-]?\d+$/.test(value)) continue;
      labels.add(normalizeNodeLabel(value));
    }
  }

  return { edgeCount: lines.length, uniqueNodeCount: labels.size };
}

export function buildManualTree(
  rawNodeCount: string,
  edgeText: string,
): ManualTreeBuildResult {
  const normalizedNodeCount = rawNodeCount.trim();
  if (!/^\d+$/.test(normalizedNodeCount)) {
    return { ok: false, error: 'Enter a whole number of nodes from 2 to 1,000.' };
  }

  const nodeCount = Number(normalizedNodeCount);
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 2 || nodeCount > 1000) {
    return { ok: false, error: 'Enter a whole number of nodes from 2 to 1,000.' };
  }

  const lines = edgeText
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text.length > 0);
  const requiredEdges = nodeCount - 1;
  if (lines.length !== requiredEdges) {
    return {
      ok: false,
      error: `Invalid tree: Expected ${requiredEdges} edges, but ${lines.length} were provided.`,
    };
  }

  const edges: TreeEdge[] = [];
  const labels = new Set<string>();
  const edgeKeys = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const line of lines) {
    const values = line.text.split(/\s+/);
    if (
      values.length !== 2 ||
      values.some((value) => !/^[+-]?\d+$/.test(value))
    ) {
      return {
        ok: false,
        error: `Invalid edge on line ${line.lineNumber}: enter exactly two integer labels.`,
      };
    }

    const [source, target] = values.map(normalizeNodeLabel);
    if (source === target) {
      return {
        ok: false,
        error: `Invalid tree: Self-loops are not allowed (line ${line.lineNumber}).`,
      };
    }

    const edgeKey =
      source < target ? `${source}:${target}` : `${target}:${source}`;
    if (edgeKeys.has(edgeKey)) {
      return {
        ok: false,
        error: `Invalid tree: Duplicate edge on line ${line.lineNumber}.`,
      };
    }
    edgeKeys.add(edgeKey);

    labels.add(source);
    labels.add(target);
    edges.push({ source, target });
    const sourceNeighbors = adjacency.get(source) ?? [];
    const targetNeighbors = adjacency.get(target) ?? [];
    sourceNeighbors.push(target);
    targetNeighbors.push(source);
    adjacency.set(source, sourceNeighbors);
    adjacency.set(target, targetNeighbors);
  }

  if (labels.size !== nodeCount) {
    return {
      ok: false,
      error: `Invalid tree: Expected ${nodeCount} unique nodes, but ${labels.size} unique nodes were provided.`,
    };
  }

  const root = labels.values().next().value as string | undefined;
  if (root === undefined) {
    return { ok: false, error: 'Invalid tree: No node labels were provided.' };
  }
  const visited = new Set<string>();
  const stack: Array<{ node: string; parent: string | null }> = [
    { node: root, parent: null },
  ];

  while (stack.length > 0) {
    const { node, parent } = stack.pop()!;
    if (visited.has(node)) {
      return { ok: false, error: 'Invalid tree: The graph contains a cycle.' };
    }
    visited.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (neighbor === parent) continue;
      if (visited.has(neighbor)) {
        return { ok: false, error: 'Invalid tree: The graph contains a cycle.' };
      }
      stack.push({ node: neighbor, parent: node });
    }
  }

  if (visited.size !== nodeCount) {
    return { ok: false, error: 'Invalid tree: The graph is disconnected.' };
  }

  return {
    ok: true,
    tree: { nodeCount, nodes: Array.from(labels), edges },
  };
}