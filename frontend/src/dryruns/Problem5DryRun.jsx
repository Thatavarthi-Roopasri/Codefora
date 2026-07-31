import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-6",
  title: "Pattern 6: Hollow Square Star Pattern",
  difficulty: "Medium",
  tags: ["Patterns"],
  input: "n = 3",
  output: "***\\n* *\\n***",
  pseudoCode: [
    "function hollowSquare(n):",
    "  for i from 1 to n:",
    "    for j from 1 to n:",
    "      if i==1 or i==n or j==1 or j==n:",
    "        print('*')",
    "      else:",
    "        print(' ')",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Row 1 (first row = all stars)", visual: { type: "pattern", grid: [["*", "*", "*"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
    { pseudoLine: 4, explanation: "Row 2: star, space, star", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"]], highlightRow: 1, highlightCol: 2, activeRow: 1 } },
    { pseudoLine: 4, explanation: "Row 3 (last row = all stars)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"], ["*", "*", "*"]], highlightRow: 2, highlightCol: 2, activeRow: 2 } },
    { pseudoLine: 8, explanation: "Done! Hollow square complete ✅", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"], ["*", "*", "*"]], activeRow: -1 } }
  ]
};

const Problem5DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem5DryRun;
