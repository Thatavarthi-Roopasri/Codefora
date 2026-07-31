import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "pattern-7",
  title: "Pattern 7: Floyd's Triangle of Numbers",
  difficulty: "Medium",
  tags: ["Patterns"],
  input: "n = 3",
  output: "1\\n2 3\\n4 5 6",
  pseudoCode: [
    "function floydsTriangle(n):",
    "  num = 1",
    "  for i from 1 to n:",
    "    for j from 1 to i:",
    "      print(num + ' ')",
    "      num++",
    "    print(newline)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start with num = 1", visual: { type: "pattern", grid: [], activeRow: 0 } },
    { pseudoLine: 5, explanation: "Row 1: Print '1 '", visual: { type: "pattern", grid: [["1", " "]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
    { pseudoLine: 5, explanation: "Row 2: Print '2 '", visual: { type: "pattern", grid: [["1", " "], ["2", " "]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
    { pseudoLine: 5, explanation: "Row 2: Print '3 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
    { pseudoLine: 5, explanation: "Row 3: Print '4 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " "]], highlightRow: 2, highlightCol: 1, activeRow: 2 } },
    { pseudoLine: 5, explanation: "Row 3: Print '5 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " "]], highlightRow: 2, highlightCol: 3, activeRow: 2 } },
    { pseudoLine: 5, explanation: "Row 3: Print '6 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " ", "6", " "]], highlightRow: 2, highlightCol: 5, activeRow: 2 } },
    { pseudoLine: 7, explanation: "Done! Floyd's Triangle complete ✅", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " ", "6", " "]], activeRow: -1 } }
  ]
};

const Problem6DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem6DryRun;
