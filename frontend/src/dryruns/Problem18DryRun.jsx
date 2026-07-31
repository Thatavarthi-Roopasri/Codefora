import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "max-depth-binary-tree",
  title: "Maximum Depth of Binary Tree",
  difficulty: "Easy",
  tags: ["Trees", "DFS"],
  input: "root = [3,9,20,null,null,15,7]",
  output: "3",
  pseudoCode: [
    "function maxDepth(root):",
    "  if root is NULL:",
    "    return 0",
    "  leftDepth = maxDepth(root.left)",
    "  rightDepth = maxDepth(root.right)",
    "  return max(leftDepth, rightDepth) + 1"
  ],
  steps: [
    { pseudoLine: 4, explanation: "Start at root (3). Recursively find maxDepth of left child (9).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "Current", value: 3 }], pointers: { curr: "n1", next: "left" }, highlights: ["n1", "n2"] } },
    { pseudoLine: 6, explanation: "Node 9 is a leaf. Its depth is 1. Back to 3, now check right (20).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "LeftDepth", value: 1 }], pointers: { curr: "n1", next: "right" }, highlights: ["n1", "n3"] } },
    { pseudoLine: 4, explanation: "At 20. Check left child (15).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "Current", value: 20 }], pointers: { curr: "n3", next: "left" }, highlights: ["n3", "n4"] } },
    { pseudoLine: 5, explanation: "Node 15 returns 1. Now check right child (7).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "LeftDepth(20)", value: 1 }], pointers: { curr: "n3", next: "right" }, highlights: ["n3", "n5"] } },
    { pseudoLine: 6, explanation: "Node 7 returns 1. Node 20's depth = max(1,1) + 1 = 2.", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5", done: true }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null, done: true }], boxes: [{ label: "Depth(20)", value: 2 }], pointers: { curr: "n3" }, highlights: ["n3"] } },
    { pseudoLine: 6, explanation: "Back to root 3. Depth = max(1, 2) + 1 = 3. Done! ✅", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3", done: true }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5", done: true }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null, done: true }], boxes: [{ label: "Ans", value: 3 }], pointers: { curr: "n1" }, highlights: ["n1"], success: true } }
  ]
};

const Problem18DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem18DryRun;
