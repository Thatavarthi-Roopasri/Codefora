import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
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
};

const Problem26DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem26DryRun;
