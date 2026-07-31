import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "remove-duplicates",
  title: "Remove Duplicates from Sorted Array",
  difficulty: "Easy",
  tags: ["Array", "Two Pointers"],
  input: "nums = [1, 1, 2]",
  output: "2, nums = [1, 2, _]",
  pseudoCode: [
    "function removeDuplicates(nums):",
    "  if nums.length == 0: return 0",
    "  slow = 0",
    "  for fast from 1 to nums.length - 1:",
    "    if nums[fast] != nums[slow]:",
    "      slow++",
    "      nums[slow] = nums[fast]",
    "  return slow + 1"
  ],
  steps: [
    { pseudoLine: 3, explanation: "Initialize slow pointer at 0", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 1, label: ["S", "F"] } },
    { pseudoLine: 5, explanation: "fast=1. nums[1] == nums[0]. Duplicate found, just move fast.", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 2, label: ["S", "F"] } },
    { pseudoLine: 5, explanation: "fast=2. nums[2] (2) != nums[0] (1). New unique element found!", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 2, label: ["S", "F"], highlight: [2] } },
    { pseudoLine: 6, explanation: "Increment slow to 1.", visual: { type: "twopointer", array: [1, 1, 2], left: 1, right: 2, label: ["S", "F"], highlight: [2] } },
    { pseudoLine: 7, explanation: "Copy nums[fast] to nums[slow]. Array is updated.", visual: { type: "twopointer", array: [1, 2, 2], left: 1, right: 2, label: ["S", "F"], highlight: [1] } },
    { pseudoLine: 8, explanation: "Loop ends. Return slow + 1 = 2 unique elements. ✅", visual: { type: "twopointer", array: [1, 2, 2], left: 1, right: -1, label: ["S", "F"], success: true, maxWater: "Ans: 2" } }
  ]
};

const Problem11DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem11DryRun;
