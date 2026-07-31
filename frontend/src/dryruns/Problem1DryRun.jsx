import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-1",
  title: "Pattern 1: Right-Angled Triangle of Stars",
  difficulty: "Easy",
  tags: ["Patterns"],
  input: "n = 3",
  output: "*\\n**\\n***",
  pseudoCode: [
    "function printTriangle(n):",
    "  for i from 1 to n:",
    "    for j from 1 to i:",
    "      print('*')",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [], highlightRow: -1, activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print 1 star for row 1", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
    { pseudoLine: 5, explanation: "Move to next line", visual: { type: "pattern", grid: [["*"]], highlightRow: -1, activeRow: 1 } },
    { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*"]], highlightRow: -1, activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print 1st star for row 2", visual: { type: "pattern", grid: [["*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print 2nd star for row 2", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
    { pseudoLine: 5, explanation: "Move to next line", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: -1, activeRow: 2 } },
    { pseudoLine: 2, explanation: "Start row i=3", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: -1, activeRow: 2 } },
    { pseudoLine: 4, explanation: "Print 1st star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*"]], highlightRow: 2, highlightCol: 0, activeRow: 2 } },
    { pseudoLine: 4, explanation: "Print 2nd star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*"]], highlightRow: 2, highlightCol: 1, activeRow: 2 } },
    { pseudoLine: 4, explanation: "Print 3rd star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*", "*"]], highlightRow: 2, highlightCol: 2, activeRow: 2 } },
    { pseudoLine: 5, explanation: "Done! Triangle is printed ✅", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*", "*"]], highlightRow: -1, activeRow: -1 } }
  ]
};

const Problem1DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem1DryRun;
