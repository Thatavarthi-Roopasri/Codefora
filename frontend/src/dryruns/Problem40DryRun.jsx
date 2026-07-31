import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 40,
  title: "Combination Sum II",
  difficulty: "Medium",
  tags: ["Backtracking", "Array", "Sorting"],
  input: "candidates = [10,1,2,7,6,1,5], target = 8",
  output: "[[1,1,6],[1,2,5],[1,7],[2,6]]",
  code: `function combinationSum2(candidates, target){
  candidates.sort((a,b)=>a-b);
  const res = [];
  function dfs(start, path, sum){
    if (sum === target){ res.push([...path]); return; }
    if (sum > target) return;
    for (let i=start;i<candidates.length;i++){
      if (i>start && candidates[i]===candidates[i-1]) continue; // skip duplicates
      path.push(candidates[i]);
      dfs(i+1, path, sum + candidates[i]);
      path.pop();
    }
  }
  dfs(0, [], 0);
  return res;
}`,
  pseudoCode: [
    "Sort candidates",
    "DFS(start, path, sum):",
    "  If sum == target → add copy of path",
    "  If sum > target → backtrack",
    "  Loop i from start to end:",
    "    Skip duplicate numbers at same recursion level",
    "    Choose candidates[i], recurse with i+1, then backtrack",
    "Call DFS(0, [], 0)"
  ],
  steps: [
    {
      line: 2,
      pseudoLine: 1,
      explanation: "Sort the candidates first, so duplicate values stay next to each other.",
      variables: { start: 0, path: "[]", sum: 0 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 0,
        i: -1,
        path: [],
        sum: 0,
        target: 8,
        results: [],
        note: "Sorted array = [1, 1, 2, 5, 6, 7, 10]. Now DFS can skip same-level duplicates."
      }
    },
    {
      line: 8,
      pseudoLine: 7,
      explanation: "Choose the first 1 at index 0 and go deeper.",
      variables: { start: 1, i: 0, path: "[1]", sum: 1 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 1,
        i: 0,
        path: [1],
        sum: 1,
        target: 8,
        results: [],
        note: "Pick candidates[0] = 1. Recurse with start = i + 1 = 1."
      }
    },
    {
      line: 8,
      pseudoLine: 7,
      explanation: "Choose the second 1 at index 1. This is allowed because it is in the next recursion level.",
      variables: { start: 2, i: 1, path: "[1,1]", sum: 2 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 2,
        i: 1,
        path: [1,1],
        sum: 2,
        target: 8,
        results: [],
        note: "Second 1 is not a duplicate at this level; it belongs to the path [1, 1]."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Add 6. The path [1,1,6] reaches target 8, so save it.",
      variables: { start: 5, i: 4, path: "[1,1,6]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 5,
        i: 4,
        path: [1,1,6],
        sum: 8,
        target: 8,
        results: [[1,1,6]],
        found: true,
        note: "sum == target. Copy [1, 1, 6] into results."
      }
    },
    {
      line: 11,
      pseudoLine: 7,
      explanation: "Backtrack, then try 2 after the first 1.",
      variables: { start: 3, i: 2, path: "[1,2]", sum: 3 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 3,
        i: 2,
        path: [1,2],
        sum: 3,
        target: 8,
        results: [[1,1,6]],
        backtrack: true,
        note: "Remove the last choice, then choose 2. Now search for target - 3 = 5."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 5. The path [1,2,5] is another valid answer.",
      variables: { start: 4, i: 3, path: "[1,2,5]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 4,
        i: 3,
        path: [1,2,5],
        sum: 8,
        target: 8,
        results: [[1,1,6],[1,2,5]],
        found: true,
        note: "sum == target again. Save [1, 2, 5]."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Backtrack and choose 7 after the first 1. This gives [1,7].",
      variables: { start: 6, i: 5, path: "[1,7]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 6,
        i: 5,
        path: [1,7],
        sum: 8,
        target: 8,
        results: [[1,1,6],[1,2,5],[1,7]],
        found: true,
        note: "The branch with first 1 also finds [1, 7]."
      }
    },
    {
      line: 7,
      pseudoLine: 6,
      explanation: "At the root level, skip the second 1 because it would duplicate branches already explored.",
      variables: { start: 0, i: 1, path: "[]", sum: 0 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 0,
        i: 1,
        path: [],
        sum: 0,
        target: 8,
        results: [[1,1,6],[1,2,5],[1,7]],
        skip: true,
        note: "i > start and candidates[i] == candidates[i - 1], so skip this 1."
      }
    },
    {
      line: 4,
      pseudoLine: 3,
      explanation: "Choose 2 at root, then 6. The path [2,6] reaches target 8.",
      variables: { start: 5, i: 4, path: "[2,6]", sum: 8 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 5,
        i: 4,
        path: [2,6],
        sum: 8,
        target: 8,
        results: [[1,1,6],[1,2,5],[1,7],[2,6]],
        found: true,
        note: "Final valid combination found: [2, 6]."
      }
    },
    {
      line: 14,
      pseudoLine: 8,
      explanation: "DFS is complete. Return all unique combinations.",
      variables: { resultCount: 4 },
      visual: {
        type: "combinationSum2",
        candidates: [1,1,2,5,6,7,10],
        start: 7,
        i: -1,
        path: [],
        sum: 0,
        target: 8,
        results: [[1,1,6],[1,2,5],[1,7],[2,6]],
        found: true,
        note: "Answer = [[1,1,6], [1,2,5], [1,7], [2,6]]. No duplicate combinations."
      }
    }
  ]
};

const Problem40DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem40DryRun;
