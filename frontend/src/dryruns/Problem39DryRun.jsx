import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 39,
  title: "Combination Sum",
  difficulty: "Medium",
  tags: ["Backtracking", "Array"],
  input: "candidates = [2,3,6,7], target = 7",
  output: "[[2,2,3],[7]]",
  code: `function combinationSum(candidates, target){
  const res = [];
  function dfs(start, path, sum){
    if (sum === target){ res.push([...path]); return; }
    if (sum > target) return;
    for (let i=start;i<candidates.length;i++){
      path.push(candidates[i]);
      dfs(i, path, sum + candidates[i]);
      path.pop();
    }
  }
  dfs(0, [], 0);
  return res;
}`,
  pseudoCode: [
    "Define result array",
    "DFS(start, path, sum):",
    "  If sum == target → push copy of path",
    "  If sum > target → backtrack",
    "  Loop i from start to end of candidates:",
    "    Add candidates[i] to path, recurse with same i (allow reuse)",
    "    Remove last element (backtrack)",
    "Call DFS(0, [], 0)"
  ],
  steps: [
    {
      line: 2,
      pseudoLine: 1,
      explanation: "Initialize an empty result array. We start searching from index 0 with sum 0.",
      variables: { start: 0, path: "[]", sum: 0 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 0,
        i: -1,
        path: [],
        sum: 0,
        target: 7,
        results: [],
        note: "Target = 7. Start search at index 0. Re-using elements is permitted."
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Choose candidates[0] = 2. DFS can choose 2 again in the next recursive call.",
      variables: { start: 0, i: 0, path: "[2]", sum: 2 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 0,
        i: 0,
        path: [2],
        sum: 2,
        target: 7,
        results: [],
        note: "Choose 2. Sum is 2. Recurse from same index 0 (allowing reuse)."
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Choose 2 again. Current path is [2, 2] with sum 4.",
      variables: { start: 0, i: 0, path: "[2,2]", sum: 4 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 0,
        i: 0,
        path: [2, 2],
        sum: 4,
        target: 7,
        results: [],
        note: "Choose 2 again. Sum is 4. Recurse from same index 0."
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Choose 2 again. Path becomes [2, 2, 2] with sum 6.",
      variables: { start: 0, i: 0, path: "[2,2,2]", sum: 6 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 0,
        i: 0,
        path: [2, 2, 2],
        sum: 6,
        target: 7,
        results: [],
        note: "Choose 2 again. Sum is 6. Recurse from same index 0."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 2 again. Path sum becomes 8, which exceeds our target 7. We must backtrack.",
      variables: { start: 0, i: 0, path: "[2,2,2,2]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 0,
        i: 0,
        path: [2, 2, 2, 2],
        sum: 8,
        target: 7,
        results: [],
        backtrack: true,
        note: "sum (8) > target (7). Return/backtrack and remove last element."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Remove 2. Try candidates[1] = 3. Sum is 9, exceeding target. Backtrack.",
      variables: { start: 1, i: 1, path: "[2,2,2,3]", sum: 9 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [2, 2, 2, 3],
        sum: 9,
        target: 7,
        results: [],
        backtrack: true,
        note: "sum (9) > target (7). Backtrack!"
      }
    },
    {
      line: 3,
      pseudoLine: 2,
      explanation: "Backtrack to path [2, 2]. Try candidates[1] = 3. Path is [2, 2, 3], sum is 7. Valid combination found!",
      variables: { start: 1, i: 1, path: "[2,2,3]", sum: 7 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [2, 2, 3],
        sum: 7,
        target: 7,
        results: [[2, 2, 3]],
        found: true,
        note: "sum == target (7)! Copy current path to results."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Backtrack and try candidates[2] = 6. Path is [2, 2, 6], sum is 10. Backtrack.",
      variables: { start: 2, i: 2, path: "[2,2,6]", sum: 10 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 2,
        i: 2,
        path: [2, 2, 6],
        sum: 10,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (10) > target (7). Backtrack!"
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Backtrack to [2]. Try candidates[1] = 3. Path sum is 5. Recurse from index 1.",
      variables: { start: 1, i: 1, path: "[2,3]", sum: 5 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [2, 3],
        sum: 5,
        target: 7,
        results: [[2, 2, 3]],
        note: "Sum is 5. Recurse from index 1 (allowing 3 to be reused)."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 3 again. Path sum is 8, exceeding target. Backtrack.",
      variables: { start: 1, i: 1, path: "[2,3,3]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [2, 3, 3],
        sum: 8,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (8) > target (7). Backtrack!"
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Backtrack and try candidates[2] = 6. Path sum is 11, exceeding target. Backtrack.",
      variables: { start: 2, i: 2, path: "[2,6]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 2,
        i: 2,
        path: [2, 6],
        sum: 8,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (8) > target (7). Backtrack!"
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Backtrack to root level. Try candidates[1] = 3. Sum is 3. Recurse from index 1.",
      variables: { start: 1, i: 1, path: "[3]", sum: 3 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [3],
        sum: 3,
        target: 7,
        results: [[2, 2, 3]],
        note: "Root level choices for 2 are done. Start branch with 3."
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Choose 3 again. Path becomes [3, 3] with sum 6. Recurse from index 1.",
      variables: { start: 1, i: 1, path: "[3,3]", sum: 6 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [3, 3],
        sum: 6,
        target: 7,
        results: [[2, 2, 3]],
        note: "Choose 3 again. Sum is 6. Recurse from index 1."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 3 again. Path is [3, 3, 3] with sum 9, exceeding target. Backtrack.",
      variables: { start: 1, i: 1, path: "[3,3,3]", sum: 9 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 1,
        i: 1,
        path: [3, 3, 3],
        sum: 9,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (9) > target (7). Backtrack!"
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Backtrack and try candidates[2] = 6. Path sum is 9, exceeding target. Backtrack.",
      variables: { start: 2, i: 2, path: "[3,6]", sum: 9 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 2,
        i: 2,
        path: [3, 6],
        sum: 9,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (9) > target (7). Backtrack!"
      }
    },
    {
      line: 6,
      pseudoLine: 6,
      explanation: "Backtrack to root level. Try candidates[2] = 6. Sum is 6. Recurse from index 2.",
      variables: { start: 2, i: 2, path: "[6]", sum: 6 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 2,
        i: 2,
        path: [6],
        sum: 6,
        target: 7,
        results: [[2, 2, 3]],
        note: "Start branch with 6. Recurse from index 2."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 6 again. Path sum is 12, exceeding target. Backtrack.",
      variables: { start: 2, i: 2, path: "[6,6]", sum: 12 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 2,
        i: 2,
        path: [6, 6],
        sum: 12,
        target: 7,
        results: [[2, 2, 3]],
        backtrack: true,
        note: "sum (12) > target (7). Backtrack!"
      }
    },
    {
      line: 3,
      pseudoLine: 2,
      explanation: "Backtrack to root level. Try candidates[3] = 7. Path is [7], sum is 7. Valid combination found!",
      variables: { start: 3, i: 3, path: "[7]", sum: 7 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 3,
        i: 3,
        path: [7],
        sum: 7,
        target: 7,
        results: [[2, 2, 3], [7]],
        found: true,
        note: "sum == target (7)! Save [7] into results."
      }
    },
    {
      line: 13,
      pseudoLine: 8,
      explanation: "DFS is complete. Return all collected unique combinations.",
      variables: { resultCount: 2 },
      visual: {
        type: "combinationSum2",
        candidates: [2, 3, 6, 7],
        start: 4,
        i: -1,
        path: [],
        sum: 0,
        target: 7,
        results: [[2, 2, 3], [7]],
        found: true,
        note: "Done! Answer = [[2, 2, 3], [7]]"
      }
    }
  ]
};

const Problem39DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem39DryRun;

