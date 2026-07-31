import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 23,
  title: "Binary Tree Inorder Traversal",
  difficulty: "Easy",
  tags: ["Tree", "DFS"],
  input: "root = [1,null,2,3]",
  output: "[1,3,2]",
  code: `function inorderTraversal(root) {
  const result = [];
  function traverse(node) {
    if (!node) return;
    traverse(node.left);
    result.push(node.val);
    traverse(node.right);
  }
  traverse(root);
  return result;
}`,
  pseudoCode: [
    "Initialize result array",
    "Define traverse(node):",
    "  If node is null, return",
    "  traverse(node.left)",
    "  push node value to result",
    "  traverse(node.right)",
    "Call traverse(root), return result"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Start with empty result array.",
      variables: { result: "[]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "1" },
        boxes: [{ label: "Result", value: "[]" }]
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "At node 1. Traverse left (which is null).",
      variables: { node: "1", result: "[]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "1" },
        highlights: ["1"],
        boxes: [{ label: "Result", value: "[]" }]
      }
    },
    {
      line: 6, pseudoLine: 5, explanation: "Left is done. Push 1 to result.",
      variables: { node: "1", result: "[1]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "1" },
        highlights: ["1"],
        boxes: [{ label: "Result", value: "[1]" }]
      }
    },
    {
      line: 7, pseudoLine: 6, explanation: "Traverse right to node 2.",
      variables: { node: "2", result: "[1]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "2" },
        boxes: [{ label: "Result", value: "[1]" }]
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "At node 2. Traverse left to node 3.",
      variables: { node: "3", result: "[1]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "3" },
        boxes: [{ label: "Result", value: "[1]" }]
      }
    },
    {
      line: 6, pseudoLine: 5, explanation: "Node 3 left is null. Push 3 to result.",
      variables: { node: "3", result: "[1, 3]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "3" },
        highlights: ["1", "3"],
        boxes: [{ label: "Result", value: "[1, 3]" }]
      }
    },
    {
      line: 6, pseudoLine: 5, explanation: "Back to node 2. Left is done, push 2 to result.",
      variables: { node: "2", result: "[1, 3, 2]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "2" },
        highlights: ["1", "3", "2"],
        boxes: [{ label: "Result", value: "[1, 3, 2]" }]
      }
    },
    {
      line: 10, pseudoLine: 7, explanation: "Traversal complete. Final result is [1, 3, 2].",
      variables: { result: "[1, 3, 2]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", right: "2" },
          { id: "2", value: "2", left: "3" },
          { id: "3", value: "3" }
        ],
        highlights: ["1", "3", "2"],
        boxes: [{ label: "Result", value: "[1, 3, 2]" }]
      }
    }
  ]
};

const Problem23DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem23DryRun;
