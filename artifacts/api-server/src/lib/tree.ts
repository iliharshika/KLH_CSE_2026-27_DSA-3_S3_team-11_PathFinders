export type NodeLabel = number | string;
export type TreeEdge = { source: NodeLabel; target: NodeLabel };

export type Tree = {
  nodeCount: number;
  nodes: NodeLabel[];
  edges: TreeEdge[];
};

export type DiameterAnalysis = {
  diameterLength: number;
  startNode: NodeLabel;
  endNode: NodeLabel;
  diameterPath: NodeLabel[];
  nodeCount: number;
  nodes: NodeLabel[];
  edges: TreeEdge[];
};

export function generateRandomTree(nodeCount: number): Tree {
  const nodes = Array.from({ length: nodeCount }, (_, index) => index + 1);
  const edges: TreeEdge[] = [];

  for (let node = 2; node <= nodeCount; node += 1) {
    const parent = Math.floor(Math.random() * (node - 1)) + 1;
    edges.push({ source: parent, target: node });
  }

  for (let index = edges.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [edges[index], edges[swapIndex]] = [edges[swapIndex], edges[index]];
  }

  return { nodeCount, nodes, edges };
}

function labelKey(label: NodeLabel): string {
  return BigInt(label).toString();
}

function isValidLabel(label: NodeLabel): boolean {
  return typeof label === "number"
    ? Number.isSafeInteger(label)
    : typeof label === "string" && /^-?(0|[1-9][0-9]*)$/.test(label);
}

function buildAdjacency(tree: Tree): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  tree.nodes.forEach((node) => adjacency.set(labelKey(node), []));

  tree.edges.forEach(({ source, target }) => {
    const sourceKey = labelKey(source);
    const targetKey = labelKey(target);
    adjacency.get(sourceKey)?.push(targetKey);
    adjacency.get(targetKey)?.push(sourceKey);
  });

  return adjacency;
}

export function isValidTree(tree: Tree): boolean {
  if (!Number.isInteger(tree.nodeCount) || tree.nodeCount < 2 || tree.nodeCount > 1000) return false;
  if (tree.nodes.length !== tree.nodeCount || tree.edges.length !== tree.nodeCount - 1) return false;

  const nodeSet = new Set<string>();
  for (const node of tree.nodes) {
    if (!isValidLabel(node)) return false;
    const key = labelKey(node);
    if (nodeSet.has(key)) return false;
    nodeSet.add(key);
  }

  const edgeKeys = new Set<string>();
  for (const { source, target } of tree.edges) {
    if (!isValidLabel(source) || !isValidLabel(target)) {
      return false;
    }
    const sourceKey = labelKey(source);
    const targetKey = labelKey(target);
    if (
      sourceKey === targetKey ||
      !nodeSet.has(sourceKey) ||
      !nodeSet.has(targetKey)
    ) {
      return false;
    }
    const key =
      sourceKey < targetKey
        ? `${sourceKey}:${targetKey}`
        : `${targetKey}:${sourceKey}`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
  }

  const adjacency = buildAdjacency(tree);
  const visited = new Set<string>();
  const root = tree.nodes[0];
  if (root === undefined) return false;
  const rootKey = labelKey(root);
  const stack: Array<{ node: string; parent: string | null }> = [
    { node: rootKey, parent: null },
  ];
  while (stack.length) {
    const { node: current, parent } = stack.pop()!;
    if (visited.has(current)) return false;
    visited.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === parent) continue;
      if (visited.has(neighbor)) return false;
      stack.push({ node: neighbor, parent: current });
    }
  }

  return visited.size === tree.nodeCount;
}

export function calculateDiameter(tree: Tree): DiameterAnalysis {
  const adjacency = buildAdjacency(tree);
  const rootLabel = tree.nodes[0];
  if (rootLabel === undefined) throw new Error("Tree has no nodes");
  const root = labelKey(rootLabel);
  const originalLabels = new Map(
    tree.nodes.map((label) => [labelKey(label), label] as const),
  );

  const parent = new Map<string, string | null>([[root, null]]);
  const order: string[] = [root];
  for (let index = 0; index < order.length; index += 1) {
    const current = order[index];
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === parent.get(current)) continue;
      if (parent.has(neighbor)) throw new Error("Tree contains a cycle");
      parent.set(neighbor, current);
      order.push(neighbor);
    }
  }

  if (order.length !== tree.nodeCount) throw new Error("Tree is disconnected");

  const downwardLength = new Map<string, number>();
  const downwardEndpoint = new Map<string, string>();
  let bestLength = -1;
  let bestStart = root;
  let bestEnd = root;
  let bestLca = root;

  for (let index = order.length - 1; index >= 0; index -= 1) {
    const node = order[index];
    let longest = { length: 0, endpoint: node };
    let secondLongest = { length: 0, endpoint: node };

    for (const child of adjacency.get(node) ?? []) {
      if (parent.get(child) !== node) continue;
      const branch = {
        length: (downwardLength.get(child) ?? 0) + 1,
        endpoint: downwardEndpoint.get(child) ?? child,
      };
      if (branch.length > longest.length) {
        secondLongest = longest;
        longest = branch;
      } else if (branch.length > secondLongest.length) {
        secondLongest = branch;
      }
    }

    downwardLength.set(node, longest.length);
    downwardEndpoint.set(node, longest.endpoint);

    const throughNode = longest.length + secondLongest.length;
    if (throughNode > bestLength) {
      bestLength = throughNode;
      bestStart = longest.endpoint;
      bestEnd = secondLongest.endpoint;
      bestLca = node;
    }
  }

  const firstHalf: string[] = [];
  let cursor = bestStart;
  while (cursor !== bestLca) {
    firstHalf.push(cursor);
    const next = parent.get(cursor);
    if (next === undefined || next === null) throw new Error("Unable to reconstruct tree diameter path");
    cursor = next;
  }
  firstHalf.push(bestLca);

  const secondHalf: string[] = [];
  cursor = bestEnd;
  while (cursor !== bestLca) {
    secondHalf.push(cursor);
    const next = parent.get(cursor);
    if (next === undefined || next === null) throw new Error("Unable to reconstruct tree diameter path");
    cursor = next;
  }
  let diameterPathKeys = firstHalf.concat(secondHalf.reverse());
  if (diameterPathKeys[diameterPathKeys.length - 1] === root) {
    diameterPathKeys = diameterPathKeys.reverse();
  }
  const diameterPath = diameterPathKeys.map((key) => {
    const label = originalLabels.get(key);
    if (label === undefined) throw new Error("Unable to find original tree label");
    return label;
  });
  const startNode = diameterPath[0];
  const endNode = diameterPath[diameterPath.length - 1];
  if (startNode === undefined || endNode === undefined) {
    throw new Error("Unable to reconstruct tree diameter endpoints");
  }

  return {
    diameterLength: bestLength,
    startNode,
    endNode,
    diameterPath,
    nodeCount: tree.nodeCount,
    nodes: tree.nodes,
    edges: tree.edges,
  };
}