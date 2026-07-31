import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "fibonacci",
  title: "Fibonacci Number",
  difficulty: "Easy",
  tags: ["Math", "DP"],
  input: "n = 4",
  output: "3",
  pseudoCode: [
    "function fib(n):",
    "  if n <= 1: return n",
    "  dp = array of size n+1",
    "  dp[0] = 0, dp[1] = 1",
    "  for i from 2 to n:",
    "    dp[i] = dp[i-1] + dp[i-2]",
    "  return dp[n]"
  ],
  steps: [
    { pseudoLine: 4, explanation: "Initialize base cases: dp[0]=0, dp[1]=1.", visual: { type: "dp", table: [{ index: 0, value: 0, computed: true }, { index: 1, value: 1, computed: true }, { index: 2, value: 0, computed: false }, { index: 3, value: 0, computed: false }, { index: 4, value: 0, computed: false }], activeIndex: -1 } },
    { pseudoLine: 6, explanation: "dp[2] = dp[1] + dp[0] = 1 + 0 = 1", visual: { type: "dp", table: [{ index: 0, value: 0, computed: true }, { index: 1, value: 1, computed: true }, { index: 2, value: 1, computed: true }, { index: 3, value: 0, computed: false }, { index: 4, value: 0, computed: false }], activeIndex: 2, formula: "dp[2] = 1 + 0" } },
    { pseudoLine: 6, explanation: "dp[3] = dp[2] + dp[1] = 1 + 1 = 2", visual: { type: "dp", table: [{ index: 0, value: 0, computed: true }, { index: 1, value: 1, computed: true }, { index: 2, value: 1, computed: true }, { index: 3, value: 2, computed: true }, { index: 4, value: 0, computed: false }], activeIndex: 3, formula: "dp[3] = 1 + 1" } },
    { pseudoLine: 6, explanation: "dp[4] = dp[3] + dp[2] = 2 + 1 = 3", visual: { type: "dp", table: [{ index: 0, value: 0, computed: true }, { index: 1, value: 1, computed: true }, { index: 2, value: 1, computed: true }, { index: 3, value: 2, computed: true }, { index: 4, value: 3, computed: true }], activeIndex: 4, formula: "dp[4] = 2 + 1" } },
    { pseudoLine: 7, explanation: "Return dp[4] which is 3. ✅", visual: { type: "dp", table: [{ index: 0, value: 0, computed: true }, { index: 1, value: 1, computed: true }, { index: 2, value: 1, computed: true }, { index: 3, value: 2, computed: true }, { index: 4, value: 3, computed: true }], activeIndex: 4, result: 3 } }
  ]
};

const Problem12DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem12DryRun;
