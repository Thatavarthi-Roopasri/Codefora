import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
  id: 30,
  title: "Sieve of Eratosthenes",
  difficulty: "Medium",
  tags: ["Math", "Array"],
  input: "n = 10",
  output: "[2,3,5,7]",
  code: `function sieve(n) {
  let isPrime = Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let i = p * p; i <= n; i += p) {
        isPrime[i] = false;
      }
    }
  }
  return isPrime.map((p, i) => p ? i : -1).filter(i => i > 0);
}`,
  pseudoCode: [
    "Initialize isPrime array to true",
    "isPrime[0] = isPrime[1] = false",
    "For p = 2 to sqrt(n):",
    "  If isPrime[p] is true:",
    "    Mark all multiples of p as false",
    "Return indices that are still true"
  ],
  steps: [
    {
      line: 2, pseudoLine: 1, explanation: "Initialize isPrime array of size n+1 = 11, filled with true.",
      variables: { n: 10 },
      visual: { type: "array", array: ["T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T"], i: -1, label: "Initialize isPrime array" }
    },
    {
      line: 3, pseudoLine: 2, explanation: "0 and 1 are not prime. Mark isPrime[0] and isPrime[1] as False.",
      variables: { n: 10 },
      visual: { type: "array", array: ["F", "F", "T", "T", "T", "T", "T", "T", "T", "T", "T"], i: 1, highlight: [0, 1], label: "Mark 0 and 1 as False" }
    },
    {
      line: 4, pseudoLine: 3, explanation: "p = 2. isPrime[2] is True, so 2 is a prime number. Mark all its multiples (4, 6, 8, 10) as False.",
      variables: { p: 2 },
      visual: { type: "array", array: ["F", "F", "T", "T", "F", "T", "F", "T", "F", "T", "F"], i: 2, highlight: [4, 6, 8, 10], label: "Sieve multiples of 2" }
    },
    {
      line: 4, pseudoLine: 3, explanation: "p = 3. isPrime[3] is True, so 3 is a prime number. Mark all its multiples starting from 3*3=9 as False.",
      variables: { p: 3 },
      visual: { type: "array", array: ["F", "F", "T", "T", "F", "T", "F", "T", "F", "F", "F"], i: 3, highlight: [9], label: "Sieve multiples of 3" }
    },
    {
      line: 4, pseudoLine: 3, explanation: "p = 4. Since p*p (16) > n (10), the loop terminates. Multiples of primes up to sqrt(n) have been crossed out.",
      variables: { p: 4 },
      visual: { type: "array", array: ["F", "F", "T", "T", "F", "T", "F", "T", "F", "F", "F"], i: 4, label: "Loop ends: p * p > n" }
    },
    {
      line: 11, pseudoLine: 6, explanation: "Collect indices whose value is still True. These are the prime numbers: [2, 3, 5, 7].",
      variables: { result: "[2, 3, 5, 7]" },
      visual: { type: "array", array: ["F", "F", "2", "3", "F", "5", "F", "7", "F", "F", "F"], highlight: [2, 3, 5, 7], label: "Return primes list" }
    }
  ]
};

const Problem30DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem30DryRun;
