import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 33,
  title: "Longest Substring Without Repeating Characters",
  difficulty: "Medium",
  tags: ["String", "Two Pointers", "Sliding Window"],
  input: "s = \"abcabcbb\"",
  output: "3",
  code: `function lengthOfLongestSubstring(s) {
  let set = new Set();
  let left = 0;
  let maxSize = 0;
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxSize = Math.max(maxSize, right - left + 1);
  }
  return maxSize;
}`,
  pseudoCode: [
    "Initialize left = 0, maxSize = 0, set = empty",
    "For right = 0 to s.length - 1:",
    "  While s[right] is in set:",
    "    Remove s[left] from set, left++",
    "  Add s[right] to set",
    "  maxSize = max(maxSize, right - left + 1)",
    "Return maxSize"
  ],
  steps: [
    {
      line: 4, pseudoLine: 1, explanation: "Initialize sliding window with left=0, right=0.",
      variables: { left: 0, right: 0, maxSize: 0, set: "{}" },
      visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 0, label: ["L", "R"] }
    },
    {
      line: 9, pseudoLine: 5, explanation: "Add 'a' to set. Window size = 1. maxSize = 1.",
      variables: { left: 0, right: 0, maxSize: 1, set: "{'a'}" },
      visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 0, highlight: [0], maxWater: 1, area: 1, label: ["L", "R"] }
    },
    {
      line: 9, pseudoLine: 5, explanation: "Add 'b' to set. Window is 'ab', size = 2. maxSize = 2.",
      variables: { left: 0, right: 1, maxSize: 2, set: "{'a', 'b'}" },
      visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 1, highlight: [0, 1], maxWater: 2, area: 2, label: ["L", "R"] }
    },
    {
      line: 9, pseudoLine: 5, explanation: "Add 'c' to set. Window is 'abc', size = 3. maxSize = 3.",
      variables: { left: 0, right: 2, maxSize: 3, set: "{'a', 'b', 'c'}" },
      visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 2, highlight: [0, 1, 2], maxWater: 3, area: 3, label: ["L", "R"] }
    },
    {
      line: 6, pseudoLine: 3, explanation: "Encountered 'a' at right = 3. It's already in set. Shrink from left.",
      variables: { left: 1, right: 3, set: "{'b', 'c'}" },
      visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 1, right: 3, maxWater: 3, label: ["L", "R"] }
    }
  ]
};

const Problem33DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem33DryRun;
