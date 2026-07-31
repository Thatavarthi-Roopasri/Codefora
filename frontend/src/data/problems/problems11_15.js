export const problems11_15 = [
  // ─────────────────────────────────────────────
  // PROBLEM 11: Remove Duplicates from Sorted Array
  // ─────────────────────────────────────────────
  {
    id: "remove-duplicates",
    title: "Remove Duplicates from Sorted Array",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    input: "nums = [1, 1, 2]",
    output: "2, nums = [1, 2, _]",
    pseudoCode: [
      "function removeDuplicates(nums):",
      "  if nums.length == 0: return 0",
      "  slow = 0",
      "  for fast from 1 to nums.length - 1:",
      "    if nums[fast] != nums[slow]:",
      "      slow++",
      "      nums[slow] = nums[fast]",
      "  return slow + 1"
    ],
    steps: [
      { pseudoLine: 3, explanation: "Initialize slow pointer at 0", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 1, label: ["S", "F"] } },
      { pseudoLine: 5, explanation: "fast=1. nums[1] == nums[0]. Duplicate found, just move fast.", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 2, label: ["S", "F"] } },
      { pseudoLine: 5, explanation: "fast=2. nums[2] (2) != nums[0] (1). New unique element found!", visual: { type: "twopointer", array: [1, 1, 2], left: 0, right: 2, label: ["S", "F"], highlight: [2] } },
      { pseudoLine: 6, explanation: "Increment slow to 1.", visual: { type: "twopointer", array: [1, 1, 2], left: 1, right: 2, label: ["S", "F"], highlight: [2] } },
      { pseudoLine: 7, explanation: "Copy nums[fast] to nums[slow]. Array is updated.", visual: { type: "twopointer", array: [1, 2, 2], left: 1, right: 2, label: ["S", "F"], highlight: [1] } },
      { pseudoLine: 8, explanation: "Loop ends. Return slow + 1 = 2 unique elements. ✅", visual: { type: "twopointer", array: [1, 2, 2], left: 1, right: -1, label: ["S", "F"], success: true, maxWater: "Ans: 2" } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 12: Fibonacci Number
  // ─────────────────────────────────────────────
  {
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
  },

  // ─────────────────────────────────────────────
  // PROBLEM 13: Find Center of Star Graph
  // ─────────────────────────────────────────────
  {
    id: "center-star-graph",
    title: "Find Center of Star Graph",
    difficulty: "Easy",
    tags: ["Graph"],
    input: "edges = [[1,2], [2,3], [4,2]]",
    output: "2",
    pseudoCode: [
      "function findCenter(edges):",
      "  edge1 = edges[0]  // e.g. [1, 2]",
      "  edge2 = edges[1]  // e.g. [2, 3]",
      "  if edge1[0] == edge2[0] or edge1[0] == edge2[1]:",
      "    return edge1[0]",
      "  return edge1[1]"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Look at the first edge: [1, 2]. One of these is the center.", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [1, 2] } },
      { pseudoLine: 3, explanation: "Look at the second edge: [2, 3]. One of these is the center.", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [2, 3] } },
      { pseudoLine: 4, explanation: "The center must be the node that appears in BOTH edges. Node 2 is in both!", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [2], centerFound: 2 } },
      { pseudoLine: 6, explanation: "Return Node 2. ✅", visual: { type: "graph", nodes: [{id: 1, x: "20%", y: "20%", value: 1}, {id: 2, x: "50%", y: "50%", value: 2}, {id: 3, x: "80%", y: "20%", value: 3}, {id: 4, x: "50%", y: "80%", value: 4}], edges: [{from: 1, to: 2}, {from: 2, to: 3}, {from: 4, to: 2}], highlightNodes: [], centerFound: 2 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 14: Pattern 8 (Spiral Number Matrix)
  // ─────────────────────────────────────────────
  {
    id: "pattern-8",
    title: "Pattern 8: Spiral Number Matrix Pattern",
    difficulty: "Medium",
    tags: ["Patterns", "Matrix"],
    input: "n = 3",
    output: "1 2 3\\n8 9 4\\n7 6 5",
    pseudoCode: [
      "function spiralMatrix(n):",
      "  matrix = n x n array",
      "  left=0, right=n-1, top=0, bottom=n-1",
      "  num = 1",
      "  while left <= right and top <= bottom:",
      "    // fill top row",
      "    // fill right col",
      "    // fill bottom row",
      "    // fill left col",
      "  return matrix"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Create a 3x3 empty grid.", visual: { type: "pattern", grid: [[" ", " ", " "], [" ", " ", " "], [" ", " ", " "]] } },
      { pseudoLine: 6, explanation: "Fill top row (left to right)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", " "], [" ", " ", " "]], highlightRow: 0, highlightCol: 2 } },
      { pseudoLine: 7, explanation: "Fill right col (top to bottom)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", "4"], [" ", " ", "5"]], highlightRow: 2, highlightCol: 2 } },
      { pseudoLine: 8, explanation: "Fill bottom row (right to left)", visual: { type: "pattern", grid: [["1", "2", "3"], [" ", " ", "4"], ["7", "6", "5"]], highlightRow: 2, highlightCol: 0 } },
      { pseudoLine: 9, explanation: "Fill left col (bottom to top)", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", " ", "4"], ["7", "6", "5"]], highlightRow: 1, highlightCol: 0 } },
      { pseudoLine: 6, explanation: "Fill inner top row (the final center cell)", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", "9", "4"], ["7", "6", "5"]], highlightRow: 1, highlightCol: 1 } },
      { pseudoLine: 10, explanation: "Done! Matrix is fully populated. ✅", visual: { type: "pattern", grid: [["1", "2", "3"], ["8", "9", "4"], ["7", "6", "5"]], activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 15: Assign Cookies
  // ─────────────────────────────────────────────
  {
    id: "assign-cookies",
    title: "Assign Cookies",
    difficulty: "Easy",
    tags: ["Greedy", "Two Pointers"],
    input: "g = [1,2,3], s = [1,1]",
    output: "1",
    pseudoCode: [
      "function findContentChildren(g, s):",
      "  sort(g); sort(s)",
      "  i = 0, j = 0",
      "  while i < g.length and j < s.length:",
      "    if s[j] >= g[i]:",
      "      i++ // child is content",
      "    j++ // move to next cookie",
      "  return i"
    ],
    steps: [
      { pseudoLine: 3, explanation: "Both arrays are sorted. Start pointers at 0.", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 0, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 0, label2: "j", matches: [] } },
      { pseudoLine: 5, explanation: "s[0] (1) >= g[0] (1). Cookie satisfies child!", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 0, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 0, label2: "j", matches: [[0, 0]] } },
      { pseudoLine: 6, explanation: "Child 0 is content (i++), move to next cookie (j++).", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 1, label2: "j", matches: [[0, 0]] } },
      { pseudoLine: 5, explanation: "s[1] (1) is NOT >= g[1] (2). Cookie is too small.", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 1, label2: "j", matches: [[0, 0]] } },
      { pseudoLine: 7, explanation: "Just move to next cookie (j++).", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: 2, label2: "j", matches: [[0, 0]] } },
      { pseudoLine: 8, explanation: "j is out of bounds. Done! 1 child content. ✅", visual: { type: "doublearray", array1: [1, 2, 3], name1: "Children Greed (g)", ptr1: 1, label1: "i", array2: [1, 1], name2: "Cookie Size (s)", ptr2: -1, label2: "j", matches: [[0, 0]], done: true } }
    ]
  }
];
