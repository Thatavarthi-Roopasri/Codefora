export const problems1_5 = [
  // ─────────────────────────────────────────────
  // PROBLEM 1: Pattern 1 (Right-Angled Triangle)
  // ─────────────────────────────────────────────
  {
    id: "pattern-1",
    title: "Pattern 1: Right-Angled Triangle of Stars",
    difficulty: "Easy",
    tags: ["Patterns"],
    input: "n = 3",
    output: "*\\n**\\n***",
    pseudoCode: [
      "function printTriangle(n):",
      "  for i from 1 to n:",
      "    for j from 1 to i:",
      "      print('*')",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [], highlightRow: -1, activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print 1 star for row 1", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
      { pseudoLine: 5, explanation: "Move to next line", visual: { type: "pattern", grid: [["*"]], highlightRow: -1, activeRow: 1 } },
      { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*"]], highlightRow: -1, activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print 1st star for row 2", visual: { type: "pattern", grid: [["*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print 2nd star for row 2", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
      { pseudoLine: 5, explanation: "Move to next line", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: -1, activeRow: 2 } },
      { pseudoLine: 2, explanation: "Start row i=3", visual: { type: "pattern", grid: [["*"], ["*", "*"]], highlightRow: -1, activeRow: 2 } },
      { pseudoLine: 4, explanation: "Print 1st star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*"]], highlightRow: 2, highlightCol: 0, activeRow: 2 } },
      { pseudoLine: 4, explanation: "Print 2nd star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*"]], highlightRow: 2, highlightCol: 1, activeRow: 2 } },
      { pseudoLine: 4, explanation: "Print 3rd star for row 3", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*", "*"]], highlightRow: 2, highlightCol: 2, activeRow: 2 } },
      { pseudoLine: 5, explanation: "Done! Triangle is printed ✅", visual: { type: "pattern", grid: [["*"], ["*", "*"], ["*", "*", "*"]], highlightRow: -1, activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 2: Pattern 2 (Square Star Grid)
  // ─────────────────────────────────────────────
  {
    id: "pattern-2",
    title: "Pattern 2: Square Star Grid",
    difficulty: "Easy",
    tags: ["Patterns"],
    input: "n = 2",
    output: "**\\n**",
    pseudoCode: [
      "function printSquare(n):",
      "  for i from 1 to n:",
      "    for j from 1 to n:",
      "      print('*')",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [], activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print 1st star", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print 2nd star", visual: { type: "pattern", grid: [["*", "*"]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
      { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*"]], activeRow: 1 } },
      { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*", "*"]], activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print 1st star", visual: { type: "pattern", grid: [["*", "*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print 2nd star", visual: { type: "pattern", grid: [["*", "*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
      { pseudoLine: 5, explanation: "Done! Square is printed ✅", visual: { type: "pattern", grid: [["*", "*"], ["*", "*"]], activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 3: Pattern 3 (Inverted Triangle)
  // ─────────────────────────────────────────────
  {
    id: "pattern-3",
    title: "Pattern 3: Inverted Right Triangle of Stars",
    difficulty: "Easy",
    tags: ["Patterns"],
    input: "n = 3",
    output: "***\\n**\\n*",
    pseudoCode: [
      "function invertedTriangle(n):",
      "  for i from n down to 1:",
      "    for j from 1 to i:",
      "      print('*')",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Start row i=3", visual: { type: "pattern", grid: [], activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print star (1 of 3)", visual: { type: "pattern", grid: [["*"]], highlightRow: 0, highlightCol: 0, activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print star (2 of 3)", visual: { type: "pattern", grid: [["*", "*"]], highlightRow: 0, highlightCol: 1, activeRow: 0 } },
      { pseudoLine: 4, explanation: "Print star (3 of 3)", visual: { type: "pattern", grid: [["*", "*", "*"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
      { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*", "*"]], activeRow: 1 } },
      { pseudoLine: 2, explanation: "Start row i=2", visual: { type: "pattern", grid: [["*", "*", "*"]], activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print star (1 of 2)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*"]], highlightRow: 1, highlightCol: 0, activeRow: 1 } },
      { pseudoLine: 4, explanation: "Print star (2 of 2)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], highlightRow: 1, highlightCol: 1, activeRow: 1 } },
      { pseudoLine: 5, explanation: "Newline", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], activeRow: 2 } },
      { pseudoLine: 2, explanation: "Start row i=1", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"]], activeRow: 2 } },
      { pseudoLine: 4, explanation: "Print star (1 of 1)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"], ["*"]], highlightRow: 2, highlightCol: 0, activeRow: 2 } },
      { pseudoLine: 5, explanation: "Done! Inverted triangle complete ✅", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", "*"], ["*"]], activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 4: Pattern 4 (Number Pyramid)
  // ─────────────────────────────────────────────
  {
    id: "pattern-4",
    title: "Pattern 4: Number Pyramid Pattern",
    difficulty: "Easy",
    tags: ["Patterns"],
    input: "n = 3",
    output: "  1  \\n 2 2 \\n3 3 3",
    pseudoCode: [
      "function numberPyramid(n):",
      "  for i from 1 to n:",
      "    print spaces (n - i)",
      "    for j from 1 to i:",
      "      print(i + ' ')",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Row i=1. Print 2 spaces then '1 '", visual: { type: "pattern", grid: [[" ", " ", "1"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
      { pseudoLine: 6, explanation: "Newline", visual: { type: "pattern", grid: [[" ", " ", "1"]], activeRow: 1 } },
      { pseudoLine: 2, explanation: "Row i=2. Print 1 space then '2 ' twice", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"]], highlightRow: 1, highlightCol: 3, activeRow: 1 } },
      { pseudoLine: 6, explanation: "Newline", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"]], activeRow: 2 } },
      { pseudoLine: 2, explanation: "Row i=3. Print 0 spaces then '3 ' thrice", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"], ["3", " ", "3", " ", "3"]], highlightRow: 2, highlightCol: 4, activeRow: 2 } },
      { pseudoLine: 6, explanation: "Done! Number pyramid complete ✅", visual: { type: "pattern", grid: [[" ", " ", "1"], [" ", "2", " ", "2"], ["3", " ", "3", " ", "3"]], activeRow: -1 } }
    ]
  },

  // ─────────────────────────────────────────────
  // PROBLEM 5: Pattern 6 (Hollow Square)
  // ─────────────────────────────────────────────
  {
    id: "pattern-6",
    title: "Pattern 6: Hollow Square Star Pattern",
    difficulty: "Medium",
    tags: ["Patterns"],
    input: "n = 3",
    output: "***\\n* *\\n***",
    pseudoCode: [
      "function hollowSquare(n):",
      "  for i from 1 to n:",
      "    for j from 1 to n:",
      "      if i==1 or i==n or j==1 or j==n:",
      "        print('*')",
      "      else:",
      "        print(' ')",
      "    print(newline)"
    ],
    steps: [
      { pseudoLine: 2, explanation: "Row 1 (first row = all stars)", visual: { type: "pattern", grid: [["*", "*", "*"]], highlightRow: 0, highlightCol: 2, activeRow: 0 } },
      { pseudoLine: 4, explanation: "Row 2: star, space, star", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"]], highlightRow: 1, highlightCol: 2, activeRow: 1 } },
      { pseudoLine: 4, explanation: "Row 3 (last row = all stars)", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"], ["*", "*", "*"]], highlightRow: 2, highlightCol: 2, activeRow: 2 } },
      { pseudoLine: 8, explanation: "Done! Hollow square complete ✅", visual: { type: "pattern", grid: [["*", "*", "*"], ["*", " ", "*"], ["*", "*", "*"]], activeRow: -1 } }
    ]
  }
];
