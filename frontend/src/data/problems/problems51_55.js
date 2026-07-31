export const problems51_55 = [
  {
    id: 51,
    title: "N-Queens",
    difficulty: "Hard",
    tags: ["Array", "Backtracking"],
    input: "n = 4",
    output: "[[...]]",
    code: `function solveNQueens(n) {
  const res = [];
  const board = Array(n).fill().map(() => Array(n).fill('.'));
  
  function isValid(r, c) {
    for (let i = 0; i < r; i++) {
      if (board[i][c] === 'Q') return false;
    }
    for (let i = r - 1, j = c - 1; i >= 0 && j >= 0; i--, j--) {
      if (board[i][j] === 'Q') return false;
    }
    for (let i = r - 1, j = c + 1; i >= 0 && j < n; i--, j++) {
      if (board[i][j] === 'Q') return false;
    }
    return true;
  }
  
  function backtrack(r) {
    if (r === n) {
      res.push(board.map(row => row.join('')));
      return;
    }
    for (let c = 0; c < n; c++) {
      if (isValid(r, c)) {
        board[r][c] = 'Q';
        backtrack(r + 1);
        board[r][c] = '.';
      }
    }
  }
  backtrack(0);
  return res;
}`,
    pseudoCode: [
      "board = n x n empty grid",
      "function backtrack(row):",
      "  if row == n, valid board found",
      "  for each col in row:",
      "    if valid to place queen here:",
      "      place queen",
      "      backtrack(row + 1)",
      "      remove queen",
      "call backtrack(0)"
    ],
    steps: [
      { step: 1, line: 3, pseudoLine: 1, explanation: "Create an empty board of size n x n.", visual: { type: "grid2d", grid: [[".",".",".","."],[".",".",".","."],[".",".",".","."],[".",".",".","."]], highlight: [] } },
      { step: 2, line: 33, pseudoLine: 9, explanation: "Start backtracking from row 0.", visual: { type: "grid2d", grid: [["Q",".",".","."],[".",".",".","."],[".",".",".","."],[".",".",".","."]], highlight: [{r:0,c:0}] } },
      { step: 3, line: 24, pseudoLine: 5, explanation: "Try placing a queen in each column of current row.", visual: { type: "grid2d", grid: [["Q",".",".","."],[".",".","Q","."],[".",".",".","."],[".",".",".","."]], highlight: [{r:1,c:2}] } },
      { step: 4, line: 5, pseudoLine: 5, explanation: "isValid checks column and both diagonals.", visual: { type: "grid2d", grid: [[".","Q",".","."],[".",".",".","Q"],["Q",".",".","."],[".",".","Q","."]], highlight: [{r:0,c:1}, {r:1,c:3}, {r:2,c:0}, {r:3,c:2}] } },
      { step: 5, line: 20, pseudoLine: 3, explanation: "If row == n, a valid solution is found.", visual: { type: "grid2d", grid: [[".","Q",".","."],[".",".",".","Q"],["Q",".",".","."],[".",".","Q","."]], result: "Valid Solution Found!" } }
    ]
  },
  {
    id: 52,
    title: "N-Queens II",
    difficulty: "Hard",
    tags: ["Backtracking"],
    input: "n = 4",
    output: "2",
    code: `function totalNQueens(n) {
  let count = 0;
  const cols = new Set();
  const posDiag = new Set();
  const negDiag = new Set();
  
  function backtrack(r) {
    if (r === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || posDiag.has(r + c) || negDiag.has(r - c)) continue;
      
      cols.add(c);
      posDiag.add(r + c);
      negDiag.add(r - c);
      
      backtrack(r + 1);
      
      cols.delete(c);
      posDiag.delete(r + c);
      negDiag.delete(r - c);
    }
  }
  backtrack(0);
  return count;
}`,
    pseudoCode: [
      "create sets for cols, posDiag, negDiag",
      "function backtrack(row):",
      "  if row == n, count++",
      "  for col from 0 to n-1:",
      "    if cell is attacked, continue",
      "    add to sets, backtrack(row + 1), remove from sets",
      "return count"
    ],
    steps: [
      { step: 1, line: 3, pseudoLine: 1, explanation: "Use sets to track attacked columns and diagonals.", visual: { type: "list", items: ["cols = {}", "posDiag = {}", "negDiag = {}"], label: "Sets" } },
      { step: 2, line: 27, pseudoLine: 7, explanation: "Start backtracking.", visual: { type: "list", items: ["Row 0"], label: "Recursion" } },
      { step: 3, line: 13, pseudoLine: 5, explanation: "Check if current cell is under attack using Sets (O(1)).", visual: { type: "list", items: ["cols.has(c)", "posDiag.has(r+c)", "negDiag.has(r-c)"], label: "O(1) checks" } },
      { step: 4, line: 9, pseudoLine: 3, explanation: "When all rows are filled, increment count.", visual: { type: "text", content: "Count = 2", result: "2 Solutions", groups: [] } }
    ]
  },
  {
    id: 53,
    title: "Maximum Subarray",
    difficulty: "Medium",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
    output: "6",
    code: `function maxSubArray(nums) {
  let currentSum = nums[0];
  let maxSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
    pseudoCode: [
      "currentSum = nums[0], maxSum = nums[0]",
      "for each element from index 1:",
      "  currentSum = max(element, currentSum + element)",
      "  maxSum = max(maxSum, currentSum)",
      "return maxSum"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Initialize currentSum and maxSum with the first element.", visual: { type: "array", array: [-2,1,-3,4,-1,2,1,-5,4], i: 0, highlight: [0] } },
      { step: 2, line: 5, pseudoLine: 3, explanation: "Decide whether to add nums[i] to currentSum or start a new subarray.", visual: { type: "array", array: [-2,1,-3,4,-1,2,1,-5,4], i: 3, highlight: [3] } },
      { step: 3, line: 6, pseudoLine: 4, explanation: "Update maxSum if currentSum is larger.", visual: { type: "list", items: ["currentSum = 6", "maxSum = 6 (from [4,-1,2,1])"], label: "Variables" } },
      { step: 4, line: 8, pseudoLine: 5, explanation: "Return the overall maximum sum.", visual: { type: "text", content: "6", result: "Max Sum: 6", groups: [] } }
    ]
  },
  {
    id: 54,
    title: "Spiral Matrix",
    difficulty: "Medium",
    tags: ["Array", "Matrix", "Simulation"],
    input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
    output: "[1,2,3,6,9,8,7,4,5]",
    code: `function spiralOrder(matrix) {
  const res = [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) res.push(matrix[top][i]);
    top++;
    for (let i = top; i <= bottom; i++) res.push(matrix[i][right]);
    right--;
    if (top <= bottom) {
      for (let i = right; i >= left; i--) res.push(matrix[bottom][i]);
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) res.push(matrix[i][left]);
      left++;
    }
  }
  return res;
}`,
    pseudoCode: [
      "define top, bottom, left, right bounds",
      "while bounds are valid:",
      "  traverse top row left to right, top++",
      "  traverse right col top to bottom, right--",
      "  if top <= bottom, traverse bottom row right to left, bottom--",
      "  if left <= right, traverse left col bottom to top, left++",
      "return result array"
    ],
    steps: [
      { step: 1, line: 3, pseudoLine: 1, explanation: "Set boundaries: top, bottom, left, right.", visual: { type: "grid", board: [["1","2","3"],["4","5","6"],["7","8","9"]], label: "Matrix" } },
      { step: 2, line: 6, pseudoLine: 3, explanation: "Traverse top row from left to right. Increment top.", visual: { type: "grid", board: [["1","2","3"],["4","5","6"],["7","8","9"]], highlight: [{r:0,c:0},{r:0,c:1},{r:0,c:2}], label: "Top Row" } },
      { step: 3, line: 8, pseudoLine: 4, explanation: "Traverse right col from top to bottom. Decrement right.", visual: { type: "grid", board: [["1","2","3"],["4","5","6"],["7","8","9"]], highlight: [{r:1,c:2},{r:2,c:2}], label: "Right Col" } },
      { step: 4, line: 11, pseudoLine: 5, explanation: "Traverse bottom row right to left. Decrement bottom.", visual: { type: "grid", board: [["1","2","3"],["4","5","6"],["7","8","9"]], highlight: [{r:2,c:1},{r:2,c:0}], label: "Bottom Row" } },
      { step: 5, line: 15, pseudoLine: 6, explanation: "Traverse left col bottom to top. Increment left.", visual: { type: "grid", board: [["1","2","3"],["4","5","6"],["7","8","9"]], highlight: [{r:1,c:0}], label: "Left Col" } }
    ]
  },
  {
    id: 55,
    title: "Jump Game",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    input: "nums = [2,3,1,1,4]",
    output: "true",
    code: `function canJump(nums) {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false;
    maxReach = Math.max(maxReach, i + nums[i]);
  }
  return true;
}`,
    pseudoCode: [
      "maxReach = 0",
      "for i from 0 to n-1:",
      "  if i > maxReach, return false",
      "  maxReach = max(maxReach, i + nums[i])",
      "return true"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Track maxReach index from starting points.", visual: { type: "array", array: [2,3,1,1,4], i: 0, highlight: [] } },
      { step: 2, line: 4, pseudoLine: 3, explanation: "If current index is beyond maxReach, we're stuck.", visual: { type: "array", array: [2,3,1,1,4], i: 1, highlight: [1,2,3] } },
      { step: 3, line: 5, pseudoLine: 4, explanation: "Update maxReach with i + nums[i].", visual: { type: "list", items: ["maxReach = 4"], label: "Variables" } },
      { step: 4, line: 7, pseudoLine: 5, explanation: "If we finish the loop, we reached the end.", visual: { type: "text", content: "true", result: "Can Reach End", groups: [] } }
    ]
  }
];
