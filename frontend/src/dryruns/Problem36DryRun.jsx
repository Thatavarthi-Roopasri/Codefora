import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 36,
  title: "Valid Sudoku",
  difficulty: "Medium",
  tags: ["Array", "Hash Table"],
  input: "board = [\n  [\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"],\n  [\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"],\n  [\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"],\n  [\"8\",\".\",\".\",\"4\",\"6\",\".\",\".\",\".\",\"3\"],\n  [\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"],\n  [\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"],\n  [\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"],\n  [\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"],\n  [\".\",\".\",\".\".\",\"8\",\".\",\".\",\"7\",\"9\"]\n]",
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
      visual: { type: "grid", board: "initial", highlight: [], visited: [], label: "Initialize row, col, and box sets" }
    },
    {
      line: 5,
      pseudoLine: 2,
      explanation: "Check cell (0,0): value '5'. Box index is (0/3)*3 + 0/3 = 0.",
      variables: { r: 0, c: 0, val: "5", boxIdx: 0 },
      visual: { type: "grid", board: "initial", highlight: [{ r:0, c:0 }], visited: [{ r:0, c:0 }], label: "Check cell (0,0): '5' is valid. Add to row 0, col 0, box 0 sets." }
    },
    {
      line: 5,
      pseudoLine: 2,
      explanation: "Check cell (0,1): value '3'. Box index is 0. Neither row 0, col 1, nor box 0 has '3' yet.",
      variables: { r: 0, c: 1, val: "3", boxIdx: 0 },
      visual: { type: "grid", board: "initial", highlight: [{ r:0, c:1 }], visited: [{ r:0, c:0 }, { r:0, c:1 }], label: "Check cell (0,1): '3' is valid. Add to sets." }
    },
    {
      line: 5,
      pseudoLine: 2,
      explanation: "Check cell (0,4): value '7'. Box index is (0/3)*3 + 4/3 = 1.",
      variables: { r: 0, c: 4, val: "7", boxIdx: 1 },
      visual: { type: "grid", board: "initial", highlight: [{ r:0, c:4 }], visited: [{ r:0, c:0 }, { r:0, c:1 }, { r:0, c:4 }], label: "Check cell (0,4): '7' is valid. Add to row 0, col 4, box 1 sets." }
    },
    {
      line: 5,
      pseudoLine: 2,
      explanation: "Check cell (1,0): value '6'. Box index is (1/3)*3 + 0/3 = 0. Valid since '6' is not in row 1, col 0, or box 0.",
      variables: { r: 1, c: 0, val: "6", boxIdx: 0 },
      visual: { type: "grid", board: "initial", highlight: [{ r:1, c:0 }], visited: [{ r:0, c:0 }, { r:0, c:1 }, { r:0, c:4 }, { r:1, c:0 }], label: "Check cell (1,0): '6' is valid. Add to sets." }
    },
    {
      line: 5,
      pseudoLine: 2,
      explanation: "Check cell (1,3): value '1'. Box index is (1/3)*3 + 3/3 = 1. Valid since '1' is unique in row 1, col 3, and box 1.",
      variables: { r: 1, c: 3, val: "1", boxIdx: 1 },
      visual: { type: "grid", board: "initial", highlight: [{ r:1, c:3 }], visited: [{ r:0, c:0 }, { r:0, c:1 }, { r:0, c:4 }, { r:1, c:0 }, { r:1, c:3 }], label: "Check cell (1,3): '1' is valid. Add to sets." }
    },
    {
      line: 11,
      pseudoLine: 7,
      explanation: "All 9x9 cells validated successfully without conflicts. The Sudoku board is valid.",
      variables: {},
      visual: { type: "grid", board: "final valid", highlight: [], result: "Sudoku Board is Valid", label: "Sudoku validation complete" }
    }
  ]
};

const Problem36DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem36DryRun;
