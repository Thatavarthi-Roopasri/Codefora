import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "valid-palindrome",
  title: "Valid Palindrome",
  difficulty: "Easy",
  tags: ["Strings", "Two Pointers"],
  input: "s = 'radar'",
  output: "true",
  pseudoCode: [
    "function isPalindrome(s):",
    "  left = 0, right = s.length - 1",
    "  while left < right:",
    "    if s[left] != s[right]:",
    "      return false",
    "    left++",
    "    right--",
    "  return true"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start left at 0, right at 4", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 0, right: 4 } },
    { pseudoLine: 4, explanation: "s[left] == 'r', s[right] == 'r'. They match!", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 0, right: 4, highlight: [0, 4] } },
    { pseudoLine: 6, explanation: "Move pointers inwards.", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 1, right: 3 } },
    { pseudoLine: 4, explanation: "s[left] == 'a', s[right] == 'a'. They match!", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 1, right: 3, highlight: [1, 3] } },
    { pseudoLine: 6, explanation: "Move pointers inwards.", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 2, right: 2 } },
    { pseudoLine: 8, explanation: "left == right, loop ends. It's a palindrome! ✅", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 2, right: 2, success: true, maxWater: "Ans: true" } }
  ]
};

const Problem16DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem16DryRun;
