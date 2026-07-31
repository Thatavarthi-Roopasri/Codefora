import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 29,
  title: "Unique Paths",
  difficulty: "Medium",
  tags: ["DP", "Matrix"],
  input: "m = 3, n = 3",
  output: "6",
  code: `function uniquePaths(m, n) {
  let dp = Array(m).fill().map(() => Array(n).fill(1));
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  return dp[m - 1][n - 1];
}`,
  pseudoCode: [
    "Create m x n DP table filled with 1s",
    "For each row i from 1 to m-1:",
    "  For each col j from 1 to n-1:",
    "    dp[i][j] = dp[i-1][j] + dp[i][j-1]",
    "Return dp[m-1][n-1]"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Initialize DP table with 1s (base case for top row and left col).",
      variables: { m: 3, n: 3 },
      visual: {
        type: "grid2d",
        grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        label: "DP Matrix"
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2.",
      variables: { i: 1, j: 1 },
      visual: {
        type: "grid2d",
        grid: [[1, 1, 1], [1, 2, 1], [1, 1, 1]],
        highlightRow: 1, highlightCol: 1,
        label: "DP Matrix"
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3.",
      variables: { i: 1, j: 2 },
      visual: {
        type: "grid2d",
        grid: [[1, 1, 1], [1, 2, 3], [1, 1, 1]],
        highlightRow: 1, highlightCol: 2,
        label: "DP Matrix"
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3.",
      variables: { i: 2, j: 1 },
      visual: {
        type: "grid2d",
        grid: [[1, 1, 1], [1, 2, 3], [1, 3, 1]],
        highlightRow: 2, highlightCol: 1,
        label: "DP Matrix"
      }
    },
    {
      line: 5, pseudoLine: 4, explanation: "dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6.",
      variables: { i: 2, j: 2 },
      visual: {
        type: "grid2d",
        grid: [[1, 1, 1], [1, 2, 3], [1, 3, 6]],
        highlightRow: 2, highlightCol: 2,
        result: 6,
        label: "DP Matrix"
      }
    }
  ]
};

const Problem29DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem29DryRun;
