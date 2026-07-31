import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "binary-search",
  title: "Binary Search",
  difficulty: "Easy",
  tags: ["Array", "Binary Search"],
  input: "arr = [2, 5, 8, 12, 16], target = 12",
  output: "3",
  pseudoCode: [
    "function binarySearch(arr, target):",
    "  left = 0, right = arr.length - 1",
    "  while left <= right:",
    "    mid = (left + right) // 2",
    "    if arr[mid] == target:",
    "      return mid",
    "    else if arr[mid] < target:",
    "      left = mid + 1",
    "    else:",
    "      right = mid - 1",
    "  return -1"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Start with left=0, right=4. Target is 12.", visual: { type: "twopointer", array: [2, 5, 8, 12, 16], left: 0, right: 4, maxWater: "Target = 12" } },
    { pseudoLine: 4, explanation: "mid = 2. arr[2] is 8.", visual: { type: "twopointer", array: [2, 5, 8, 12, 16], left: 0, right: 4, highlight: [2], maxWater: "Target = 12" } },
    { pseudoLine: 8, explanation: "8 < 12, target must be in right half. left = mid + 1", visual: { type: "twopointer", array: [2, 5, 8, 12, 16], left: 3, right: 4, maxWater: "Target = 12" } },
    { pseudoLine: 4, explanation: "mid = 3. arr[3] is 12.", visual: { type: "twopointer", array: [2, 5, 8, 12, 16], left: 3, right: 4, highlight: [3], maxWater: "Target = 12" } },
    { pseudoLine: 6, explanation: "arr[3] == 12! Found target at index 3. ✅", visual: { type: "twopointer", array: [2, 5, 8, 12, 16], left: 3, right: 3, highlight: [3], success: true, maxWater: "Target = 12" } }
  ]
};

const Problem9DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem9DryRun;
