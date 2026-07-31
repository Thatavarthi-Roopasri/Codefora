import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-2",
  title: "Pattern 2: Square Star Grid",
  difficulty: "Easy",
  tags: ["Patterns"],
  input: "n = 2",
  output: "**\\n**",
  pseudoCode: [
    "function printSquare(n):",
    "  for i from 1 to n:",
    "    for j from 1 to n:",
    "      print('*')",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [], activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print 1st star", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print 2nd star", visual: { type: "pattern", grid: [["*", "*"]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
    { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*"]], activeRow: 1 } },
    { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*", "*"]], activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print 1st star", visual: { type: "pattern", grid: [["*", "*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print 2nd star", visual: { type: "pattern", grid: [["*", "*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
    { pseudoLine: 5, explanation: "Done! Square is printed ✅", visual: { type: "pattern", grid: [["*", "*"], ["*", "*"]], activeRow: -1 } }
  ]
};

const Problem2DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem2DryRun;
