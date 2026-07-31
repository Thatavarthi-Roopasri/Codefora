import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 34,
  title: "Validate Binary Search Tree",
  difficulty: "Medium",
  tags: ["Tree", "DFS"],
  input: "root = [2,1,3]",
  output: "true",
  code: `function isValidBST(root) {
  function validate(node, low, high) {
    if (!node) return true;
    if ((low !== null && node.val <= low) || (high !== null && node.val >= high)) {
      return false;
    }
    return validate(node.left, low, node.val) && validate(node.right, node.val, high);
  }
  return validate(root, null, null);
}`,
  pseudoCode: [
    "Define validate(node, low, high):",
    "  If node is null return true",
    "  If node.val <= low or node.val >= high return false",
    "  Return validate(node.left, low, node.val) AND validate(node.right, node.val, high)",
    "Call validate(root, null, null)"
  ],
  steps: [
    {
      line: 9, pseudoLine: 5, explanation: "Validate root node 2 with range (-Infinity, Infinity).",
      variables: { node: 2, low: "null", high: "null" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "2", left: "2", right: "3" },
          { id: "2", value: "1" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "1" },
        boxes: [{ label: "Range", value: "(-∞, +∞)" }]
      }
    },
    {
      line: 7, pseudoLine: 4, explanation: "Validate left child 1. Allowed range is (-Infinity, 2). 1 is valid.",
      variables: { node: 1, low: "null", high: 2 },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "2", left: "2", right: "3" },
          { id: "2", value: "1" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "2" },
        highlights: ["2"],
        boxes: [{ label: "Range", value: "(-∞, 2)" }]
      }
    },
    {
      line: 7, pseudoLine: 4, explanation: "Validate right child 3. Allowed range is (2, Infinity). 3 is valid.",
      variables: { node: 3, low: 2, high: "null" },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "2", left: "2", right: "3" },
          { id: "2", value: "1" },
          { id: "3", value: "3" }
        ],
        pointers: { curr: "3" },
        highlights: ["2", "3"],
        boxes: [{ label: "Range", value: "(2, +∞)" }]
      }
    }
  ]
};

const Problem34DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem34DryRun;
