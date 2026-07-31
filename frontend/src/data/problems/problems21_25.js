export const problems21_25 = [
  // ─────────────────────────────────────────────
  // PROBLEM 21: Search Insert Position
  // ─────────────────────────────────────────────
  {
    id: 21,
    title: "Search Insert Position",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    input: "nums = [1,3,5,6], target = 5",
    output: "2",
    code: `function searchInsert(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}`,
    pseudoCode: [
      "Initialize left = 0, right = nums.length - 1",
      "While left <= right:",
      "  mid = floor((left + right) / 2)",
      "  If nums[mid] == target, return mid",
      "  If nums[mid] < target, left = mid + 1",
      "  Else right = mid - 1",
      "Return left"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Initialize pointers left at 0 and right at end of array.",
        variables: { left: 0, right: 3, target: 5 },
        visual: { type: "twopointer", array: [1, 3, 5, 6], left: 0, right: 3, label: ["left", "right"] }
      },
      {
        line: 5, pseudoLine: 3, explanation: "Calculate mid = floor((0 + 3) / 2) = 1. Value at mid is 3.",
        variables: { left: 0, right: 3, mid: 1, nums_mid: 3, target: 5 },
        visual: { type: "twopointer", array: [1, 3, 5, 6], left: 0, right: 3, highlight: [1], label: ["left", "right"] }
      },
      {
        line: 7, pseudoLine: 5, explanation: "Since 3 < target (5), we move left to mid + 1 = 2.",
        variables: { left: 2, right: 3, mid: 1, target: 5 },
        visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, label: ["left", "right"] }
      },
      {
        line: 5, pseudoLine: 3, explanation: "Calculate mid = floor((2 + 3) / 2) = 2. Value at mid is 5.",
        variables: { left: 2, right: 3, mid: 2, nums_mid: 5, target: 5 },
        visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, highlight: [2], label: ["left", "right"] }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Target found at index 2! We return 2.",
        variables: { left: 2, right: 3, mid: 2, target: 5 },
        visual: { type: "twopointer", array: [1, 3, 5, 6], left: 2, right: 3, highlight: [2], success: true, label: ["left", "right"] }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 22: Valid Parentheses
  // ─────────────────────────────────────────────
  {
    id: 22,
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    input: "s = \"()[]{}\"",
    output: "true",
    code: `function isValid(s) {
  let stack = [];
  let map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (!map[char]) stack.push(char);
    else if (stack.pop() !== map[char]) return false;
  }
  return stack.length === 0;
}`,
    pseudoCode: [
      "Initialize empty stack and hash map of pairs",
      "For each character in string:",
      "  If it's an opening bracket, push to stack",
      "  If closing bracket, pop from stack",
      "  If popped bracket doesn't match, return false",
      "Return true if stack is empty"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Initialize an empty stack.",
        variables: { char: null },
        visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: -1 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "Encountered '('. It's an opening bracket, push it to stack.",
        variables: { char: "(" },
        visual: { type: "stack", stack: ["("], input: "()[]{}", inputIndex: 0 }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Encountered ')'. Pop from stack ('('). Matches!",
        variables: { char: ")", popped: "(" },
        visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 1 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "Encountered '['. Push to stack.",
        variables: { char: "[" },
        visual: { type: "stack", stack: ["["], input: "()[]{}", inputIndex: 2 }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Encountered ']'. Pop from stack ('['). Matches!",
        variables: { char: "]", popped: "[" },
        visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 3 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "Encountered '{'. Push to stack.",
        variables: { char: "{" },
        visual: { type: "stack", stack: ["{"], input: "()[]{}", inputIndex: 4 }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Encountered '}'. Pop from stack ('{'). Matches!",
        variables: { char: "}", popped: "{" },
        visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 5 }
      },
      {
        line: 8, pseudoLine: 6, explanation: "Loop finished. Stack is empty, so string is valid.",
        variables: { },
        visual: { type: "stack", stack: [], input: "()[]{}", inputIndex: 6, valid: true }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 23: Binary Tree Inorder Traversal
  // ─────────────────────────────────────────────
  {
    id: 23,
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    input: "root = [1,null,2,3]",
    output: "[1,3,2]",
    code: `function inorderTraversal(root) {
  const result = [];
  function traverse(node) {
    if (!node) return;
    traverse(node.left);
    result.push(node.val);
    traverse(node.right);
  }
  traverse(root);
  return result;
}`,
    pseudoCode: [
      "Initialize result array",
      "Define traverse(node):",
      "  If node is null, return",
      "  traverse(node.left)",
      "  push node value to result",
      "  traverse(node.right)",
      "Call traverse(root), return result"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Start with empty result array.",
        variables: { result: "[]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "1" },
          boxes: [{ label: "Result", value: "[]" }]
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "At node 1. Traverse left (which is null).",
        variables: { node: "1", result: "[]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "1" },
          highlights: ["1"],
          boxes: [{ label: "Result", value: "[]" }]
        }
      },
      {
        line: 6, pseudoLine: 5, explanation: "Left is done. Push 1 to result.",
        variables: { node: "1", result: "[1]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "1" },
          highlights: ["1"],
          boxes: [{ label: "Result", value: "[1]" }]
        }
      },
      {
        line: 7, pseudoLine: 6, explanation: "Traverse right to node 2.",
        variables: { node: "2", result: "[1]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "2" },
          boxes: [{ label: "Result", value: "[1]" }]
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "At node 2. Traverse left to node 3.",
        variables: { node: "3", result: "[1]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "3" },
          boxes: [{ label: "Result", value: "[1]" }]
        }
      },
      {
        line: 6, pseudoLine: 5, explanation: "Node 3 left is null. Push 3 to result.",
        variables: { node: "3", result: "[1, 3]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "3" },
          highlights: ["1", "3"],
          boxes: [{ label: "Result", value: "[1, 3]" }]
        }
      },
      {
        line: 6, pseudoLine: 5, explanation: "Back to node 2. Left is done, push 2 to result.",
        variables: { node: "2", result: "[1, 3, 2]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          pointers: { curr: "2" },
          highlights: ["1", "3", "2"],
          boxes: [{ label: "Result", value: "[1, 3, 2]" }]
        }
      },
      {
        line: 10, pseudoLine: 7, explanation: "Traversal complete. Final result is [1, 3, 2].",
        variables: { result: "[1, 3, 2]" },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", right: "2" },
            { id: "2", value: "2", left: "3" },
            { id: "3", value: "3" }
          ],
          highlights: ["1", "3", "2"],
          boxes: [{ label: "Result", value: "[1, 3, 2]" }]
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 24: Lemonade Change
  // ─────────────────────────────────────────────
  {
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
  },

  // ─────────────────────────────────────────────
  // PROBLEM 25: Breadth First Search Path
  // ─────────────────────────────────────────────
  {
    id: 25,
    title: "Breadth First Search Path",
    difficulty: "Easy",
    tags: ["Graph", "BFS"],
    input: "V=5, E=[[0,1],[0,2],[1,3],[1,4]]",
    output: "[0,1,2,3,4]",
    code: `function bfs(graph, start) {
  let visited = new Set([start]);
  let queue = [start];
  let path = [];
  while (queue.length > 0) {
    let node = queue.shift();
    path.push(node);
    for (let neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return path;
}`,
    pseudoCode: [
      "Initialize visited set and queue with start node",
      "While queue is not empty:",
      "  Dequeue node and add to path",
      "  For each neighbor of node:",
      "    If neighbor not visited, mark visited and enqueue",
      "Return path"
    ],
    steps: [
      {
        line: 3, pseudoLine: 1, explanation: "Start BFS at node 0. Queue is [0].",
        variables: { queue: "[0]", path: "[]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0],
          centerFound: null
        }
      },
      {
        line: 7, pseudoLine: 3, explanation: "Dequeue 0, add to path. Queue is [].",
        variables: { node: 0, queue: "[]", path: "[0]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0],
          centerFound: 0
        }
      },
      {
        line: 11, pseudoLine: 5, explanation: "Neighbors of 0 are 1 and 2. Enqueue them.",
        variables: { queue: "[1, 2]", path: "[0]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0, 1, 2],
          centerFound: 0
        }
      },
      {
        line: 7, pseudoLine: 3, explanation: "Dequeue 1, add to path. Neighbors are 3, 4.",
        variables: { node: 1, queue: "[2, 3, 4]", path: "[0, 1]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0, 1, 2, 3, 4],
          centerFound: 1
        }
      },
      {
        line: 7, pseudoLine: 3, explanation: "Dequeue 2, add it to the BFS path. Node 2 has no new neighbors.",
        variables: { node: 2, queue: "[3, 4]", path: "[0, 1, 2]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0, 1, 2],
          centerFound: 2
        }
      },
      {
        line: 7, pseudoLine: 3, explanation: "Dequeue 3, add it to the path.",
        variables: { node: 3, queue: "[4]", path: "[0, 1, 2, 3]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0, 1, 2, 3],
          centerFound: 3
        }
      },
      {
        line: 15, pseudoLine: 6, explanation: "Dequeue 4. Queue becomes empty, so BFS returns the full path.",
        variables: { node: 4, queue: "[]", path: "[0, 1, 2, 3, 4]" },
        visual: {
          type: "graph",
          nodes: [
            { id: 0, x: 250, y: 50, value: 0 },
            { id: 1, x: 150, y: 150, value: 1 },
            { id: 2, x: 350, y: 150, value: 2 },
            { id: 3, x: 100, y: 250, value: 3 },
            { id: 4, x: 200, y: 250, value: 4 }
          ],
          edges: [
            { from: 0, to: 1 }, { from: 0, to: 2 },
            { from: 1, to: 3 }, { from: 1, to: 4 }
          ],
          highlightNodes: [0, 1, 2, 3, 4],
          centerFound: 4
        }
      }
    ]
  }
];
