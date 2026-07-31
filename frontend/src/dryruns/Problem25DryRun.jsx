import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 25,
  title: "Breadth First Search Path",
  difficulty: "Easy",
  tags: ["Graph", "BFS"],
  input: "V=5, E=[[0,1],[0,2],[1,3],[1,4]]",
  output: "[0,1,2,3,4]",
  code: `function bfs(graph, start) {
  let visited = new Set([start]);
  let queue = [start];
  let path = [];
  while (queue.length > 0) {
    let node = queue.shift();
    path.push(node);
    for (let neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return path;
}`,
  pseudoCode: [
    "Initialize visited set and queue with start node",
    "While queue is not empty:",
    "  Dequeue node and add to path",
    "  For each neighbor of node:",
    "    If neighbor not visited, mark visited and enqueue",
    "Return path"
  ],
  steps: [
    {
      line: 3, pseudoLine: 1, explanation: "Start BFS at node 0. Queue is [0].",
      variables: { queue: "[0]", path: "[]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0],
        centerFound: null
      }
    },
    {
      line: 7, pseudoLine: 3, explanation: "Dequeue 0, add to path. Queue is [].",
      variables: { node: 0, queue: "[]", path: "[0]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0],
        centerFound: 0
      }
    },
    {
      line: 11, pseudoLine: 5, explanation: "Neighbors of 0 are 1 and 2. Enqueue them.",
      variables: { queue: "[1, 2]", path: "[0]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0, 1, 2],
        centerFound: 0
      }
    },
    {
      line: 7, pseudoLine: 3, explanation: "Dequeue 1, add to path. Neighbors are 3, 4.",
      variables: { node: 1, queue: "[2, 3, 4]", path: "[0, 1]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0, 1, 2, 3, 4],
        centerFound: 1
      }
    },
    {
      line: 7, pseudoLine: 3, explanation: "Dequeue 2, add it to the BFS path. Node 2 has no new neighbors.",
      variables: { node: 2, queue: "[3, 4]", path: "[0, 1, 2]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0, 1, 2],
        centerFound: 2
      }
    },
    {
      line: 7, pseudoLine: 3, explanation: "Dequeue 3, add it to the path.",
      variables: { node: 3, queue: "[4]", path: "[0, 1, 2, 3]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0, 1, 2, 3],
        centerFound: 3
      }
    },
    {
      line: 15, pseudoLine: 6, explanation: "Dequeue 4. Queue becomes empty, so BFS returns the full path.",
      variables: { node: 4, queue: "[]", path: "[0, 1, 2, 3, 4]" },
      visual: {
        type: "graph",
        nodes: [
          { id: 0, x: 250, y: 50, value: 0 },
          { id: 1, x: 150, y: 150, value: 1 },
          { id: 2, x: 350, y: 150, value: 2 },
          { id: 3, x: 100, y: 250, value: 3 },
          { id: 4, x: 200, y: 250, value: 4 }
        ],
        edges: [
          { from: 0, to: 1 }, { from: 0, to: 2 },
          { from: 1, to: 3 }, { from: 1, to: 4 }
        ],
        highlightNodes: [0, 1, 2, 3, 4],
        centerFound: 4
      }
    }
  ]
};

const Problem25DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem25DryRun;
