import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "fizzbuzz",
  title: "FizzBuzz",
  difficulty: "Easy",
  tags: ["Math", "Simulation"],
  input: "n = 5",
  output: "['1','2','Fizz','4','Buzz']",
  pseudoCode: [
    "function fizzBuzz(n):",
    "  ans = []",
    "  for i from 1 to n:",
    "    if i % 3 == 0 and i % 5 == 0: ans.push('FizzBuzz')",
    "    else if i % 3 == 0: ans.push('Fizz')",
    "    else if i % 5 == 0: ans.push('Buzz')",
    "    else: ans.push(str(i))",
    "  return ans"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start with empty array.", visual: { type: "array", array: [], i: -1 } },
    { pseudoLine: 7, explanation: "i=1. Append '1'", visual: { type: "array", array: ["1"], highlight: [0] } },
    { pseudoLine: 7, explanation: "i=2. Append '2'", visual: { type: "array", array: ["1", "2"], highlight: [1] } },
    { pseudoLine: 5, explanation: "i=3. Divisible by 3! Append 'Fizz'", visual: { type: "array", array: ["1", "2", "Fizz"], highlight: [2] } },
    { pseudoLine: 7, explanation: "i=4. Append '4'", visual: { type: "array", array: ["1", "2", "Fizz", "4"], highlight: [3] } },
    { pseudoLine: 6, explanation: "i=5. Divisible by 5! Append 'Buzz'", visual: { type: "array", array: ["1", "2", "Fizz", "4", "Buzz"], highlight: [4] } },
    { pseudoLine: 8, explanation: "Done! ✅", visual: { type: "array", array: ["1", "2", "Fizz", "4", "Buzz"], highlight: [] } }
  ]
};

const Problem8DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem8DryRun;
