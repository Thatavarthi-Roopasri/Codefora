export const problems16_20 = [
  // ─────────────────────────────────────────────
  // PROBLEM 16: Valid Palindrome
  // ─────────────────────────────────────────────
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    tags: ["Strings", "Two Pointers"],
    input: "s = 'radar'",
    output: "true",
    pseudoCode: [
      "function isPalindrome(s):",
      "  left = 0, right = s.length - 1",
      "  while left < right:",
      "    if s[left] != s[right]:",
      "      return false",
      "    left++",
      "    right--",
      "  return true"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start left at 0, right at 4", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 0, right: 4 } },
      { pseudoLine: 4, explanation: "s[left] == 'r', s[right] == 'r'. They match!", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 0, right: 4, highlight: [0, 4] } },
      { pseudoLine: 6, explanation: "Move pointers inwards.", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 1, right: 3 } },
      { pseudoLine: 4, explanation: "s[left] == 'a', s[right] == 'a'. They match!", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 1, right: 3, highlight: [1, 3] } },
      { pseudoLine: 6, explanation: "Move pointers inwards.", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 2, right: 2 } },
      { pseudoLine: 8, explanation: "left == right, loop ends. It's a palindrome! ✅", visual: { type: "twopointer", array: ['r','a','d','a','r'], left: 2, right: 2, success: true, maxWater: "Ans: true" } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 17: Climbing Stairs
  // ─────────────────────────────────────────────
  {
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
  },

  // ─────────────────────────────────────────────
  // PROBLEM 18: Maximum Depth of Binary Tree
  // ─────────────────────────────────────────────
  {
    id: "max-depth-binary-tree",
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    tags: ["Trees", "DFS"],
    input: "root = [3,9,20,null,null,15,7]",
    output: "3",
    pseudoCode: [
      "function maxDepth(root):",
      "  if root is NULL:",
      "    return 0",
      "  leftDepth = maxDepth(root.left)",
      "  rightDepth = maxDepth(root.right)",
      "  return max(leftDepth, rightDepth) + 1"
    ],
    steps: [
      { pseudoLine: 4, explanation: "Start at root (3). Recursively find maxDepth of left child (9).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "Current", value: 3 }], pointers: { curr: "n1", next: "left" }, highlights: ["n1", "n2"] } },
      { pseudoLine: 6, explanation: "Node 9 is a leaf. Its depth is 1. Back to 3, now check right (20).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "LeftDepth", value: 1 }], pointers: { curr: "n1", next: "right" }, highlights: ["n1", "n3"] } },
      { pseudoLine: 4, explanation: "At 20. Check left child (15).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "Current", value: 20 }], pointers: { curr: "n3", next: "left" }, highlights: ["n3", "n4"] } },
      { pseudoLine: 5, explanation: "Node 15 returns 1. Now check right child (7).", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5" }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null }], boxes: [{ label: "LeftDepth(20)", value: 1 }], pointers: { curr: "n3", next: "right" }, highlights: ["n3", "n5"] } },
      { pseudoLine: 6, explanation: "Node 7 returns 1. Node 20's depth = max(1,1) + 1 = 2.", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3" }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5", done: true }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null, done: true }], boxes: [{ label: "Depth(20)", value: 2 }], pointers: { curr: "n3" }, highlights: ["n3"] } },
      { pseudoLine: 6, explanation: "Back to root 3. Depth = max(1, 2) + 1 = 3. Done! ✅", visual: { type: "tree", nodes: [{ id: "n1", value: 3, left: "n2", right: "n3", done: true }, { id: "n2", value: 9, left: null, right: null, done: true }, { id: "n3", value: 20, left: "n4", right: "n5", done: true }, { id: "n4", value: 15, left: null, right: null, done: true }, { id: "n5", value: 7, left: null, right: null, done: true }], boxes: [{ label: "Ans", value: 3 }], pointers: { curr: "n1" }, highlights: ["n1"], success: true } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 19: Factorial of Large Number
  // ─────────────────────────────────────────────
  {
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
  },

  // ─────────────────────────────────────────────
  // PROBLEM 20: Two Sum
  // ─────────────────────────────────────────────
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    input: "nums = [2,7,11,15], target = 9",
    output: "[0, 1]",
    pseudoCode: [
      "function twoSum(nums, target):",
      "  map = {}",
      "  for i from 0 to nums.length - 1:",
      "    diff = target - nums[i]",
      "    if map.has(diff):",
      "      return [map[diff], i]",
      "    map[nums[i]] = i",
      "  return []"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start with empty hash map.", visual: { type: "hashmap", array: [2, 7, 11, 15], map: {}, i: -1 } },
      { pseudoLine: 4, explanation: "i=0, nums[0]=2. Target 9 - 2 = 7. Is 7 in map? No.", visual: { type: "hashmap", array: [2, 7, 11, 15], map: {}, i: 0 } },
      { pseudoLine: 7, explanation: "Add 2 to map with index 0.", visual: { type: "hashmap", array: [2, 7, 11, 15], map: { "2": 0 }, i: 0 } },
      { pseudoLine: 4, explanation: "i=1, nums[1]=7. Target 9 - 7 = 2. Is 2 in map? Yes!", visual: { type: "hashmap", array: [2, 7, 11, 15], map: { "2": 0 }, i: 1 } },
      { pseudoLine: 6, explanation: "Found a pair: index map[2]=0 and i=1. Return [0, 1]! ✅", visual: { type: "hashmap", array: [2, 7, 11, 15], map: { "2": 0 }, i: 1, success: true, highlight: [0, 1] } }
    ]
  }
];
