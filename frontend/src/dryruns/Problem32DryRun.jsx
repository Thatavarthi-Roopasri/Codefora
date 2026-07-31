import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 32,
  title: "Container With Most Water",
  difficulty: "Medium",
  tags: ["Array", "Two Pointers"],
  input: "height = [1,8,6,2,5,4,8,3,7]",
  output: "49",
  code: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;
  while (left < right) {
    let width = right - left;
    let minH = Math.min(height[left], height[right]);
    let area = width * minH;
    maxArea = Math.max(maxArea, area);
    if (height[left] < height[right]) left++;
    else right--;
  }
  return maxArea;
}`,
  pseudoCode: [
    "Initialize left = 0, right = height.length - 1, maxArea = 0",
    "While left < right:",
    "  width = right - left",
    "  minHeight = min(height[left], height[right])",
    "  currentArea = width * minHeight",
    "  maxArea = max(maxArea, currentArea)",
    "  Move the pointer pointing to the shorter line inward",
    "Return maxArea"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Initialize left at 0, right at 8. maxArea = 0.",
      variables: { left: 0, right: 8, maxArea: 0 },
      visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 0, right: 8, label: ["left", "right"] }
    },
    {
      line: 7, pseudoLine: 4, explanation: "Width = 8, minHeight = min(1, 7) = 1. Area = 8 * 1 = 8. maxArea = 8.",
      variables: { left: 0, right: 8, width: 8, minH: 1, area: 8, maxArea: 8 },
      visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 0, right: 8, highlight: [0, 8], maxWater: 8, area: 8, label: ["left", "right"] }
    },
    {
      line: 9, pseudoLine: 7, explanation: "height[left] (1) < height[right] (7). Increment left pointer.",
      variables: { left: 1, right: 8, maxArea: 8 },
      visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 8, maxWater: 8, label: ["left", "right"] }
    },
    {
      line: 7, pseudoLine: 4, explanation: "Width = 7, minHeight = min(8, 7) = 7. Area = 7 * 7 = 49. Update maxArea to 49.",
      variables: { left: 1, right: 8, width: 7, minH: 7, area: 49, maxArea: 49 },
      visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 8, highlight: [1, 8], maxWater: 49, area: 49, label: ["left", "right"] }
    },
    {
      line: 10, pseudoLine: 7, explanation: "height[left] (8) >= height[right] (7). Decrement right pointer.",
      variables: { left: 1, right: 7, maxArea: 49 },
      visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 7, maxWater: 49, label: ["left", "right"] }
    }
  ]
};

const Problem32DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem32DryRun;
