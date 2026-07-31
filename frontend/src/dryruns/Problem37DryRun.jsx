import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
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
      explanation: "Scan the initial board. Collect existing numbers in sets and locate all empty cells (indicated by '.'). First empty is at (0,2).",
      variables: { emptiesCount: 51 },
      visual: { type: "grid", board: "initial with empties highlighted", highlight: [{ r:0, c:2 }], label: "Locate first empty cell at (0,2)" }
    },
    {
      line: 12,
      pseudoLine: 3,
      explanation: "Try placing digits 1-9 at (0,2). Digit '1' is not present in row 0, col 2, or box 0. Place '1' temporarily.",
      variables: { idx: 0, r: 0, c: 2, tryDigit: "1" },
      visual: { type: "grid", board: "first empty filled with '1'", highlight: [{ r:0, c:2 }], label: "Place '1' at (0,2) and recurse" }
    },
    {
      line: 12,
      pseudoLine: 3,
      explanation: "Next empty is (0,3) in box 1. Digit '1' is already in box 1. Try '2'. Valid! Place '2' temporarily.",
      variables: { idx: 1, r: 0, c: 3, tryDigit: "2" },
      visual: { type: "grid", board: "first empty filled with '1'", highlight: [{ r:0, c:3 }], label: "Place '2' at (0,3) and recurse" }
    },
    {
      line: 12,
      pseudoLine: 3,
      explanation: "Next empty is (0,5). Digit '1', '2', '3' are in row 0. Try '4'. Valid! Place '4' temporarily.",
      variables: { idx: 2, r: 0, c: 5, tryDigit: "4" },
      visual: { type: "grid", board: "first empty filled with '1'", highlight: [{ r:0, c:5 }], label: "Place '4' at (0,5) and recurse" }
    },
    {
      line: 14,
      pseudoLine: 4,
      explanation: "Backtracking scenario: If subsequent placements fail, remove the digit (reset to '.') and try the next available candidate.",
      variables: { idx: 3, r: 0, c: 6, status: "Conflict / Backtrack" },
      visual: { type: "grid", board: "first empty filled with '1'", highlight: [{ r:0, c:6 }], label: "Backtrack if a branch leads to no valid solutions" }
    },
    {
      line: 22,
      pseudoLine: 2,
      explanation: "Recursion continues. All empty cells are filled without conflicts. The puzzle is solved successfully!",
      variables: { idx: 51 },
      visual: { type: "grid", board: "solved board", result: "Sudoku Solved!", label: "Sudoku solver complete" }
    }
  ]
};

const Problem37DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem37DryRun;
