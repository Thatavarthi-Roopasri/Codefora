import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 31,
  title: "Binary Tree Level Order Traversal",
  difficulty: "Medium",
  tags: ["Tree", "BFS"],
  input: "root = [3,9,20,null,null,15,7]",
  output: "[[3],[9,20],[15,7]]",
  code: `function levelOrder(root) {
  if (!root) return [];
  let result = [];
  let queue = [root];
  while (queue.length > 0) {
    let levelSize = queue.length;
    let currentLevel = [];
    for (let i = 0; i < levelSize; i++) {
      let node = queue.shift();
      currentLevel.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(currentLevel);
  }
  return result;
}`,
  pseudoCode: [
    "If root is null return empty list",
    "Initialize queue = [root], result = []",
    "While queue is not empty:",
    "  levelSize = queue.length, currentLevel = []",
    "  For i = 0 to levelSize - 1:",
    "    node = dequeue()",
    "    Add node.val to currentLevel",
    "    Enqueue node.left and node.right if they exist",
    "  Add currentLevel to result"
  ],
  steps: [
    {
      line: 3, pseudoLine: 2, explanation: "Initialize queue with root node [3].",
      variables: { queue: "[3]", result: "[]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "3", value: "3", left: "9", right: "20" },
          { id: "9", value: "9" },
          { id: "20", value: "20", left: "15", right: "7" },
          { id: "15", value: "15" },
          { id: "7", value: "7" }
        ],
        pointers: { curr: "3" },
        boxes: [{ label: "Queue", value: "[3]" }, { label: "Result", value: "[]" }]
      }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Processing Level 0. Dequeue 3. Queue becomes [].",
      variables: { levelSize: 1, currentLevel: "[3]", queue: "[]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "3", value: "3", left: "9", right: "20" },
          { id: "9", value: "9" },
          { id: "20", value: "20", left: "15", right: "7" },
          { id: "15", value: "15" },
          { id: "7", value: "7" }
        ],
        highlights: ["3"],
        boxes: [{ label: "Queue", value: "[]" }, { label: "Level", value: "[3]" }]
      }
    },
    {
      line: 9, pseudoLine: 8, explanation: "Enqueue left (9) and right (20) children. Queue is [9, 20].",
      variables: { queue: "[9, 20]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "3", value: "3", left: "9", right: "20" },
          { id: "9", value: "9" },
          { id: "20", value: "20", left: "15", right: "7" },
          { id: "15", value: "15" },
          { id: "7", value: "7" }
        ],
        highlights: ["3"],
        boxes: [{ label: "Queue", value: "[9, 20]" }, { label: "Level", value: "[3]" }]
      }
    },
    {
      line: 12, pseudoLine: 9, explanation: "Finish level. Add [3] to result.",
      variables: { result: "[[3]]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "3", value: "3", left: "9", right: "20" },
          { id: "9", value: "9" },
          { id: "20", value: "20", left: "15", right: "7" },
          { id: "15", value: "15" },
          { id: "7", value: "7" }
        ],
        highlights: ["3"],
        boxes: [{ label: "Queue", value: "[9, 20]" }, { label: "Result", value: "[[3]]" }]
      }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Processing Level 1. Dequeue 9, then 20. Enqueue children (15, 7).",
      variables: { levelSize: 2, currentLevel: "[9, 20]", queue: "[15, 7]" },
      visual: {
        type: "tree",
        nodes: [
          { id: "3", value: "3", left: "9", right: "20" },
          { id: "9", value: "9" },
          { id: "20", value: "20", left: "15", right: "7" },
          { id: "15", value: "15" },
          { id: "7", value: "7" }
        ],
        highlights: ["9", "20"],
        boxes: [{ label: "Queue", value: "[15, 7]" }, { label: "Result", value: "[[3], [9,20]]" }]
      }
    }
  ]
};

const Problem31DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem31DryRun;
