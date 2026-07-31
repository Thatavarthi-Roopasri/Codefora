import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "climbing-stairs",
  title: "Climbing Stairs",
  difficulty: "Easy",
  tags: ["DP"],
  input: "n = 4",
  output: "5",
  pseudoCode: [
    "function climbStairs(n):",
    "  if n <= 2: return n",
    "  dp = array of size n+1",
    "  dp[1] = 1, dp[2] = 2",
    "  for i from 3 to n:",
    "    dp[i] = dp[i-1] + dp[i-2]",
    "  return dp[n]"
  ],
  steps: [
    { pseudoLine: 4, explanation: "Base cases: dp[1] = 1 way (1 step), dp[2] = 2 ways (1+1, or 2).", visual: { type: "dp", table: [{ index: 1, value: 1, computed: true }, { index: 2, value: 2, computed: true }, { index: 3, value: 0, computed: false }, { index: 4, value: 0, computed: false }], activeIndex: -1 } },
    { pseudoLine: 6, explanation: "dp[3] = dp[2] + dp[1] = 2 + 1 = 3", visual: { type: "dp", table: [{ index: 1, value: 1, computed: true }, { index: 2, value: 2, computed: true }, { index: 3, value: 3, computed: true }, { index: 4, value: 0, computed: false }], activeIndex: 3, formula: "dp[3] = 2 + 1" } },
    { pseudoLine: 6, explanation: "dp[4] = dp[3] + dp[2] = 3 + 2 = 5", visual: { type: "dp", table: [{ index: 1, value: 1, computed: true }, { index: 2, value: 2, computed: true }, { index: 3, value: 3, computed: true }, { index: 4, value: 5, computed: true }], activeIndex: 4, formula: "dp[4] = 3 + 2" } },
    { pseudoLine: 7, explanation: "Return dp[4] which is 5. Done! ✅", visual: { type: "dp", table: [{ index: 1, value: 1, computed: true }, { index: 2, value: 2, computed: true }, { index: 3, value: 3, computed: true }, { index: 4, value: 5, computed: true }], activeIndex: 4, result: 5 } }
  ]
};

const Problem17DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem17DryRun;
