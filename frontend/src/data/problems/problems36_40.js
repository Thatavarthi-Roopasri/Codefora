export const problems36_40 = [
  // ─────────────────────────────────────────────
  // PROBLEM 36: Valid Sudoku
  // ─────────────────────────────────────────────
  {
    id: 36,
    title: "Valid Sudoku",
    difficulty: "Medium",
    tags: ["Array", "Hash Table"],
    input: "board = [\n  [\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"],\n  [\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"],\n  [\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"],\n  [\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"],\n  [\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"],\n  [\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"],\n  [\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"],\n  [\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"],\n  [\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]\n]",
    output: "true",
    code: `function isValidSudoku(board) {
  const rows = Array.from({ length: 9 }, () => new Set());
  const cols = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val === '.') continue;
      const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rows[r].has(val) || cols[c].has(val) || boxes[boxIdx].has(val)) {
        return false;
      }
      rows[r].add(val);
      cols[c].add(val);
      boxes[boxIdx].add(val);
    }
  }
  return true;
}`,
    pseudoCode: [
      "Create 9 sets for rows, 9 sets for columns, 9 sets for 3x3 boxes",
      "Iterate each cell (r,c):",
      "  If cell is '.' continue",
      "  Compute box index = (r/3)*3 + c/3",
      "  If value already in corresponding row/col/box set -> invalid",
      "  Else add value to those sets",
      "If loop completes, board is valid"
    ],
    steps: [
      {
        line: 2,
        pseudoLine: 1,
        explanation: "Initialize empty sets for rows, columns, and boxes.",
        variables: {},
        visual: { type: "grid", board: "initial", highlight: [], label: "Sudoku sets: rows / cols / boxes" }
      },
      {
        line: 5,
        pseudoLine: 2,
        explanation: "Start iterating over each cell; first non‑empty cell is '5' at (0,0).",
        variables: { r: 0, c: 0, val: "5", boxIdx: 0 },
        visual: { type: "grid", board: "after first cell", highlight: [{ r:0, c:0 }], visited: [{ r:0, c:0 }], label: "Check cell (0,0): value 5" }
      },
      {
        line: 11,
        pseudoLine: 7,
        explanation: "All cells processed without conflict, return true.",
        variables: {},
        visual: { type: "grid", board: "final valid", highlight: [], result: "Board is valid", label: "Sudoku validation complete" }
      }
    ]
  },
  // ─────────────────────────────────────────────
  // PROBLEM 37: Sudoku Solver
  // ─────────────────────────────────────────────
  {
    id: 37,
    title: "Sudoku Solver",
    difficulty: "Hard",
    tags: ["Backtracking", "Array"],
    input: "board = [...] (same format as problem 36)",
    output: "board solved",
    code: `function solveSudoku(board) {
  const rows = Array.from({ length: 9 }, () => new Set());
  const cols = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());
  const empties = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val === '.') { empties.push([r,c]); continue; }
      const b = Math.floor(r/3)*3 + Math.floor(c/3);
      rows[r].add(val); cols[c].add(val); boxes[b].add(val);
    }
  }
  function backtrack(idx){
    if (idx === empties.length) return true;
    const [r,c] = empties[idx];
    const b = Math.floor(r/3)*3 + Math.floor(c/3);
    for (let d=1; d<=9; d++){
      const ch = d.toString();
      if (rows[r].has(ch)||cols[c].has(ch)||boxes[b].has(ch)) continue;
      board[r][c]=ch; rows[r].add(ch); cols[c].add(ch); boxes[b].add(ch);
      if (backtrack(idx+1)) return true;
      board[r][c]='.'; rows[r].delete(ch); cols[c].delete(ch); boxes[b].delete(ch);
    }
    return false;
  }
  backtrack(0);
}`,
    pseudoCode: [
      "Collect existing numbers into row/col/box sets and list empty cells",
      "Define recursive backtrack(idx):",
      "  If idx equals number of empties → solved",
      "  Try digits 1‑9 for current empty cell; if not in sets, place and recurse",
      "  On failure backtrack (remove digit)",
      "Start backtrack(0)"
    ],
    steps: [
      {
        line: 2,
        pseudoLine: 1,
        explanation: "Create sets and locate empty cells.",
        variables: { emptiesCount: "?" },
        visual: { type: "grid", board: "initial with empties highlighted", highlight: [{ r:0, c:2 }, { r:0, c:3 }, { r:0, c:5 }], label: "Find empty cells" }
      },
      {
        line: 12,
        pseudoLine: 2,
        explanation: "Begin backtracking with first empty cell.",
        variables: { idx: 0 },
        visual: { type: "grid", board: "first empty filled with '1'", highlight: [{ r:0, c:2 }], label: "Try candidate at first empty cell" }
      },
      {
        line: 22,
        pseudoLine: 5,
        explanation: "All empties filled → puzzle solved.",
        variables: {},
        visual: { type: "grid", board: "solved board", result: "Solved board", label: "Backtracking success" }
      }
    ]
  },
  // ─────────────────────────────────────────────
  // PROBLEM 38: Count and Say
  // ─────────────────────────────────────────────
  {
    id: 38,
    title: "Count and Say",
    difficulty: "Easy",
    tags: ["String"],
    input: "n = 4",
    output: "\"1211\"",
    code: `function countAndSay(n){
  let result = "1";
  for (let i=1;i<n;i++){
    let next = "";
    let count = 1;
    for (let j=1;j<result.length;j++){
      if (result[j]===result[j-1]) count++;
      else { next+=count+result[j-1]; count=1; }
    }
    next+=count+result[result.length-1];
    result=next;
  }
  return result;
}`,
    pseudoCode: [
      "Start with \"1\"",
      "Repeat n-1 times:",
      "  Scan current string, count consecutive identical digits",
      "  Build new string as count+digit",
      "Return final string"
    ],
    steps: [
      { line: 2, pseudoLine: 1, explanation: "Initialize result as \"1\".", visual: { type: "text", content: "1", note: "Base sequence: say one 1." } },
      { line: 4, pseudoLine: 2, explanation: "First iteration (i=1) reads one '1', so it produces \"11\".", visual: { type: "text", content: "11", groups: ["one 1 → 11"], note: "Count consecutive equal digits, then write count + digit." } },
      { line: 9, pseudoLine: 4, explanation: "Second iteration reads \"11\" as two 1s, so it yields \"21\".", visual: { type: "text", content: "21", groups: ["two 1s → 21"], note: "The previous string becomes the sentence for the next string." } },
      { line: 14, pseudoLine: 5, explanation: "Third iteration reads \"21\" as one 2 and one 1, producing \"1211\" for n=4.", visual: { type: "text", content: "1211", groups: ["one 2 → 12", "one 1 → 11"], note: "Final answer for n = 4 is 1211." } }
    ]
  },
  // ─────────────────────────────────────────────
  // PROBLEM 39: Combination Sum
  // ─────────────────────────────────────────────
  {
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
      { line: 2, pseudoLine: 1, explanation: "Initialize empty result.", visual: { type: "list", label: "Result combinations", items: [], note: "DFS will collect paths whose sum becomes target 7." } },
      { line: 5, pseudoLine: 2, explanation: "First recursive call chooses 2. Because reuse is allowed, DFS may choose 2 again.", visual: { type: "list", label: "Current path / recursion branch", items: [[2], [2,2], [2,2,3]], activeIndex: 2, note: "Reuse allowed: recurse with the same index i." } },
      { line: 9, pseudoLine: 3, explanation: "When sum reaches 7, push the current combination. Later branch [7] is also valid.", visual: { type: "list", label: "Result combinations", items: [[2,2,3], [7]], activeIndex: 1, note: "All combinations that sum to 7 are saved." } }
    ]
  },
  // ─────────────────────────────────────────────
  // PROBLEM 40: Combination Sum II
  // ─────────────────────────────────────────────
  {
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
  }
];
