export const problems56_60 = [
  {
    id: 56,
    title: "Merge Intervals",
    difficulty: "Medium",
    tags: ["Array", "Sorting"],
    input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
    output: "[[1,6],[8,10],[15,18]]",
    code: `function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    let last = res[res.length - 1];
    let curr = intervals[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      res.push(curr);
    }
  }
  return res;
}`,
    pseudoCode: [
      "sort intervals by start time",
      "add first interval to result",
      "for each subsequent interval:",
      "  if overlaps with last in result:",
      "    merge by updating end time",
      "  else:",
      "    add to result",
      "return result"
    ],
    steps: [
      { step: 1, line: 3, pseudoLine: 1, explanation: "Sort intervals based on start time.", visual: { type: "list", items: ["[1,3]", "[2,6]", "[8,10]", "[15,18]"], label: "Sorted Intervals" } },
      { step: 2, line: 4, pseudoLine: 2, explanation: "Initialize result with the first interval.", visual: { type: "list", items: ["[1,3]"], label: "Result Array" } },
      { step: 3, line: 8, pseudoLine: 5, explanation: "If current interval overlaps with the last merged one, extend the last one's end.", visual: { type: "list", items: ["[1,6]"], label: "Merged Result" } },
      { step: 4, line: 11, pseudoLine: 7, explanation: "Otherwise, add the new interval to result.", visual: { type: "list", items: ["[1,6]", "[8,10]", "[15,18]"], label: "Final Result Array" } }
    ]
  },
  {
    id: 57,
    title: "Insert Interval",
    difficulty: "Medium",
    tags: ["Array"],
    input: "intervals = [[1,3],[6,9]], newInterval = [2,5]",
    output: "[[1,5],[6,9]]",
    code: `function insert(intervals, newInterval) {
  const res = [];
  let i = 0;
  while (i < intervals.length && intervals[i][1] < newInterval[0]) {
    res.push(intervals[i]);
    i++;
  }
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  res.push(newInterval);
  while (i < intervals.length) {
    res.push(intervals[i]);
    i++;
  }
  return res;
}`,
    pseudoCode: [
      "add all intervals that end before newInterval starts",
      "merge overlapping intervals into newInterval",
      "add the merged newInterval",
      "add all remaining intervals",
      "return result"
    ],
    steps: [
      { step: 1, line: 4, pseudoLine: 1, explanation: "Add all intervals ending before newInterval starts.", visual: { type: "list", items: ["[1,3]", "[6,9]", "New: [2,5]"], label: "Intervals" } },
      { step: 2, line: 8, pseudoLine: 2, explanation: "Merge overlapping intervals into newInterval.", visual: { type: "list", items: ["[1,5]"], label: "Merged New Interval" } },
      { step: 3, line: 13, pseudoLine: 3, explanation: "Push the merged newInterval.", visual: { type: "list", items: ["[1,5]"], label: "Result" } },
      { step: 4, line: 14, pseudoLine: 4, explanation: "Add remaining intervals.", visual: { type: "list", items: ["[1,5]", "[6,9]"], label: "Final Result" } }
    ]
  },
  {
    id: 58,
    title: "Length of Last Word",
    difficulty: "Easy",
    tags: ["String"],
    input: "s = \"the moon  \"",
    output: "4",
    code: `function lengthOfLastWord(s) {
  let length = 0;
  let i = s.length - 1;
  while (i >= 0 && s[i] === ' ') {
    i--;
  }
  while (i >= 0 && s[i] !== ' ') {
    length++;
    i--;
  }
  return length;
}`,
    pseudoCode: [
      "length = 0",
      "i = string length - 1",
      "while s[i] is space, decrement i",
      "while s[i] is not space:",
      "  length++, decrement i",
      "return length"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize length = 0.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: -1, highlight: [] } },
      { step: 2, line: 3, pseudoLine: 2, explanation: "Start pointer i at the end of the string (index 9).", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 9, highlight: [] } },
      
      { step: 3, line: 4, pseudoLine: 3, explanation: "s[9] is a space (' '). Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 9, highlight: [9] } },
      { step: 4, line: 5, pseudoLine: 3, explanation: "i becomes 8.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 8, highlight: [] } },
      
      { step: 5, line: 4, pseudoLine: 3, explanation: "s[8] is also a space (' '). Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 8, highlight: [8] } },
      { step: 6, line: 5, pseudoLine: 3, explanation: "i becomes 7.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 7, highlight: [] } },
      
      { step: 7, line: 4, pseudoLine: 3, explanation: "s[7] is 'n', which is NOT a space. Loop ends.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 7, highlight: [7] } },
      
      { step: 8, line: 7, pseudoLine: 4, explanation: "Second loop starts counting characters of the last word.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 7, highlight: [] } },
      
      { step: 9, line: 8, pseudoLine: 5, explanation: "Found 'n'. length = 1. Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 7, highlight: [7] }, variables: { length: 1 } },
      { step: 10, line: 9, pseudoLine: 5, explanation: "i becomes 6.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 6, highlight: [7] }, variables: { length: 1 } },

      { step: 11, line: 8, pseudoLine: 5, explanation: "Found 'o'. length = 2. Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 6, highlight: [6, 7] }, variables: { length: 2 } },
      { step: 12, line: 9, pseudoLine: 5, explanation: "i becomes 5.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 5, highlight: [6, 7] }, variables: { length: 2 } },

      { step: 13, line: 8, pseudoLine: 5, explanation: "Found 'o'. length = 3. Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 5, highlight: [5, 6, 7] }, variables: { length: 3 } },
      { step: 14, line: 9, pseudoLine: 5, explanation: "i becomes 4.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 4, highlight: [5, 6, 7] }, variables: { length: 3 } },

      { step: 15, line: 8, pseudoLine: 5, explanation: "Found 'm'. length = 4. Decrement i.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 4, highlight: [4, 5, 6, 7] }, variables: { length: 4 } },
      { step: 16, line: 9, pseudoLine: 5, explanation: "i becomes 3.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 3, highlight: [4, 5, 6, 7] }, variables: { length: 4 } },
      
      { step: 17, line: 7, pseudoLine: 4, explanation: "s[3] is a space (' '). Second loop terminates.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: 3, highlight: [4, 5, 6, 7] }, variables: { length: 4 } },
      
      { step: 18, line: 11, pseudoLine: 6, explanation: "Return the accumulated length: 4.", visual: { type: "array", array: ["t","h","e"," ","m","o","o","n"," "," "], i: -1, highlight: [4, 5, 6, 7] }, variables: { result: "4" } }
    ]
  },
  {
    id: 59,
    title: "Spiral Matrix II",
    difficulty: "Medium",
    tags: ["Array", "Matrix", "Simulation"],
    input: "n = 3",
    output: "[[1,2,3],[8,9,4],[7,6,5]]",
    code: `function generateMatrix(n) {
  const matrix = Array(n).fill().map(() => Array(n).fill(0));
  let top = 0, bottom = n - 1;
  let left = 0, right = n - 1;
  let num = 1;
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) matrix[top][i] = num++;
    top++;
    for (let i = top; i <= bottom; i++) matrix[i][right] = num++;
    right--;
    if (top <= bottom) {
      for (let i = right; i >= left; i--) matrix[bottom][i] = num++;
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) matrix[i][left] = num++;
      left++;
    }
  }
  return matrix;
}`,
    pseudoCode: [
      "matrix = n x n filled with 0",
      "define top, bottom, left, right bounds",
      "num = 1",
      "while bounds are valid:",
      "  fill top row, top++",
      "  fill right col, right--",
      "  fill bottom row, bottom--",
      "  fill left col, left++",
      "return matrix"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize n x n matrix with zeros.", visual: { type: "grid2d", grid: [["0","0","0"],["0","0","0"],["0","0","0"]], label: "Matrix" } },
      { step: 2, line: 7, pseudoLine: 5, explanation: "Fill top row left to right.", visual: { type: "grid2d", grid: [["1","2","3"],["0","0","0"],["0","0","0"]], highlight: [{r:0,c:0},{r:0,c:1},{r:0,c:2}], label: "Top Row" } },
      { step: 3, line: 9, pseudoLine: 6, explanation: "Fill right col top to bottom.", visual: { type: "grid2d", grid: [["1","2","3"],["0","0","4"],["0","0","5"]], highlight: [{r:1,c:2},{r:2,c:2}], label: "Right Col" } },
      { step: 4, line: 12, pseudoLine: 7, explanation: "Fill bottom row right to left.", visual: { type: "grid2d", grid: [["1","2","3"],["0","0","4"],["7","6","5"]], highlight: [{r:2,c:1},{r:2,c:0}], label: "Bottom Row" } },
      { step: 5, line: 16, pseudoLine: 8, explanation: "Fill left col bottom to top.", visual: { type: "grid2d", grid: [["1","2","3"],["8","9","4"],["7","6","5"]], highlight: [{r:1,c:0},{r:1,c:1}], label: "Final Fill" } }
    ]
  },
  {
    id: 60,
    title: "Permutation Sequence",
    difficulty: "Hard",
    tags: ["Math", "Recursion"],
    input: "n = 3, k = 3",
    output: "\"213\"",
    code: `function getPermutation(n, k) {
  const nums = [];
  let fact = 1;
  for (let i = 1; i <= n; i++) {
    nums.push(i);
    fact *= i;
  }
  k--;
  let res = "";
  for (let i = n; i > 0; i--) {
    fact /= i;
    let idx = Math.floor(k / fact);
    res += nums[idx];
    nums.splice(idx, 1);
    k %= fact;
  }
  return res;
}`,
    pseudoCode: [
      "compute factorials up to n and store nums 1 to n",
      "k = k - 1 (make 0-indexed)",
      "for i from n down to 1:",
      "  fact = fact / i",
      "  idx = k // fact",
      "  add nums[idx] to result and remove it from nums",
      "  k = k % fact",
      "return result"
    ],
    steps: [
      { step: 1, line: 4, pseudoLine: 1, explanation: "Precompute factorials and store available numbers.", visual: { type: "list", items: ["nums = [1,2,3]", "fact = 6", "k = 2"], label: "Setup" } },
      { step: 2, line: 8, pseudoLine: 2, explanation: "Convert k to 0-based index.", visual: { type: "list", items: ["k = 2 (0-indexed)"], label: "Math" } },
      { step: 3, line: 11, pseudoLine: 4, explanation: "Calculate size of blocks for permutations (fact /= i).", visual: { type: "list", items: ["fact = 2"], label: "Math" } },
      { step: 4, line: 12, pseudoLine: 5, explanation: "Find which block k falls into to pick the right number.", visual: { type: "text", content: "2", groups: [], result: "Pick 2nd element" } },
      { step: 5, line: 14, pseudoLine: 6, explanation: "Remove used number and reduce k for the next position.", visual: { type: "text", content: "213", groups: [], result: "Final Sequence: 213" } }
    ]
  }
];
