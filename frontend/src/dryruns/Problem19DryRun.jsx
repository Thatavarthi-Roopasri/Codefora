import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: "large-factorial",
  title: "Factorial of Large Number",
  difficulty: "Medium",
  tags: ["Math", "Array"],
  input: "N = 5",
  output: "120",
  pseudoCode: [
    "function factorial(N):",
    "  res = [1]",
    "  for x from 2 to N:",
    "    carry = 0",
    "    for i from 0 to res.length - 1:",
    "      prod = res[i] * x + carry",
    "      res[i] = prod % 10",
    "      carry = prod // 10",
    "    while carry > 0:",
    "      res.push(carry % 10)",
    "      carry = carry // 10",
    "  return reverse(res)"
  ],
  steps: [
    { pseudoLine: 2, explanation: "Initialize result array with [1].", visual: { type: "array", array: [1], highlight: [] } },
    { pseudoLine: 6, explanation: "Multiply by 2. prod = 1*2 = 2. Store 2.", visual: { type: "array", array: [2], highlight: [0] } },
    { pseudoLine: 6, explanation: "Multiply by 3. prod = 2*3 = 6. Store 6.", visual: { type: "array", array: [6], highlight: [0] } },
    { pseudoLine: 6, explanation: "Multiply by 4. prod = 6*4 = 24. Store 4, carry 2.", visual: { type: "array", array: [4], highlight: [0] } },
    { pseudoLine: 10, explanation: "Push carry (2) to array.", visual: { type: "array", array: [4, 2], highlight: [1] } },
    { pseudoLine: 6, explanation: "Multiply by 5. 4*5 = 20. Store 0, carry 2.", visual: { type: "array", array: [0, 2], highlight: [0] } },
    { pseudoLine: 6, explanation: "Next digit: 2*5 = 10, plus carry 2 = 12. Store 2, carry 1.", visual: { type: "array", array: [0, 2], highlight: [1] } },
    { pseudoLine: 10, explanation: "Push remaining carry (1).", visual: { type: "array", array: [0, 2, 1], highlight: [2] } },
    { pseudoLine: 12, explanation: "Reverse array to get [1, 2, 0] = 120. Done! ✅", visual: { type: "array", array: [1, 2, 0], highlight: [0, 1, 2] } }
  ]
};

const Problem19DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem19DryRun;
