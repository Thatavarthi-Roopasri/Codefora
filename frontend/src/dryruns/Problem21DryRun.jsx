import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 21,
  title: "Search Insert Position",
  difficulty: "Easy",
  tags: ["Array", "Binary Search"],
  input: "nums = [1,3,5,6], target = 5",
  output: "2",
  code: `function searchInsert(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}`,
  pseudoCode: [
    "Initialize left = 0, right = nums.length - 1",
    "While left <= right:",
    "  mid = floor((left + right) / 2)",
    "  If nums[mid] == target, return mid",
    "  If nums[mid] < target, left = mid + 1",
    "  Else right = mid - 1",
    "Return left"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Initialize pointers left at 0 and right at end of array.",
      variables: { left: 0, right: 3, target: 5 },
      visual: { type: "twopointer", array: [1, 3, 5, 6], left: 0, right: 3, label: ["left", "right"] }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Calculate mid = floor((0 + 3) / 2) = 1. Value at mid is 3.",
      variables: { left: 0, right: 3, mid: 1, nums_mid: 3, target: 5 },
      visual: { type: "twopointer", array: [1, 3, 5, 6], left: 0, right: 3, highlight: [1], label: ["left", "right"] }
    },
    {
      line: 7, pseudoLine: 5, explanation: "Since 3 < target (5), we move left to mid + 1 = 2.",
      variables: { left: 2, right: 3, mid: 1, target: 5 },
      visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, label: ["left", "right"] }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Calculate mid = floor((2 + 3) / 2) = 2. Value at mid is 5.",
      variables: { left: 2, right: 3, mid: 2, nums_mid: 5, target: 5 },
      visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, highlight: [2], label: ["left", "right"] }
    },
    {
      line: 6, pseudoLine: 4, explanation: "Target found at index 2! We return 2.",
      variables: { left: 2, right: 3, mid: 2, target: 5 },
      visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, highlight: [2], success: true, label: ["left", "right"] }
    }
  ]
};

const Problem21DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem21DryRun;
