import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "center-star-graph",
  title: "Find Center of Star Graph",
  difficulty: "Easy",
  tags: ["Graph"],
  input: "edges = [[1,2], [2,3], [4,2]]",
  output: "2",
  pseudoCode: [
    "function findCenter(edges):",
    "  edge1 = edges[0]  // e.g. [1, 2]",
    "  edge2 = edges[1]  // e.g. [2, 3]",
    "  if edge1[0] == edge2[0] or edge1[0] == edge2[1]:",
    "    return edge1[0]",
    "  return edge1[1]"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Look at the first edge: [1, 2]. One of these is the center.", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [1, 2] } },
    { pseudoLine: 3, explanation: "Look at the second edge: [2, 3]. One of these is the center.", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [2, 3] } },
    { pseudoLine: 4, explanation: "The center must be the node that appears in BOTH edges. Node 2 is in both!", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [2], centerFound: 2 } },
    { pseudoLine: 6, explanation: "Return Node 2. ✅", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [], centerFound: 2 } }
  ]
};

const Problem13DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem13DryRun;
