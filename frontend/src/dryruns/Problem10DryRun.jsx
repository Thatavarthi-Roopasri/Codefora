import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-5",
  title: "Pattern 5: Diamond Star Pattern",
  difficulty: "Medium",
  tags: ["Patterns"],
  input: "n = 3",
  output: "  *  \\n *** \\n*****\\n *** \\n  *  ",
  pseudoCode: [
    "function diamondPattern(n):",
    "  // Upper half (including middle)",
    "  for i from 1 to n:",
    "    print spaces (n - i)",
    "    print stars (2*i - 1)",
    "  // Lower half",
    "  for i from n-1 down to 1:",
    "    print spaces (n - i)",
    "    print stars (2*i - 1)"
  ],
  steps: [
    { pseudoLine: 3, explanation: "Upper half. Row i=1", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
    { pseudoLine: 3, explanation: "Row i=2", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
    { pseudoLine: 3, explanation: "Row i=3 (middle)", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"]], highlightRow: 2, highlightCol: 4, activeRow: 2 } },
    { pseudoLine: 7, explanation: "Lower half. Row i=2", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "]], highlightRow: 3, highlightCol: 3, activeRow: 3 } },
    { pseudoLine: 7, explanation: "Row i=1", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "], [" ", " ", "*", " ", " "]], highlightRow: 4, highlightCol: 2, activeRow: 4 } },
    { pseudoLine: 9, explanation: "Done! Diamond complete ✅", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "], [" ", " ", "*", " ", " "]], activeRow: -1 } }
  ]
};

const Problem10DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem10DryRun;
