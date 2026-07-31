export const problems46_50 = [
  {
    id: 46,
    title: "Permutations",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    input: "nums = [1,2,3]",
    output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
    code: `function permute(nums) {
  const result = [];
  function backtrack(path, used) {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      path.push(nums[i]);
      used[i] = true;
      backtrack(path, used);
      path.pop();
      used[i] = false;
    }
  }
  backtrack([], Array(nums.length).fill(false));
  return result;
}`,
    pseudoCode: [
      "function backtrack(path, used):",
      "  if path is full, add to result",
      "  for each number:",
      "    if not used:",
      "      add to path, mark used",
      "      backtrack(path, used)",
      "      remove from path, unmark used",
      "call backtrack with empty path"
    ],
    steps: [
      { step: 1, line: 17, pseudoLine: 8, explanation: "Call backtrack with empty path and used array.", visual: { type: "list", items: [], label: "Current Path" } },
      { step: 2, line: 8, pseudoLine: 4, explanation: "Loop over nums. First element: 1", visual: { type: "list", items: [1], label: "Current Path", activeIndex: 0 } },
      { step: 3, line: 12, pseudoLine: 6, explanation: "Recurse with path [1].", visual: { type: "list", items: [1], label: "Current Path" } },
      { step: 4, line: 8, pseudoLine: 4, explanation: "Loop over nums. Add 2. Path: [1,2]", visual: { type: "list", items: [1, 2], label: "Current Path", activeIndex: 1 } },
      { step: 5, line: 12, pseudoLine: 6, explanation: "Recurse with path [1,2].", visual: { type: "list", items: [1, 2], label: "Current Path" } },
      { step: 6, line: 8, pseudoLine: 4, explanation: "Add 3. Path: [1,2,3]", visual: { type: "list", items: [1, 2, 3], label: "Current Path", activeIndex: 2 } },
      { step: 7, line: 5, pseudoLine: 2, explanation: "Length matches nums! Add [1,2,3] to result.", visual: { type: "list", items: ["[1,2,3]", "[...]"], label: "Results Found", activeIndex: 0 } }
    ]
  },
  {
    id: 47,
    title: "Permutations II",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    input: "nums = [1,1,2]",
    output: "[[1,1,2], [1,2,1], [2,1,1]]",
    code: `function permuteUnique(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  function backtrack(path, used) {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i] || (i > 0 && nums[i] === nums[i-1] && !used[i-1])) continue;
      path.push(nums[i]);
      used[i] = true;
      backtrack(path, used);
      path.pop();
      used[i] = false;
    }
  }
  backtrack([], Array(nums.length).fill(false));
  return result;
}`,
    pseudoCode: [
      "sort nums array",
      "function backtrack(path, used):",
      "  if path full, save result",
      "  for each number:",
      "    if used or (is duplicate AND previous not used): skip",
      "    choose, recurse, backtrack",
      "call backtrack"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Sort the array to handle duplicates: [1,1,2]", visual: { type: "array", array: [1,1,2], i: -1, highlight: [] } },
      { step: 2, line: 18, pseudoLine: 7, explanation: "Call backtrack.", visual: { type: "list", items: [], label: "Current Path" } },
      { step: 3, line: 10, pseudoLine: 5, explanation: "If element is duplicate and previous duplicate wasn't used, skip.", visual: { type: "list", items: ["[1,1,2]", "[1,2,1]", "[2,1,1]"], label: "Found Unique Paths so far" } },
      { step: 4, line: 20, pseudoLine: 3, explanation: "Returns all unique permutations.", visual: { type: "list", items: ["[1,1,2]", "[1,2,1]", "[2,1,1]"], label: "Final Result" } }
    ]
  },
  {
    id: 48,
    title: "Rotate Image",
    difficulty: "Medium",
    tags: ["Array", "Math", "Matrix"],
    input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
    output: "[[7,4,1],[8,5,2],[9,6,3]]",
    code: `function rotate(matrix) {
  let n = matrix.length;
  // Transpose
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let temp = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = temp;
    }
  }
  // Reverse each row
  for (let i = 0; i < n; i++) {
    matrix[i].reverse();
  }
}`,
    pseudoCode: [
      "n = matrix size",
      "for i from 0 to n-1:",
      "  for j from i to n-1:",
      "    swap matrix[i][j] and matrix[j][i]",
      "for each row in matrix:",
      "  reverse the row"
    ],
    steps: [
      { step: 1, line: 4, pseudoLine: 4, explanation: "Transpose the matrix (swap matrix[i][j] with matrix[j][i]).", visual: { type: "grid2d", grid: [["1","4","7"],["2","5","8"],["3","6","9"]], highlight: [], label: "Transposed Matrix" } },
      { step: 2, line: 12, pseudoLine: 6, explanation: "Reverse each row of the transposed matrix.", visual: { type: "grid2d", grid: [["7","4","1"],["8","5","2"],["9","6","3"]], highlight: [], label: "Reversed Rows" } },
      { step: 3, line: 14, pseudoLine: 6, explanation: "Matrix rotated by 90 degrees.", visual: { type: "grid2d", grid: [["7","4","1"],["8","5","2"],["9","6","3"]], highlight: [], label: "Final Matrix", result: "Done" } }
    ]
  },
  {
    id: 49,
    title: "Group Anagrams",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "String", "Sorting"],
    input: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
    output: "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]",
    code: `function groupAnagrams(strs) {
  let map = new Map();
  for (let str of strs) {
    let sorted = str.split('').sort().join('');
    if (!map.has(sorted)) {
      map.set(sorted, []);
    }
    map.get(sorted).push(str);
  }
  return Array.from(map.values());
}`,
    pseudoCode: [
      "map = new Map",
      "for each string:",
      "  sorted = sort characters in string",
      "  add string to map[sorted]",
      "return all values from map"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Create a Map to group words by sorted form.", visual: { type: "hashmap", map: {}, array: ["eat", "tea", "tan"] } },
      { step: 2, line: 4, pseudoLine: 3, explanation: "'eat' sorted is 'aet'.", visual: { type: "hashmap", map: { "aet": "[]" }, array: ["eat", "tea", "tan"] } },
      { step: 3, line: 5, pseudoLine: 4, explanation: "Add 'eat' to map['aet'].", visual: { type: "hashmap", map: { "aet": "['eat']" }, array: ["eat", "tea", "tan"] } },
      { step: 4, line: 4, pseudoLine: 4, explanation: "'tea' sorted is 'aet'. Grouped with 'eat'.", visual: { type: "hashmap", map: { "aet": "['eat', 'tea']" }, array: ["eat", "tea", "tan"] } },
      { step: 5, line: 10, pseudoLine: 5, explanation: "Return all groups as an array.", visual: { type: "list", items: ["['eat', 'tea', 'ate']", "['tan', 'nat']", "['bat']"], label: "Anagram Groups" } }
    ]
  },
  {
    id: 50,
    title: "Pow(x, n)",
    difficulty: "Medium",
    tags: ["Math", "Recursion"],
    input: "x = 2.00000, n = 10",
    output: "1024.00000",
    code: `function myPow(x, n) {
  if (n === 0) return 1;
  let power = Math.abs(n);
  let res = 1;
  while (power > 0) {
    if (power % 2 === 1) res *= x;
    x *= x;
    power = Math.floor(power / 2);
  }
  return n < 0 ? 1 / res : res;
}`,
    pseudoCode: [
      "if n == 0 return 1",
      "power = abs(n), res = 1",
      "while power > 0:",
      "  if power is odd, res *= x",
      "  x *= x",
      "  power //= 2",
      "return n < 0 ? 1/res : res"
    ],
    steps: [
      { step: 1, line: 2, pseudoLine: 1, explanation: "Check base case: if n==0, return 1.", visual: { type: "list", items: ["x = 2", "n = 10", "power = 10", "res = 1"], label: "Variables" } },
      { step: 2, line: 5, pseudoLine: 3, explanation: "Loop while power > 0.", visual: { type: "list", items: ["x = 2", "power = 10", "res = 1"], label: "Variables" } },
      { step: 3, line: 6, pseudoLine: 4, explanation: "If power is odd, multiply res by x.", visual: { type: "list", items: ["power = 5", "res = 1 (even power)"], label: "Variables" } },
      { step: 4, line: 7, pseudoLine: 5, explanation: "Square x and halve the power.", visual: { type: "list", items: ["x = 4", "power = 5"], label: "Variables" } },
      { step: 5, line: 10, pseudoLine: 7, explanation: "Handle negative n at the end.", visual: { type: "list", items: ["Result = 1024"], label: "Final Result" } }
    ]
  }
];
