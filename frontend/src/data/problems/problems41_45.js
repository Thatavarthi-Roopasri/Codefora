export const problems41_45 = [
  {
    id: 41,
    title: "First Missing Positive",
    difficulty: "Hard",
    tags: ["Array", "Hash Table"],
    input: "nums = [1,2,0]",
    output: "3",
    code: `function firstMissingPositive(nums) {
  let n = nums.length;
  for (let i = 0; i < n; i++) {
    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      let temp = nums[nums[i] - 1];
      nums[nums[i] - 1] = nums[i];
      nums[i] = temp;
    }
  }
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) return i + 1;
  }
  return n + 1;
}`,
    pseudoCode: [
      "n = nums.length",
      "for i from 0 to n-1:",
      "  while nums[i] > 0, <= n, and not at correct index:",
      "    swap nums[i] and nums[nums[i] - 1]",
      "for i from 0 to n-1:",
      "  if nums[i] != i + 1:",
      "    return i + 1",
      "return n + 1"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "n = 3", visual: { type: "array", array: [1,2,0], i: -1, highlight: [] } },
      { step: 2, line: 3, pseudoLine: 3, explanation: "i = 0, nums[0] = 1. nums[0] is in correct place.", visual: { type: "array", array: [1,2,0], i: 0, highlight: [0] } },
      { step: 3, line: 3, pseudoLine: 3, explanation: "i = 1, nums[1] = 2. nums[1] is in correct place.", visual: { type: "array", array: [1,2,0], i: 1, highlight: [1] } },
      { step: 4, line: 3, pseudoLine: 3, explanation: "i = 2, nums[2] = 0. Out of range, ignore.", visual: { type: "array", array: [1,2,0], i: 2, highlight: [2] } },
      { step: 5, line: 10, pseudoLine: 6, explanation: "i = 0, nums[0] == 1. Correct.", visual: { type: "array", array: [1,2,0], i: 0, highlight: [] } },
      { step: 6, line: 10, pseudoLine: 6, explanation: "i = 1, nums[1] == 2. Correct.", visual: { type: "array", array: [1,2,0], i: 1, highlight: [] } },
      { step: 7, line: 10, pseudoLine: 7, explanation: "i = 2, nums[2] == 0. Incorrect! Return 3.", visual: { type: "array", array: [1,2,0], i: 2, highlight: [2] } }
    ]
  },
  {
    id: 42,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
    output: "6",
    code: `function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}`,
    pseudoCode: [
      "left = 0, right = n - 1",
      "leftMax = 0, rightMax = 0",
      "while left < right:",
      "  if height[left] < height[right]:",
      "    update leftMax and water, left++",
      "  else:",
      "    update rightMax and water, right--",
      "return water"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize left=0, right=11", visual: { type: "twopointer", array: [0,1,0,2,1,0,1,3,2,1,2,1], left: 0, right: 11, maxWater: 0, area: null, highlight: [] } },
      { step: 2, line: 3, pseudoLine: 2, explanation: "Initialize leftMax=0, rightMax=0, water=0", visual: { type: "twopointer", array: [0,1,0,2,1,0,1,3,2,1,2,1], left: 0, right: 11, maxWater: 0, area: 0, highlight: [] } },
      { step: 3, line: 5, pseudoLine: 5, explanation: "Process blocks from outside inward, tracking max height seen so far on both sides.", visual: { type: "twopointer", array: [0,1,0,2,1,0,1,3,2,1,2,1], left: 3, right: 7, maxWater: 6, area: 6, highlight: [3, 7] } },
      { step: 4, line: 16, pseudoLine: 8, explanation: "Final trapped water is 6", visual: { type: "twopointer", array: [0,1,0,2,1,0,1,3,2,1,2,1], left: 7, right: 7, maxWater: 6, area: 6, highlight: [], done: true } }
    ]
  },
  {
    id: 43,
    title: "Multiply Strings",
    difficulty: "Medium",
    tags: ["Math", "String", "Simulation"],
    input: "num1 = \"2\", num2 = \"3\"",
    output: "\"6\"",
    code: `function multiply(num1, num2) {
  if (num1 === "0" || num2 === "0") return "0";
  let m = num1.length, n = num2.length;
  let pos = new Array(m + n).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      let mul = (num1[i] - '0') * (num2[j] - '0');
      let p1 = i + j, p2 = i + j + 1;
      let sum = mul + pos[p2];
      pos[p1] += Math.floor(sum / 10);
      pos[p2] = sum % 10;
    }
  }
  while (pos[0] === 0) pos.shift();
  return pos.join('');
}`,
    pseudoCode: [
      "if either is '0', return '0'",
      "pos = array of zeros of size len1 + len2",
      "for each digit in num1 backwards:",
      "  for each digit in num2 backwards:",
      "    multiply digits, add to pos[p2]",
      "    carry over to pos[p1]",
      "remove leading zeros and return as string"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Check if any string is '0'. Both are valid.", visual: { type: "list", items: ["num1: 2", "num2: 3"], label: "Inputs" } },
      { step: 2, line: 4, pseudoLine: 2, explanation: "Create pos array to store digits.", visual: { type: "array", array: [0, 0], highlight: [] } },
      { step: 3, line: 7, pseudoLine: 5, explanation: "Multiply '2' and '3' to get 6.", visual: { type: "array", array: [0, 6], i: 1, highlight: [1] } },
      { step: 4, line: 15, pseudoLine: 7, explanation: "Result is '6'.", visual: { type: "text", content: "6", result: "6", groups: [] } }
    ]
  },
  {
    id: 44,
    title: "Wildcard Matching",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Greedy", "Recursion"],
    input: "s = \"aa\", p = \"*\"",
    output: "true",
    code: `function isMatch(s, p) {
  let sIdx = 0, pIdx = 0;
  let match = 0, starIdx = -1;
  while (sIdx < s.length) {
    if (pIdx < p.length && (p[pIdx] === '?' || s[sIdx] === p[pIdx])) {
      sIdx++; pIdx++;
    } else if (pIdx < p.length && p[pIdx] === '*') {
      starIdx = pIdx;
      match = sIdx;
      pIdx++;
    } else if (starIdx !== -1) {
      pIdx = starIdx + 1;
      match++;
      sIdx = match;
    } else return false;
  }
  while (pIdx < p.length && p[pIdx] === '*') pIdx++;
  return pIdx === p.length;
}`,
    pseudoCode: [
      "sIdx = 0, pIdx = 0, starIdx = -1",
      "while sIdx < s.length:",
      "  if match or '?', advance both",
      "  else if '*', mark starIdx and advance pIdx",
      "  else if starIdx seen, backtrack pIdx and advance sIdx",
      "  else fail",
      "skip trailing '*'",
      "return true if pIdx reached end"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize pointers for string and pattern.", visual: { type: "text", content: "s: aa | p: *", groups: ["sIdx: 0", "pIdx: 0"] } },
      { step: 2, line: 4, pseudoLine: 2, explanation: "Traverse string.", visual: { type: "text", content: "s: aa | p: *", groups: ["sIdx: 0", "pIdx: 0"] } },
      { step: 3, line: 7, pseudoLine: 4, explanation: "Encounter '*', save its index.", visual: { type: "text", content: "s: aa | p: *", groups: ["sIdx: 0", "pIdx: 1", "starIdx: 0"] } },
      { step: 4, line: 11, pseudoLine: 5, explanation: "Use '*' to match characters.", visual: { type: "text", content: "s: aa | p: *", groups: ["sIdx: 2", "pIdx: 1", "starIdx: 0"] } },
      { step: 5, line: 18, pseudoLine: 8, explanation: "String matched completely.", visual: { type: "text", content: "s: aa | p: *", result: "true", groups: [] } }
    ]
  },
  {
    id: 45,
    title: "Jump Game II",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    input: "nums = [2,3,1,1,4]",
    output: "2",
    code: `function jump(nums) {
  let jumps = 0, currentEnd = 0, farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    if (i === currentEnd) {
      jumps++;
      currentEnd = farthest;
    }
  }
  return jumps;
}`,
    pseudoCode: [
      "jumps = 0, currentEnd = 0, farthest = 0",
      "for i from 0 to n-2:",
      "  farthest = max(farthest, i + nums[i])",
      "  if i == currentEnd:",
      "    jumps++, currentEnd = farthest",
      "return jumps"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize variables. jumps=0, currentEnd=0, farthest=0", visual: { type: "array", array: [2,3,1,1,4], i: -1, highlight: [] } },
      { step: 2, line: 4, pseudoLine: 3, explanation: "i=0, nums[0]=2, farthest becomes 2.", visual: { type: "array", array: [2,3,1,1,4], i: 0, highlight: [1, 2] } },
      { step: 3, line: 5, pseudoLine: 5, explanation: "Reach currentEnd(0), jump! jumps=1, currentEnd becomes 2.", visual: { type: "array", array: [2,3,1,1,4], i: 0, highlight: [1, 2] } },
      { step: 4, line: 4, pseudoLine: 3, explanation: "i=1, nums[1]=3, farthest becomes 4.", visual: { type: "array", array: [2,3,1,1,4], i: 1, highlight: [2, 3, 4] } },
      { step: 5, line: 5, pseudoLine: 5, explanation: "i=2, reach currentEnd(2), jump! jumps=2, currentEnd becomes 4.", visual: { type: "array", array: [2,3,1,1,4], i: 2, highlight: [4] } },
      { step: 6, line: 10, pseudoLine: 6, explanation: "Loop ends, return 2 jumps.", visual: { type: "array", array: [2,3,1,1,4], i: 4, highlight: [] } }
    ]
  }
];
