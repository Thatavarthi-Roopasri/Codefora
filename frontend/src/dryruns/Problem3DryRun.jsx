import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-3",
  title: "Pattern 3: Inverted Right Triangle of Stars",
  difficulty: "Easy",
  tags: ["Patterns"],
  input: "n = 3",
  output: "***\\n**\\n*",
  pseudoCode: [
    "function invertedTriangle(n):",
    "  for i from n down to 1:",
    "    for j from 1 to i:",
    "      print('*')",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start row i=3", visual: { type: "pattern", grid: [], activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print star (1 of 3)", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print star (2 of 3)", visual: { type: "pattern", grid: [["*", "*"]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
    { pseudoLine: 4, explanation: "Print star (3 of 3)", visual: { type: "pattern", grid: [["*", "*", "*"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
    { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*", "*"]], activeRow: 1 } },
    { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*", "*", "*"]], activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print star (1 of 2)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
    { pseudoLine: 4, explanation: "Print star (2 of 2)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
    { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], activeRow: 2 } },
    { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], activeRow: 2 } },
    { pseudoLine: 4, explanation: "Print star (1 of 1)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"], ["*"]], highlightRow: 2, highlightCol: 0, activeRow: 2 } },
    { pseudoLine: 5, explanation: "Done! Inverted triangle complete ✅", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"], ["*"]], activeRow: -1 } }
  ]
};

const Problem3DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem3DryRun;
