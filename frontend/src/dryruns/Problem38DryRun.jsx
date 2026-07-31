import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 38,
  title: "Count and Say",
  difficulty: "Easy",
  tags: ["String"],
  input: "n = 4",
  output: "\"1211\"",
  code: `function countAndSay(n){
  let result = "1";
  for (let i=1;i<n;i++){
    let next = "";
    let count = 1;
    for (let j=1;j<result.length;j++){
      if (result[j]===result[j-1]) count++;
      else { next+=count+result[j-1]; count=1; }
    }
    next+=count+result[result.length-1];
    result=next;
  }
  return result;
}`,
  pseudoCode: [
    "Start with \"1\"",
    "Repeat n-1 times:",
    "  Scan current string, count consecutive identical digits",
    "  Build new string as count+digit",
    "Return final string"
  ],
  steps: [
    {
      line: 2,
      pseudoLine: 1,
      explanation: "Initialize result as base case \"1\".",
      variables: { result: "1" },
      visual: { type: "text", content: "1", note: "n = 1: base case is '1'." }
    },
    {
      line: 4,
      pseudoLine: 2,
      explanation: "Iteration i=1: Scan \"1\". We see one '1'. `next` becomes \"11\". Update result.",
      variables: { result: "11", i: 1 },
      visual: { type: "text", content: "11", note: "i=1: one '1' -> '11'" }
    },
    {
      line: 4,
      pseudoLine: 2,
      explanation: "Iteration i=2: Scan \"11\". Consecutive characters match, count becomes 2. `next` becomes \"21\".",
      variables: { result: "21", i: 2 },
      visual: { type: "text", content: "21", note: "i=2: two '1's -> '21'" }
    },
    {
      line: 6,
      pseudoLine: 3,
      explanation: "Iteration i=3: Scan \"21\". Check first digit '2'. Since next is '1' (different), write one '2' -> \"12\". Reset count to 1.",
      variables: { result: "21", i: 3, currentChar: "2", count: 1, next: "12" },
      visual: { type: "text", content: "21", groups: ["1 group of 2"], note: "i=3: Scan digit 2. Write '12'." }
    },
    {
      line: 10,
      pseudoLine: 4,
      explanation: "Scan second digit '1'. Since we are at the end of the string, write one '1' -> \"11\". `next` becomes \"1211\". Update result.",
      variables: { result: "1211", i: 3, currentChar: "1", count: 1, next: "1211" },
      visual: { type: "text", content: "1211", groups: ["1 group of 2", "1 group of 1"], note: "i=3: Scan digit 1. Write '11'. Result is '1211'." }
    },
    {
      line: 4,
      pseudoLine: 2,
      explanation: "Iteration i=4: Scan \"1211\". We see one '1' -> \"11\", then one '2' -> \"12\", then two '1's -> \"21\". `next` becomes \"111221\".",
      variables: { result: "111221", i: 4 },
      visual: { type: "text", content: "111221", note: "i=4: one '1', one '2', two '1's -> '111221'" }
    },
    {
      line: 14,
      pseudoLine: 5,
      explanation: "The loop runs n-1 times. For input n=4, the final result is \"1211\".",
      variables: { result: "1211" },
      visual: { type: "text", content: "1211", result: "1211", note: "Done! Return '1211' for n=4." }
    }
  ]
};

const Problem38DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem38DryRun;
