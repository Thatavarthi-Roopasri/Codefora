import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 22,
  title: "Valid Parentheses",
  difficulty: "Easy",
  tags: ["String", "Stack"],
  input: "s = \"()[]{}\"",
  output: "true",
  code: `function isValid(s) {
  let stack = [];
  let map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (!map[char]) stack.push(char);
    else if (stack.pop() !== map[char]) return false;
  }
  return stack.length === 0;
}`,
  pseudoCode: [
    "Initialize empty stack and hash map of pairs",
    "For each character in string:",
    "  If it's an opening bracket, push to stack",
    "  If closing bracket, pop from stack",
    "  If popped bracket doesn't match, return false",
    "Return true if stack is empty"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Initialize an empty stack.",
      variables: { char: null },
      visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: -1 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Encountered '('. It's an opening bracket, push it to stack.",
      variables: { char: "(" },
      visual: { type: "stack", stack: ["("], input: "()[]{}", inputIndex: 0 }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Encountered ')'. Pop from stack ('('). Matches!",
      variables: { char: ")", popped: "(" },
      visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 1 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Encountered '['. Push to stack.",
      variables: { char: "[" },
      visual: { type: "stack", stack: ["["], input: "()[]{}", inputIndex: 2 }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Encountered ']'. Pop from stack ('['). Matches!",
      variables: { char: "]", popped: "[" },
      visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 3 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Encountered '{'. Push to stack.",
      variables: { char: "{" },
      visual: { type: "stack", stack: ["{"], input: "()[]{}", inputIndex: 4 }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Encountered '}'. Pop from stack ('{'). Matches!",
      variables: { char: "}", popped: "{" },
      visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 5 }
    },
    {
      line: 8, pseudoLine: 6, explanation: "Loop finished. Stack is empty, so string is valid.",
      variables: { },
      visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 6, valid: true }
    }
  ]
};

const Problem22DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem22DryRun;
