import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 27,
  title: "Symmetric Tree",
  difficulty: "Easy",
  tags: ["Tree", "DFS"],
  input: "root = [1,2,2,3,4,4,3]",
  output: "true",
  code: `function isSymmetric(root) {
  if (!root) return true;
  function isMirror(t1, t2) {
    if (!t1 && !t2) return true;
    if (!t1 || !t2) return false;
    return (t1.val === t2.val)
      && isMirror(t1.right, t2.left)
      && isMirror(t1.left, t2.right);
  }
  return isMirror(root.left, root.right);
}`,
  pseudoCode: [
    "Define isMirror(t1, t2):",
    "  If both null, true",
    "  If one null, false",
    "  Return (t1.val == t2.val) AND",
    "         isMirror(t1.right, t2.left) AND",
    "         isMirror(t1.left, t2.right)"
  ],
  steps: [
    {
      line: 10, pseudoLine: 1, explanation: "Check if left and right subtrees are mirrors.",
      variables: { root: 1 },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", left: "2L", right: "2R" },
          { id: "2L", value: "2", left: "3L", right: "4L" },
          { id: "2R", value: "2", left: "4R", right: "3R" },
          { id: "3L", value: "3" },
          { id: "4L", value: "4" },
          { id: "4R", value: "4" },
          { id: "3R", value: "3" }
        ],
        pointers: { curr: "1" }
      }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Compare root.left (2) with root.right (2). They match.",
      variables: { t1: 2, t2: 2 },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", left: "2L", right: "2R" },
          { id: "2L", value: "2", left: "3L", right: "4L" },
          { id: "2R", value: "2", left: "4R", right: "3R" },
          { id: "3L", value: "3" },
          { id: "4L", value: "4" },
          { id: "4R", value: "4" },
          { id: "3R", value: "3" }
        ],
        pointers: { t1: "2L", t2: "2R" },
        highlights: ["2L", "2R"],
        boxes: [{ label: "Mirror?", value: "2 == 2" }]
      }
    },
    {
      line: 7, pseudoLine: 5, explanation: "Compare t1.right (4) and t2.left (4). They match.",
      variables: { t1: 4, t2: 4 },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", left: "2L", right: "2R" },
          { id: "2L", value: "2", left: "3L", right: "4L" },
          { id: "2R", value: "2", left: "4R", right: "3R" },
          { id: "3L", value: "3" },
          { id: "4L", value: "4" },
          { id: "4R", value: "4" },
          { id: "3R", value: "3" }
        ],
        pointers: { t1: "4L", t2: "4R" },
        highlights: ["4L", "4R"],
        boxes: [{ label: "Outer check", value: "4 == 4" }]
      }
    },
    {
      line: 8, pseudoLine: 6, explanation: "Compare t1.left (3) and t2.right (3). They also match.",
      variables: { t1: 3, t2: 3 },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", left: "2L", right: "2R" },
          { id: "2L", value: "2", left: "3L", right: "4L" },
          { id: "2R", value: "2", left: "4R", right: "3R" },
          { id: "3L", value: "3" },
          { id: "4L", value: "4" },
          { id: "4R", value: "4" },
          { id: "3R", value: "3" }
        ],
        pointers: { t1: "3L", t2: "3R" },
        highlights: ["3L", "3R"],
        boxes: [{ label: "Inner check", value: "3 == 3" }]
      }
    },
    {
      line: 10, pseudoLine: 6, explanation: "Every mirrored pair matched, so the tree is symmetric.",
      variables: { result: true },
      visual: {
        type: "tree",
        nodes: [
          { id: "1", value: "1", left: "2L", right: "2R" },
          { id: "2L", value: "2", left: "3L", right: "4L" },
          { id: "2R", value: "2", left: "4R", right: "3R" },
          { id: "3L", value: "3" },
          { id: "4L", value: "4" },
          { id: "4R", value: "4" },
          { id: "3R", value: "3" }
        ],
        highlights: ["1", "2L", "2R", "3L", "4L", "4R", "3R"],
        boxes: [{ label: "Result", value: "true" }]
      }
    }
  ]
};

const Problem27DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem27DryRun;
