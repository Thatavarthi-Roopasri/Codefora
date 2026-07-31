export const problems31_35 = [
  // ─────────────────────────────────────────────
  // PROBLEM 31: Binary Tree Level Order Traversal
  // ─────────────────────────────────────────────
  {
    id: 31,
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    tags: ["Tree", "BFS"],
    input: "root = [3,9,20,null,null,15,7]",
    output: "[[3],[9,20],[15,7]]",
    code: `function levelOrder(root) {
  if (!root) return [];
  let result = [];
  let queue = [root];
  while (queue.length > 0) {
    let levelSize = queue.length;
    let currentLevel = [];
    for (let i = 0; i < levelSize; i++) {
      let node = queue.shift();
      currentLevel.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(currentLevel);
  }
  return result;
}`,
    pseudoCode: [
      "If root is null return empty list",
      "Initialize queue = [root], result = []",
      "While queue is not empty:",
      "  levelSize = queue.length, currentLevel = []",
      "  For i = 0 to levelSize - 1:",
      "    node = dequeue()",
      "    Add node.val to currentLevel",
      "    Enqueue node.left and node.right if they exist",
      "  Add currentLevel to result"
    ],
    steps: [
      {
        line: 3, pseudoLine: 2, explanation: "Initialize queue with root node [3].",
        variables: { queue: "[3]", result: "[]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "3", value: "3", left: "9", right: "20" },
            { id: "9", value: "9" },
            { id: "20", value: "20", left: "15", right: "7" },
            { id: "15", value: "15" },
            { id: "7", value: "7" }
          ],
          pointers: { curr: "3" },
          boxes: [{ label: "Queue", value: "[3]" }, { label: "Result", value: "[]" }]
        }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Processing Level 0. Dequeue 3. Queue becomes [].",
        variables: { levelSize: 1, currentLevel: "[3]", queue: "[]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "3", value: "3", left: "9", right: "20" },
            { id: "9", value: "9" },
            { id: "20", value: "20", left: "15", right: "7" },
            { id: "15", value: "15" },
            { id: "7", value: "7" }
          ],
          highlights: ["3"],
          boxes: [{ label: "Queue", value: "[]" }, { label: "Level", value: "[3]" }]
        }
      },
      {
        line: 9, pseudoLine: 8, explanation: "Enqueue left (9) and right (20) children. Queue is [9, 20].",
        variables: { queue: "[9, 20]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "3", value: "3", left: "9", right: "20" },
            { id: "9", value: "9" },
            { id: "20", value: "20", left: "15", right: "7" },
            { id: "15", value: "15" },
            { id: "7", value: "7" }
          ],
          highlights: ["3"],
          boxes: [{ label: "Queue", value: "[9, 20]" }, { label: "Level", value: "[3]" }]
        }
      },
      {
        line: 12, pseudoLine: 9, explanation: "Finish level. Add [3] to result.",
        variables: { result: "[[3]]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "3", value: "3", left: "9", right: "20" },
            { id: "9", value: "9" },
            { id: "20", value: "20", left: "15", right: "7" },
            { id: "15", value: "15" },
            { id: "7", value: "7" }
          ],
          highlights: ["3"],
          boxes: [{ label: "Queue", value: "[9, 20]" }, { label: "Result", value: "[[3]]" }]
        }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Processing Level 1. Dequeue 9, then 20. Enqueue children (15, 7).",
        variables: { levelSize: 2, currentLevel: "[9, 20]", queue: "[15, 7]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "3", value: "3", left: "9", right: "20" },
            { id: "9", value: "9" },
            { id: "20", value: "20", left: "15", right: "7" },
            { id: "15", value: "15" },
            { id: "7", value: "7" }
          ],
          highlights: ["9", "20"],
          boxes: [{ label: "Queue", value: "[15, 7]" }, { label: "Result", value: "[[3], [9,20]]" }]
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 32: Container With Most Water
  // ─────────────────────────────────────────────
  {
    id: 32,
    title: "Container With Most Water",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers"],
    input: "height = [1,8,6,2,5,4,8,3,7]",
    output: "49",
    code: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;
  while (left < right) {
    let width = right - left;
    let minH = Math.min(height[left], height[right]);
    let area = width * minH;
    maxArea = Math.max(maxArea, area);
    if (height[left] < height[right]) left++;
    else right--;
  }
  return maxArea;
}`,
    pseudoCode: [
      "Initialize left = 0, right = height.length - 1, maxArea = 0",
      "While left < right:",
      "  width = right - left",
      "  minHeight = min(height[left], height[right])",
      "  currentArea = width * minHeight",
      "  maxArea = max(maxArea, currentArea)",
      "  Move the pointer pointing to the shorter line inward",
      "Return maxArea"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Initialize left at 0, right at 8. maxArea = 0.",
        variables: { left: 0, right: 8, maxArea: 0 },
        visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 0, right: 8, label: ["left", "right"] }
      },
      {
        line: 7, pseudoLine: 4, explanation: "Width = 8, minHeight = min(1, 7) = 1. Area = 8 * 1 = 8. maxArea = 8.",
        variables: { left: 0, right: 8, width: 8, minH: 1, area: 8, maxArea: 8 },
        visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 0, right: 8, highlight: [0, 8], maxWater: 8, area: 8, label: ["left", "right"] }
      },
      {
        line: 9, pseudoLine: 7, explanation: "height[left] (1) < height[right] (7). Increment left pointer.",
        variables: { left: 1, right: 8, maxArea: 8 },
        visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 8, maxWater: 8, label: ["left", "right"] }
      },
      {
        line: 7, pseudoLine: 4, explanation: "Width = 7, minHeight = min(8, 7) = 7. Area = 7 * 7 = 49. Update maxArea to 49.",
        variables: { left: 1, right: 8, width: 7, minH: 7, area: 49, maxArea: 49 },
        visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 8, highlight: [1, 8], maxWater: 49, area: 49, label: ["left", "right"] }
      },
      {
        line: 10, pseudoLine: 7, explanation: "height[left] (8) >= height[right] (7). Decrement right pointer.",
        variables: { left: 1, right: 7, maxArea: 49 },
        visual: { type: "twopointer", array: [1, 8, 6, 2, 5, 4, 8, 3, 7], left: 1, right: 7, maxWater: 49, label: ["left", "right"] }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 33: Longest Substring Without Repeating Characters
  // ─────────────────────────────────────────────
  {
    id: 33,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["String", "Two Pointers", "Sliding Window"],
    input: "s = \"abcabcbb\"",
    output: "3",
    code: `function lengthOfLongestSubstring(s) {
  let set = new Set();
  let left = 0;
  let maxSize = 0;
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxSize = Math.max(maxSize, right - left + 1);
  }
  return maxSize;
}`,
    pseudoCode: [
      "Initialize left = 0, maxSize = 0, set = empty",
      "For right = 0 to s.length - 1:",
      "  While s[right] is in set:",
      "    Remove s[left] from set, left++",
      "  Add s[right] to set",
      "  maxSize = max(maxSize, right - left + 1)",
      "Return maxSize"
    ],
    steps: [
      {
        line: 4, pseudoLine: 1, explanation: "Initialize sliding window with left=0, right=0.",
        variables: { left: 0, right: 0, maxSize: 0, set: "{}" },
        visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 0, label: ["L", "R"] }
      },
      {
        line: 9, pseudoLine: 5, explanation: "Add 'a' to set. Window size = 1. maxSize = 1.",
        variables: { left: 0, right: 0, maxSize: 1, set: "{'a'}" },
        visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 0, highlight: [0], maxWater: 1, area: 1, label: ["L", "R"] }
      },
      {
        line: 9, pseudoLine: 5, explanation: "Add 'b' to set. Window is 'ab', size = 2. maxSize = 2.",
        variables: { left: 0, right: 1, maxSize: 2, set: "{'a', 'b'}" },
        visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 1, highlight: [0, 1], maxWater: 2, area: 2, label: ["L", "R"] }
      },
      {
        line: 9, pseudoLine: 5, explanation: "Add 'c' to set. Window is 'abc', size = 3. maxSize = 3.",
        variables: { left: 0, right: 2, maxSize: 3, set: "{'a', 'b', 'c'}" },
        visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 0, right: 2, highlight: [0, 1, 2], maxWater: 3, area: 3, label: ["L", "R"] }
      },
      {
        line: 6, pseudoLine: 3, explanation: "Encountered 'a' at right = 3. It's already in set. Shrink from left.",
        variables: { left: 1, right: 3, set: "{'b', 'c'}" },
        visual: { type: "twopointer", array: ["a", "b", "c", "a", "b", "c", "b", "b"], left: 1, right: 3, maxWater: 3, label: ["L", "R"] }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 34: Validate Binary Search Tree
  // ─────────────────────────────────────────────
  {
    id: 34,
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    tags: ["Tree", "DFS"],
    input: "root = [2,1,3]",
    output: "true",
    code: `function isValidBST(root) {
  function validate(node, low, high) {
    if (!node) return true;
    if ((low !== null && node.val <= low) || (high !== null && node.val >= high)) {
      return false;
    }
    return validate(node.left, low, node.val) && validate(node.right, node.val, high);
  }
  return validate(root, null, null);
}`,
    pseudoCode: [
      "Define validate(node, low, high):",
      "  If node is null return true",
      "  If node.val <= low or node.val >= high return false",
      "  Return validate(node.left, low, node.val) AND validate(node.right, node.val, high)",
      "Call validate(root, null, null)"
    ],
    steps: [
      {
        line: 9, pseudoLine: 5, explanation: "Validate root node 2 with range (-Infinity, Infinity).",
        variables: { node: 2, low: "null", high: "null" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "2", left: "2", right: "3" },
            { id: "2", value: "1" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "1" },
          boxes: [{ label: "Range", value: "(-∞, +∞)" }]
        }
      },
      {
        line: 7, pseudoLine: 4, explanation: "Validate left child 1. Allowed range is (-Infinity, 2). 1 is valid.",
        variables: { node: 1, low: "null", high: 2 },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "2", left: "2", right: "3" },
            { id: "2", value: "1" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "2" },
          highlights: ["2"],
          boxes: [{ label: "Range", value: "(-∞, 2)" }]
        }
      },
      {
        line: 7, pseudoLine: 4, explanation: "Validate right child 3. Allowed range is (2, Infinity). 3 is valid.",
        variables: { node: 3, low: 2, high: "null" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "2", left: "2", right: "3" },
            { id: "2", value: "1" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "3" },
          highlights: ["2", "3"],
          boxes: [{ label: "Range", value: "(2, +∞)" }]
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 35: House Robber
  // ─────────────────────────────────────────────
  {
    id: 35,
    title: "House Robber",
    difficulty: "Medium",
    tags: ["DP", "Array"],
    input: "nums = [2,7,9,3,1]",
    output: "12",
    code: `function rob(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  let dp = [];
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);
  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
  }
  return dp[nums.length - 1];
}`,
    pseudoCode: [
      "dp[0] = nums[0]",
      "dp[1] = max(nums[0], nums[1])",
      "For i = 2 to nums.length - 1:",
      "  dp[i] = max(dp[i-1], dp[i-2] + nums[i])",
      "Return dp[last]"
    ],
    steps: [
      {
        line: 5, pseudoLine: 1, explanation: "dp[0] is the value of the first house: 2.",
        variables: { "dp[0]": 2 },
        visual: {
          type: "dp",
          table: [
            { index: 0, value: 2, computed: true },
            { index: 1, value: 0, computed: false },
            { index: 2, value: 0, computed: false },
            { index: 3, value: 0, computed: false },
            { index: 4, value: 0, computed: false }
          ],
          activeIndex: 0,
          formula: "dp[0] = nums[0] = 2"
        }
      },
      {
        line: 6, pseudoLine: 2, explanation: "dp[1] = max(2, 7) = 7.",
        variables: { "dp[1]": 7 },
        visual: {
          type: "dp",
          table: [
            { index: 0, value: 2, computed: true },
            { index: 1, value: 7, computed: true },
            { index: 2, value: 0, computed: false },
            { index: 3, value: 0, computed: false },
            { index: 4, value: 0, computed: false }
          ],
          activeIndex: 1,
          formula: "dp[1] = max(nums[0], nums[1]) = 7"
        }
      },
      {
        line: 8, pseudoLine: 4, explanation: "dp[2] = max(dp[1], dp[0] + nums[2]) = max(7, 2 + 9) = 11.",
        variables: { i: 2, "dp[2]": 11 },
        visual: {
          type: "dp",
          table: [
            { index: 0, value: 2, computed: true },
            { index: 1, value: 7, computed: true },
            { index: 2, value: 11, computed: true },
            { index: 3, value: 0, computed: false },
            { index: 4, value: 0, computed: false }
          ],
          activeIndex: 2,
          formula: "dp[2] = max(dp[1], dp[0] + 9) = 11"
        }
      },
      {
        line: 8, pseudoLine: 4, explanation: "dp[3] = max(dp[2], dp[1] + nums[3]) = max(11, 7 + 3) = 11.",
        variables: { i: 3, "dp[3]": 11 },
        visual: {
          type: "dp",
          table: [
            { index: 0, value: 2, computed: true },
            { index: 1, value: 7, computed: true },
            { index: 2, value: 11, computed: true },
            { index: 3, value: 11, computed: true },
            { index: 4, value: 0, computed: false }
          ],
          activeIndex: 3,
          formula: "dp[3] = max(dp[2], dp[1] + 3) = 11"
        }
      },
      {
        line: 8, pseudoLine: 4, explanation: "dp[4] = max(dp[3], dp[2] + nums[4]) = max(11, 11 + 1) = 12.",
        variables: { i: 4, "dp[4]": 12 },
        visual: {
          type: "dp",
          table: [
            { index: 0, value: 2, computed: true },
            { index: 1, value: 7, computed: true },
            { index: 2, value: 11, computed: true },
            { index: 3, value: 11, computed: true },
            { index: 4, value: 12, computed: true }
          ],
          activeIndex: 4,
          formula: "dp[4] = max(dp[3], dp[2] + 1) = 12",
          result: 12
        }
      }
    ]
  }
];
