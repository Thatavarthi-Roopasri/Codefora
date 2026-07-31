export const problems6_10 = [
  // ─────────────────────────────────────────────
  // PROBLEM 6: Pattern 7 (Floyd's Triangle)
  // ─────────────────────────────────────────────
  {
    id: "pattern-7",
    title: "Pattern 7: Floyd's Triangle of Numbers",
    difficulty: "Medium",
    tags: ["Patterns"],
    input: "n = 3",
    output: "1\\n2 3\\n4 5 6",
    pseudoCode: [
      "function floydsTriangle(n):",
      "  num = 1",
      "  for i from 1 to n:",
      "    for j from 1 to i:",
      "      print(num + ' ')",
      "      num++",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start with num = 1", visual: { type: "pattern", grid: [], activeRow: 0 } },
      { pseudoLine: 5, explanation: "Row 1: Print '1 '", visual: { type: "pattern", grid: [["1", " "]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
      { pseudoLine: 5, explanation: "Row 2: Print '2 '", visual: { type: "pattern", grid: [["1", " "], ["2", " "]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
      { pseudoLine: 5, explanation: "Row 2: Print '3 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
      { pseudoLine: 5, explanation: "Row 3: Print '4 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " "]], highlightRow: 2, highlightCol: 1, activeRow: 2 } },
      { pseudoLine: 5, explanation: "Row 3: Print '5 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " "]], highlightRow: 2, highlightCol: 3, activeRow: 2 } },
      { pseudoLine: 5, explanation: "Row 3: Print '6 '", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " ", "6", " "]], highlightRow: 2, highlightCol: 5, activeRow: 2 } },
      { pseudoLine: 7, explanation: "Done! Floyd's Triangle complete ✅", visual: { type: "pattern", grid: [["1", " "], ["2", " ", "3", " "], ["4", " ", "5", " ", "6", " "]], activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 7: Reverse String
  // ─────────────────────────────────────────────
  {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "Easy",
    tags: ["Strings", "Two Pointers"],
    input: "s = ['h','e','l','l','o']",
    output: "['o','l','l','e','h']",
    pseudoCode: [
      "function reverseString(s):",
      "  left = 0, right = s.length - 1",
      "  while left < right:",
      "    swap(s[left], s[right])",
      "    left++",
      "    right--"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Set left=0, right=4", visual: { type: "twopointer", array: ['h','e','l','l','o'], left: 0, right: 4 } },
      { pseudoLine: 4, explanation: "Swap 'h' and 'o'", visual: { type: "twopointer", array: ['o','e','l','l','h'], left: 0, right: 4, highlight: [0, 4] } },
      { pseudoLine: 5, explanation: "Move pointers inwards", visual: { type: "twopointer", array: ['o','e','l','l','h'], left: 1, right: 3 } },
      { pseudoLine: 4, explanation: "Swap 'e' and 'l'", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 1, right: 3, highlight: [1, 3] } },
      { pseudoLine: 5, explanation: "Move pointers inwards. left=2, right=2", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 2, right: 2 } },
      { pseudoLine: 3, explanation: "left == right, loop ends. Done! ✅", visual: { type: "twopointer", array: ['o','l','l','e','h'], left: 2, right: 2, success: true } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 8: FizzBuzz
  // ─────────────────────────────────────────────
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "Easy",
    tags: ["Math", "Simulation"],
    input: "n = 5",
    output: "['1','2','Fizz','4','Buzz']",
    pseudoCode: [
      "function fizzBuzz(n):",
      "  ans = []",
      "  for i from 1 to n:",
      "    if i % 3 == 0 and i % 5 == 0: ans.push('FizzBuzz')",
      "    else if i % 3 == 0: ans.push('Fizz')",
      "    else if i % 5 == 0: ans.push('Buzz')",
      "    else: ans.push(str(i))",
      "  return ans"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start with empty array.", visual: { type: "array", array: [], i: -1 } },
      { pseudoLine: 7, explanation: "i=1. Append '1'", visual: { type: "array", array: ["1"], highlight: [0] } },
      { pseudoLine: 7, explanation: "i=2. Append '2'", visual: { type: "array", array: ["1", "2"], highlight: [1] } },
      { pseudoLine: 5, explanation: "i=3. Divisible by 3! Append 'Fizz'", visual: { type: "array", array: ["1", "2", "Fizz"], highlight: [2] } },
      { pseudoLine: 7, explanation: "i=4. Append '4'", visual: { type: "array", array: ["1", "2", "Fizz", "4"], highlight: [3] } },
      { pseudoLine: 6, explanation: "i=5. Divisible by 5! Append 'Buzz'", visual: { type: "array", array: ["1", "2", "Fizz", "4", "Buzz"], highlight: [4] } },
      { pseudoLine: 8, explanation: "Done! ✅", visual: { type: "array", array: ["1", "2", "Fizz", "4", "Buzz"], highlight: [] } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 9: Binary Search
  // ─────────────────────────────────────────────
  {
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
  },

  // ─────────────────────────────────────────────
  // PROBLEM 10: Pattern 5 (Diamond)
  // ─────────────────────────────────────────────
  {
    id: "pattern-5",
    title: "Pattern 5: Diamond Star Pattern",
    difficulty: "Medium",
    tags: ["Patterns"],
    input: "n = 3",
    output: "  *  \\n *** \\n*****\\n *** \\n  *  ",
    pseudoCode: [
      "function diamondPattern(n):",
      "  // Upper half (including middle)",
      "  for i from 1 to n:",
      "    print spaces (n - i)",
      "    print stars (2*i - 1)",
      "  // Lower half",
      "  for i from n-1 down to 1:",
      "    print spaces (n - i)",
      "    print stars (2*i - 1)"
    ],
    steps: [
      { pseudoLine: 3, explanation: "Upper half. Row i=1", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
      { pseudoLine: 3, explanation: "Row i=2", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
      { pseudoLine: 3, explanation: "Row i=3 (middle)", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"]], highlightRow: 2, highlightCol: 4, activeRow: 2 } },
      { pseudoLine: 7, explanation: "Lower half. Row i=2", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "]], highlightRow: 3, highlightCol: 3, activeRow: 3 } },
      { pseudoLine: 7, explanation: "Row i=1", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "], [" ", " ", "*", " ", " "]], highlightRow: 4, highlightCol: 2, activeRow: 4 } },
      { pseudoLine: 9, explanation: "Done! Diamond complete ✅", visual: { type: "pattern", grid: [[" ", " ", "*", " ", " "], [" ", "*", "*", "*", " "], ["*", "*", "*", "*", "*"], [" ", "*", "*", "*", " "], [" ", " ", "*", " ", " "]], activeRow: -1 } }
    ]
  }
];
