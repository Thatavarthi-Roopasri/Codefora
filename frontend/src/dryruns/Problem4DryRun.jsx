import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-4",
  title: "Pattern 4: Number Pyramid Pattern",
  difficulty: "Easy",
  tags: ["Patterns"],
  input: "n = 3",
  output: "  1  \\n 2 2 \\n3 3 3",
  pseudoCode: [
    "function numberPyramid(n):",
    "  for i from 1 to n:",
    "    print spaces (n - i)",
    "    for j from 1 to i:",
    "      print(i + ' ')",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Row i=1. Print 2 spaces then '1 '", visual: { type: "pattern", grid: [[" ", " ", "1"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
    { pseudoLine: 6, explanation: "Newline", visual: { type: "pattern", grid: [[" ", " ", "1"]], activeRow: 1 } },
    { pseudoLine: 2, explanation: "Row i=2. Print 1 space then '2 ' twice", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
    { pseudoLine: 6, explanation: "Newline", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"]], activeRow: 2 } },
    { pseudoLine: 2, explanation: "Row i=3. Print 0 spaces then '3 ' thrice", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"], ["3", " ", "3", " ", "3"]], highlightRow: 2, highlightCol: 4, activeRow: 2 } },
    { pseudoLine: 6, explanation: "Done! Number pyramid complete ✅", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"], ["3", " ", "3", " ", "3"]], activeRow: -1 } }
  ]
};

const Problem4DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem4DryRun;
