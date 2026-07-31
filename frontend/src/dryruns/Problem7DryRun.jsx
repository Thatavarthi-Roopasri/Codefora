import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "reverse-string",
  title: "Reverse String",
  difficulty: "Easy",
  tags: ["Strings", "Two Pointers"],
  input: "s = ['h','e','l','l','o']",
  output: "['o','l','l','e','h']",
  pseudoCode: [
    "function reverseString(s):",
    "  left = 0, right = s.length - 1",
    "  while left < right:",
    "    swap(s[left], s[right])",
    "    left++",
    "    right--"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Set left=0, right=4", visual: { type: "twopointer", array: ['h','e','l','l','o'], left: 0, right: 4 } },
    { pseudoLine: 4, explanation: "Swap 'h' and 'o'", visual: { type: "twopointer", array: ['o','e','l','l','h'], left: 0, right: 4, highlight: [0, 4] } },
    { pseudoLine: 5, explanation: "Move pointers inwards", visual: { type: "twopointer", array: ['o','e','l','l','h'], left: 1, right: 3 } },
    { pseudoLine: 4, explanation: "Swap 'e' and 'l'", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 1, right: 3, highlight: [1, 3] } },
    { pseudoLine: 5, explanation: "Move pointers inwards. left=2, right=2", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 2, right: 2 } },
    { pseudoLine: 3, explanation: "left == right, loop ends. Done! ✅", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 2, right: 2, success: true } }
  ]
};

const Problem7DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem7DryRun;
