import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "assign-cookies",
  title: "Assign Cookies",
  difficulty: "Easy",
  tags: ["Greedy", "Two Pointers"],
  input: "g = [1,2,3], s = [1,1]",
  output: "1",
  pseudoCode: [
    "function findContentChildren(g, s):",
    "  sort(g); sort(s)",
    "  i = 0, j = 0",
    "  while i < g.length and j < s.length:",
    "    if s[j] >= g[i]:",
    "      i++ // child is content",
    "    j++ // move to next cookie",
    "  return i"
  ],
  steps: [
    { pseudoLine: 3, explanation: "Both arrays are sorted. Start pointers at 0.", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 0, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 0, label2: "j", matches: [] } },
    { pseudoLine: 5, explanation: "s[0] (1) >= g[0] (1). Cookie satisfies child!", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 0, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 0, label2: "j", matches: [[0, 0]] } },
    { pseudoLine: 6, explanation: "Child 0 is content (i++), move to next cookie (j++).", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 1, label2: "j", matches: [[0, 0]] } },
    { pseudoLine: 5, explanation: "s[1] (1) is NOT >= g[1] (2). Cookie is too small.", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 1, label2: "j", matches: [[0, 0]] } },
    { pseudoLine: 7, explanation: "Just move to next cookie (j++).", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 2, label2: "j", matches: [[0, 0]] } },
    { pseudoLine: 8, explanation: "j is out of bounds. Done! 1 child content. ✅", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: -1, label2: "j", matches: [[0, 0]], done: true } }
  ]
};

const Problem15DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem15DryRun;
