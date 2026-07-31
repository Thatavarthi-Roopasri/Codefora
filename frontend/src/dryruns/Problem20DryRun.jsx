import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';

const problemData = {
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
};

const Problem20DryRun = () => <DryRunPlayer problem={problemData} />;
export default Problem20DryRun;
