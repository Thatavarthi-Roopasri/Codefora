import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 24,
  title: "Lemonade Change",
  difficulty: "Easy",
  tags: ["Array", "Greedy"],
  input: "bills = [5,5,5,10,20]",
  output: "true",
  code: `function lemonadeChange(bills) {
  let five = 0, ten = 0;
  for (let bill of bills) {
    if (bill === 5) {
      five++;
    } else if (bill === 10) {
      if (five === 0) return false;
      five--;
      ten++;
    } else {
      if (ten > 0 && five > 0) {
        ten--;
        five--;
      } else if (five >= 3) {
        five -= 3;
      } else {
        return false;
      }
    }
  }
  return true;
}`,
  pseudoCode: [
    "Initialize five = 0, ten = 0",
    "For each bill in bills:",
    "  If bill == 5, five++",
    "  If bill == 10, need one 5. If none, false.",
    "  If bill == 20, prefer giving 10+5. Else three 5s.",
    "Return true if all customers served."
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Start with 0 fives and 0 tens.",
      variables: { five: 0, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: -1 }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Customer pays 5. We keep it.",
      variables: { bill: 5, five: 1, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: 0, highlight: [0] }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Customer pays 5. We keep it.",
      variables: { bill: 5, five: 2, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: 1, highlight: [0, 1] }
    },
    {
      line: 5, pseudoLine: 3, explanation: "Customer pays 5. We keep it.",
      variables: { bill: 5, five: 3, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: 2, highlight: [0, 1, 2] }
    },
    {
      line: 9, pseudoLine: 4, explanation: "Customer pays 10. We give one 5 as change.",
      variables: { bill: 10, five: 2, ten: 1 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: 3, highlight: [0, 1, 2, 3] }
    },
    {
      line: 13, pseudoLine: 5, explanation: "Customer pays 20. We give one 10 and one 5 as change.",
      variables: { bill: 20, five: 1, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], i: 4, highlight: [0, 1, 2, 3, 4] }
    },
    {
      line: 21, pseudoLine: 6, explanation: "All customers served successfully!",
      variables: { five: 1, ten: 0 },
      visual: { type: "array", array: [5, 5, 5, 10, 20], highlight: [0,1,2,3,4] }
    }
  ]
};

const Problem24DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem24DryRun;
