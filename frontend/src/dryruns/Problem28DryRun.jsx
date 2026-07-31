import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 28,
  title: "Find Index of First Occurrence in String",
  difficulty: "Easy",
  tags: ["String", "Two Pointers"],
  input: "haystack = 'sadbutsad', needle = 'sad'",
  output: "0",
  code: `function strStr(haystack, needle) {
  if (needle === "") return 0;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let j = 0;
    while (j < needle.length && haystack[i + j] === needle[j]) {
      j++;
    }
    if (j === needle.length) return i;
  }
  return -1;
}`,
  pseudoCode: [
    "Iterate i from 0 to haystack.len - needle.len:",
    "  Initialize j = 0",
    "  While j < needle.len AND haystack[i+j] == needle[j]:",
    "    j++",
    "  If j == needle.len, return i",
    "Return -1"
  ],
  steps: [
    {
      line: 3, pseudoLine: 1, explanation: "Start searching from index i = 0.",
      variables: { i: 0, j: 0 },
      visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], i: 0, j: 0 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "haystack[0] == needle[0] ('s'). Increment j.",
      variables: { i: 0, j: 1 },
      visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0], i: 0, j: 1 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "haystack[1] == needle[1] ('a'). Increment j.",
      variables: { i: 0, j: 2 },
      visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1], i: 0, j: 2 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "haystack[2] == needle[2] ('d'). Increment j.",
      variables: { i: 0, j: 3 },
      visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1, 2], i: 0, j: 3 }
    },
    {
      line: 8, pseudoLine: 5, explanation: "j reached needle length (3). Found match at index 0!",
      variables: { result: 0 },
      visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1, 2] }
    }
  ]
};

const Problem28DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem28DryRun;
