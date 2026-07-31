import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 35,
  title: "House Robber",
  difficulty: "Medium",
  tags: ["DP", "Array"],
  input: "nums = [2,7,9,3,1]",
  output: "12",
  code: `function rob(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  let dp = [];
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);
  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
  }
  return dp[nums.length - 1];
}`,
  pseudoCode: [
    "dp[0] = nums[0]",
    "dp[1] = max(nums[0], nums[1])",
    "For i = 2 to nums.length - 1:",
    "  dp[i] = max(dp[i-1], dp[i-2] + nums[i])",
    "Return dp[last]"
  ],
  steps: [
    {
      line: 5, pseudoLine: 1, explanation: "dp[0] is the value of the first house: 2.",
      variables: { "dp[0]": 2 },
      visual: {
        type: "dp",
        table: [
          { index: 0, value: 2, computed: true },
          { index: 1, value: 0, computed: false },
          { index: 2, value: 0, computed: false },
          { index: 3, value: 0, computed: false },
          { index: 4, value: 0, computed: false }
        ],
        activeIndex: 0,
        formula: "dp[0] = nums[0] = 2"
      }
    },
    {
      line: 6, pseudoLine: 2, explanation: "dp[1] = max(2, 7) = 7.",
      variables: { "dp[1]": 7 },
      visual: {
        type: "dp",
        table: [
          { index: 0, value: 2, computed: true },
          { index: 1, value: 7, computed: true },
          { index: 2, value: 0, computed: false },
          { index: 3, value: 0, computed: false },
          { index: 4, value: 0, computed: false }
        ],
        activeIndex: 1,
        formula: "dp[1] = max(nums[0], nums[1]) = 7"
      }
    },
    {
      line: 8, pseudoLine: 4, explanation: "dp[2] = max(dp[1], dp[0] + nums[2]) = max(7, 2 + 9) = 11.",
      variables: { i: 2, "dp[2]": 11 },
      visual: {
        type: "dp",
        table: [
          { index: 0, value: 2, computed: true },
          { index: 1, value: 7, computed: true },
          { index: 2, value: 11, computed: true },
          { index: 3, value: 0, computed: false },
          { index: 4, value: 0, computed: false }
        ],
        activeIndex: 2,
        formula: "dp[2] = max(dp[1], dp[0] + 9) = 11"
      }
    },
    {
      line: 8, pseudoLine: 4, explanation: "dp[3] = max(dp[2], dp[1] + nums[3]) = max(11, 7 + 3) = 11.",
      variables: { i: 3, "dp[3]": 11 },
      visual: {
        type: "dp",
        table: [
          { index: 0, value: 2, computed: true },
          { index: 1, value: 7, computed: true },
          { index: 2, value: 11, computed: true },
          { index: 3, value: 11, computed: true },
          { index: 4, value: 0, computed: false }
        ],
        activeIndex: 3,
        formula: "dp[3] = max(dp[2], dp[1] + 3) = 11"
      }
    },
    {
      line: 8, pseudoLine: 4, explanation: "dp[4] = max(dp[3], dp[2] + nums[4]) = max(11, 11 + 1) = 12.",
      variables: { i: 4, "dp[4]": 12 },
      visual: {
        type: "dp",
        table: [
          { index: 0, value: 2, computed: true },
          { index: 1, value: 7, computed: true },
          { index: 2, value: 11, computed: true },
          { index: 3, value: 11, computed: true },
          { index: 4, value: 12, computed: true }
        ],
        activeIndex: 4,
        formula: "dp[4] = max(dp[3], dp[2] + 1) = 12",
        result: 12
      }
    }
  ]
};

const Problem35DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem35DryRun;
