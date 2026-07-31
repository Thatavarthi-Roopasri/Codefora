export const problems26_30 = [
  // ─────────────────────────────────────────────
  // PROBLEM 26: Merge Sorted Array
  // ─────────────────────────────────────────────
  {
    id: 26,
    title: "Merge Sorted Array",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
    output: "[1,2,2,3,5,6]",
    code: `function merge(nums1, m, nums2, n) {
  let p1 = m - 1;
  let p2 = n - 1;
  let p = m + n - 1;
  while (p2 >= 0) {
    if (p1 >= 0 && nums1[p1] > nums2[p2]) {
      nums1[p] = nums1[p1];
      p1--;
    } else {
      nums1[p] = nums2[p2];
      p2--;
    }
    p--;
  }
}`,
    pseudoCode: [
      "Initialize p1 = m-1, p2 = n-1, p = m+n-1",
      "While p2 >= 0:",
      "  If p1 >= 0 and nums1[p1] > nums2[p2]:",
      "    nums1[p] = nums1[p1], decrement p1",
      "  Else:",
      "    nums1[p] = nums2[p2], decrement p2",
      "  Decrement p"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Start placing largest elements at the end of nums1.",
        variables: { p1: 2, p2: 2, p: 5 },
        visual: { type: "array", array: [1, 2, 3, 0, 0, 0], i: 2, j: 5 }
      },
      {
        line: 6, pseudoLine: 3, explanation: "Compare nums1[2] (3) and nums2[2] (6). 6 is larger.",
        variables: { "nums1[p1]": 3, "nums2[p2]": 6, p: 5 },
        visual: { type: "array", array: [1, 2, 3, 0, 0, 0], i: 2, j: 5, highlight: [2] }
      },
      {
        line: 9, pseudoLine: 6, explanation: "Place 6 at nums1[5]. Decrement p2 and p.",
        variables: { p1: 2, p2: 1, p: 4 },
        visual: { type: "array", array: [1, 2, 3, 0, 0, 6], i: 2, j: 4 }
      },
      {
        line: 6, pseudoLine: 3, explanation: "Compare nums1[2] (3) and nums2[1] (5). 5 is larger.",
        variables: { p1: 2, p2: 1, p: 4 },
        visual: { type: "array", array: [1, 2, 3, 0, 0, 6], i: 2, j: 4, highlight: [2] }
      },
      {
        line: 9, pseudoLine: 6, explanation: "Place 5 at nums1[4]. Decrement p2 and p.",
        variables: { p1: 2, p2: 0, p: 3 },
        visual: { type: "array", array: [1, 2, 3, 0, 5, 6], i: 2, j: 3 }
      },
      {
        line: 6, pseudoLine: 3, explanation: "Compare nums1[2] (3) and nums2[0] (2). 3 is larger.",
        variables: { p1: 2, p2: 0, p: 3 },
        visual: { type: "array", array: [1, 2, 3, 0, 5, 6], i: 2, j: 3, highlight: [2] }
      },
      {
        line: 7, pseudoLine: 4, explanation: "Place 3 at nums1[3]. Decrement p1 and p.",
        variables: { p1: 1, p2: 0, p: 2 },
        visual: { type: "array", array: [1, 2, 2, 3, 5, 6], i: 1, j: 2 }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 27: Symmetric Tree
  // ─────────────────────────────────────────────
  {
    id: 27,
    title: "Symmetric Tree",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    input: "root = [1,2,2,3,4,4,3]",
    output: "true",
    code: `function isSymmetric(root) {
  if (!root) return true;
  function isMirror(t1, t2) {
    if (!t1 && !t2) return true;
    if (!t1 || !t2) return false;
    return (t1.val === t2.val)
      && isMirror(t1.right, t2.left)
      && isMirror(t1.left, t2.right);
  }
  return isMirror(root.left, root.right);
}`,
    pseudoCode: [
      "Define isMirror(t1, t2):",
      "  If both null, true",
      "  If one null, false",
      "  Return (t1.val == t2.val) AND",
      "         isMirror(t1.right, t2.left) AND",
      "         isMirror(t1.left, t2.right)"
    ],
    steps: [
      {
        line: 10, pseudoLine: 1, explanation: "Check if left and right subtrees are mirrors.",
        variables: { root: 1 },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", left: "2L", right: "2R" },
            { id: "2L", value: "2", left: "3L", right: "4L" },
            { id: "2R", value: "2", left: "4R", right: "3R" },
            { id: "3L", value: "3" },
            { id: "4L", value: "4" },
            { id: "4R", value: "4" },
            { id: "3R", value: "3" }
          ],
          pointers: { curr: "1" }
        }
      },
      {
        line: 6, pseudoLine: 4, explanation: "Compare root.left (2) with root.right (2). They match.",
        variables: { t1: 2, t2: 2 },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", left: "2L", right: "2R" },
            { id: "2L", value: "2", left: "3L", right: "4L" },
            { id: "2R", value: "2", left: "4R", right: "3R" },
            { id: "3L", value: "3" },
            { id: "4L", value: "4" },
            { id: "4R", value: "4" },
            { id: "3R", value: "3" }
          ],
          pointers: { t1: "2L", t2: "2R" },
          highlights: ["2L", "2R"],
          boxes: [{ label: "Mirror?", value: "2 == 2" }]
        }
      },
      {
        line: 7, pseudoLine: 5, explanation: "Compare t1.right (4) and t2.left (4). They match.",
        variables: { t1: 4, t2: 4 },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", left: "2L", right: "2R" },
            { id: "2L", value: "2", left: "3L", right: "4L" },
            { id: "2R", value: "2", left: "4R", right: "3R" },
            { id: "3L", value: "3" },
            { id: "4L", value: "4" },
            { id: "4R", value: "4" },
            { id: "3R", value: "3" }
          ],
          pointers: { t1: "4L", t2: "4R" },
          highlights: ["4L", "4R"],
          boxes: [{ label: "Outer check", value: "4 == 4" }]
        }
      },
      {
        line: 8, pseudoLine: 6, explanation: "Compare t1.left (3) and t2.right (3). They also match.",
        variables: { t1: 3, t2: 3 },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", left: "2L", right: "2R" },
            { id: "2L", value: "2", left: "3L", right: "4L" },
            { id: "2R", value: "2", left: "4R", right: "3R" },
            { id: "3L", value: "3" },
            { id: "4L", value: "4" },
            { id: "4R", value: "4" },
            { id: "3R", value: "3" }
          ],
          pointers: { t1: "3L", t2: "3R" },
          highlights: ["3L", "3R"],
          boxes: [{ label: "Inner check", value: "3 == 3" }]
        }
      },
      {
        line: 10, pseudoLine: 6, explanation: "Every mirrored pair matched, so the tree is symmetric.",
        variables: { result: true },
        visual: {
          type: "tree",
          nodes: [
            { id: "1", value: "1", left: "2L", right: "2R" },
            { id: "2L", value: "2", left: "3L", right: "4L" },
            { id: "2R", value: "2", left: "4R", right: "3R" },
            { id: "3L", value: "3" },
            { id: "4L", value: "4" },
            { id: "4R", value: "4" },
            { id: "3R", value: "3" }
          ],
          highlights: ["1", "2L", "2R", "3L", "4L", "4R", "3R"],
          boxes: [{ label: "Result", value: "true" }]
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 28: Find Index of First Occurrence in String
  // ─────────────────────────────────────────────
  {
    id: 28,
    title: "Find Index of First Occurrence in String",
    difficulty: "Easy",
    tags: ["String", "Two Pointers"],
    input: "haystack = 'sadbutsad', needle = 'sad'",
    output: "0",
    code: `function strStr(haystack, needle) {
  if (needle === "") return 0;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let j = 0;
    while (j < needle.length && haystack[i + j] === needle[j]) {
      j++;
    }
    if (j === needle.length) return i;
  }
  return -1;
}`,
    pseudoCode: [
      "Iterate i from 0 to haystack.len - needle.len:",
      "  Initialize j = 0",
      "  While j < needle.len AND haystack[i+j] == needle[j]:",
      "    j++",
      "  If j == needle.len, return i",
      "Return -1"
    ],
    steps: [
      {
        line: 3, pseudoLine: 1, explanation: "Start searching from index i = 0.",
        variables: { i: 0, j: 0 },
        visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], i: 0, j: 0 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "haystack[0] == needle[0] ('s'). Increment j.",
        variables: { i: 0, j: 1 },
        visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0], i: 0, j: 1 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "haystack[1] == needle[1] ('a'). Increment j.",
        variables: { i: 0, j: 2 },
        visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1], i: 0, j: 2 }
      },
      {
        line: 5, pseudoLine: 3, explanation: "haystack[2] == needle[2] ('d'). Increment j.",
        variables: { i: 0, j: 3 },
        visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1, 2], i: 0, j: 3 }
      },
      {
        line: 8, pseudoLine: 5, explanation: "j reached needle length (3). Found match at index 0!",
        variables: { result: 0 },
        visual: { type: "array", array: ['s','a','d','b','u','t','s','a','d'], highlight: [0, 1, 2] }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 29: Unique Paths
  // ─────────────────────────────────────────────
  {
    id: 29,
    title: "Unique Paths",
    difficulty: "Medium",
    tags: ["DP", "Matrix"],
    input: "m = 3, n = 3",
    output: "6",
    code: `function uniquePaths(m, n) {
  let dp = Array(m).fill().map(() => Array(n).fill(1));
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  return dp[m - 1][n - 1];
}`,
    pseudoCode: [
      "Create m x n DP table filled with 1s",
      "For each row i from 1 to m-1:",
      "  For each col j from 1 to n-1:",
      "    dp[i][j] = dp[i-1][j] + dp[i][j-1]",
      "Return dp[m-1][n-1]"
    ],
    steps: [
      {
        line: 2, pseudoLine: 1, explanation: "Initialize DP table with 1s (base case for top row and left col).",
        variables: { m: 3, n: 3 },
        visual: {
          type: "grid2d",
          grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
          label: "DP Matrix"
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2.",
        variables: { i: 1, j: 1 },
        visual: {
          type: "grid2d",
          grid: [[1, 1, 1], [1, 2, 1], [1, 1, 1]],
          highlightRow: 1, highlightCol: 1,
          label: "DP Matrix"
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3.",
        variables: { i: 1, j: 2 },
        visual: {
          type: "grid2d",
          grid: [[1, 1, 1], [1, 2, 3], [1, 1, 1]],
          highlightRow: 1, highlightCol: 2,
          label: "DP Matrix"
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3.",
        variables: { i: 2, j: 1 },
        visual: {
          type: "grid2d",
          grid: [[1, 1, 1], [1, 2, 3], [1, 3, 1]],
          highlightRow: 2, highlightCol: 1,
          label: "DP Matrix"
        }
      },
      {
        line: 5, pseudoLine: 4, explanation: "dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6.",
        variables: { i: 2, j: 2 },
        visual: {
          type: "grid2d",
          grid: [[1, 1, 1], [1, 2, 3], [1, 3, 6]],
          highlightRow: 2, highlightCol: 2,
          result: 6,
          label: "DP Matrix"
        }
      }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 30: Sieve of Eratosthenes
  // ─────────────────────────────────────────────
  {
    id: 30,
    title: "Sieve of Eratosthenes",
    difficulty: "Medium",
    tags: ["Math", "Array"],
    input: "n = 10",
    output: "[2,3,5,7]",
    code: `function sieve(n) {
  let isPrime = Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let i = p * p; i <= n; i += p) {
        isPrime[i] = false;
      }
    }
  }
  return isPrime.map((p, i) => p ? i : -1).filter(i => i > 0);
}`,
    pseudoCode: [
      "Initialize isPrime array to true",
      "isPrime[0] = isPrime[1] = false",
      "For p = 2 to sqrt(n):",
      "  If isPrime[p] is true:",
      "    Mark all multiples of p as false",
      "Return indices that are still true"
    ],
    steps: [
      {
        line: 3, pseudoLine: 2, explanation: "0 and 1 are not prime.",
        variables: { n: 10 },
        visual: { type: "array", array: ["F", "F", "T", "T", "T", "T", "T", "T", "T", "T", "T"], i: 0 }
      },
      {
        line: 4, pseudoLine: 3, explanation: "p = 2. It is prime. Mark multiples (4,6,8,10) as False.",
        variables: { p: 2 },
        visual: { type: "array", array: ["F", "F", "T", "T", "F", "T", "F", "T", "F", "T", "F"], i: 2, highlight: [4, 6, 8, 10] }
      },
      {
        line: 4, pseudoLine: 3, explanation: "p = 3. It is prime. Mark multiples (9) as False.",
        variables: { p: 3 },
        visual: { type: "array", array: ["F", "F", "T", "T", "F", "T", "F", "T", "F", "F", "F"], i: 3, highlight: [9] }
      },
      {
        line: 11, pseudoLine: 6, explanation: "Done. Remaining Trues are primes: 2, 3, 5, 7.",
        variables: { result: "[2, 3, 5, 7]" },
        visual: { type: "array", array: ["F", "F", "2", "3", "F", "5", "F", "7", "F", "F", "F"], highlight: [2, 3, 5, 7] }
      }
    ]
  }
];
