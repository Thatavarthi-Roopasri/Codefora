import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-8",
  title: "Pattern 8: Spiral Number Matrix Pattern",
  difficulty: "Medium",
  tags: ["Patterns", "Matrix"],
  input: "n = 3",
  output: "1 2 3\\n8 9 4\\n7 6 5",
  pseudoCode: [
    "function spiralMatrix(n):",
    "  matrix = n x n array",
    "  left=0, right=n-1, top=0, bottom=n-1",
    "  num = 1",
    "  while left <= right and top <= bottom:",
    "    // fill top row",
    "    // fill right col",
    "    // fill bottom row",
    "    // fill left col",
    "  return matrix"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Create a 3x3 empty grid.", visual: { type: "pattern", grid: [[" ", " ", " "], [" ", " ", " "], [" ", " ", " "]] } },
    { pseudoLine: 6, explanation: "Fill top row (left to right)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", " "], [" ", " ", " "]], highlightRow: 0, highlightCol: 2 } },
    { pseudoLine: 7, explanation: "Fill right col (top to bottom)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", "4"], [" ", " ", "5"]], highlightRow: 2, highlightCol: 2 } },
    { pseudoLine: 8, explanation: "Fill bottom row (right to left)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", "4"], ["7", "6", "5"]], highlightRow: 2, highlightCol: 0 } },
    { pseudoLine: 9, explanation: "Fill left col (bottom to top)", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", " ", "4"], ["7", "6", "5"]], highlightRow: 1, highlightCol: 0 } },
    { pseudoLine: 6, explanation: "Fill inner top row (the final center cell)", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", "9", "4"], ["7", "6", "5"]], highlightRow: 1, highlightCol: 1 } },
    { pseudoLine: 10, explanation: "Done! Matrix is fully populated. ✅", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", "9", "4"], ["7", "6", "5"]], activeRow: -1 } }
  ]
};

const Problem14DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem14DryRun;
