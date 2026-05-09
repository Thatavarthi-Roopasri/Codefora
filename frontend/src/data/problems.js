export const problems = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Arrays", "Math"],
    acceptance: 84,
    status: "Unsolved",
    solutionAvailable: true,
    statement: "Given an integer array nums and a target, print the zero-based indices of the two numbers that add up to the target. Print the smaller index first.",
    constraints: ["2 <= n <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer exists."],
    tests: [
      { input: "4\n2 7 11 15\n9", output: "0 1" },
      { input: "3\n3 2 4\n6", output: "1 2" }
    ]
  },
  {
    id: "binary-tree-traversal",
    title: "Binary Tree Traversal",
    difficulty: "Easy",
    tags: ["Trees", "Recursion"],
    acceptance: 78,
    status: "Unsolved",
    solutionAvailable: true,
    statement: "Given n values representing a binary tree in level order with -1 for null nodes, print the inorder traversal.",
    constraints: ["1 <= n <= 2000", "Node values fit in 32-bit signed integers.", "Use spaces between values."],
    tests: [
      { input: "7\n1 2 3 -1 4 -1 5", output: "2 4 1 3 5" },
      { input: "3\n2 1 3", output: "1 2 3" }
    ]
  },
  {
    id: "code-signal-paths",
    title: "Code Signal Paths",
    difficulty: "Medium",
    tags: ["Graphs", "Binary Search"],
    acceptance: 61,
    status: "Unsolved",
    solutionAvailable: false,
    statement: "Given an undirected graph, print the number of connected components.",
    constraints: ["1 <= n <= 10^5", "0 <= m <= 2 * 10^5", "Nodes are numbered from 1 to n."],
    tests: [
      { input: "5 3\n1 2\n2 3\n4 5", output: "2" },
      { input: "4 0", output: "4" }
    ]
  },
  {
    id: "dynamic-maze-escape",
    title: "Dynamic Maze Escape",
    difficulty: "Hard",
    tags: ["DP", "Graphs"],
    acceptance: 39,
    status: "Unsolved",
    solutionAvailable: false,
    statement: "Given a grid with 0 as open cells and 1 as blocked cells, print the shortest path length from top-left to bottom-right. Print -1 when unreachable.",
    constraints: ["1 <= rows, cols <= 200", "You may move up, down, left, and right.", "Start and target cells must be open to be reachable."],
    tests: [
      { input: "3 3\n0 0 0\n1 1 0\n0 0 0", output: "4" },
      { input: "2 2\n0 1\n1 0", output: "-1" }
    ]
  },
  {
    id: "neon-array-rotation",
    title: "Neon Array Rotation",
    difficulty: "Medium",
    tags: ["Arrays", "Greedy"],
    acceptance: 67,
    status: "Unsolved",
    solutionAvailable: true,
    statement: "Given an array and k, rotate the array to the right by k steps and print the result.",
    constraints: ["1 <= n <= 10^5", "0 <= k <= 10^9", "Print values separated by spaces."],
    tests: [
      { input: "5 2\n1 2 3 4 5", output: "4 5 1 2 3" },
      { input: "4 6\n10 20 30 40", output: "30 40 10 20" }
    ]
  },
  {
    id: "string-cascade",
    title: "String Cascade",
    difficulty: "Easy",
    tags: ["Strings", "Hashing"],
    acceptance: 73,
    status: "Unsolved",
    solutionAvailable: true,
    statement: "Given a string, print YES if it is a palindrome after ignoring case, otherwise print NO.",
    constraints: ["1 <= length <= 10^5", "String contains only letters.", "Output must be YES or NO."],
    tests: [
      { input: "RaceCar", output: "YES" },
      { input: "Codefora", output: "NO" }
    ]
  }
];
