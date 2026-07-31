/**
 * Central export map for all dry-run components.
 * Usage:
 *   import { dryRunComponents } from './dryruns';
 *   const DryRun = dryRunComponents[problemNumber];
 *   <DryRun />
 *
 * Or import individually:
 *   import Problem1DryRun from './dryruns/Problem1DryRun';
 */

import Problem1DryRun from './Problem1DryRun';
import Problem2DryRun from './Problem2DryRun';
import Problem3DryRun from './Problem3DryRun';
import Problem4DryRun from './Problem4DryRun';
import Problem5DryRun from './Problem5DryRun';
import Problem6DryRun from './Problem6DryRun';
import Problem7DryRun from './Problem7DryRun';
import Problem8DryRun from './Problem8DryRun';
import Problem9DryRun from './Problem9DryRun';
import Problem10DryRun from './Problem10DryRun';
import Problem11DryRun from './Problem11DryRun';
import Problem12DryRun from './Problem12DryRun';
import Problem13DryRun from './Problem13DryRun';
import Problem14DryRun from './Problem14DryRun';
import Problem15DryRun from './Problem15DryRun';
import Problem16DryRun from './Problem16DryRun';
import Problem17DryRun from './Problem17DryRun';
import Problem18DryRun from './Problem18DryRun';
import Problem19DryRun from './Problem19DryRun';
import Problem20DryRun from './Problem20DryRun';
import Problem21DryRun from './Problem21DryRun';
import Problem22DryRun from './Problem22DryRun';
import Problem23DryRun from './Problem23DryRun';
import Problem24DryRun from './Problem24DryRun';
import Problem25DryRun from './Problem25DryRun';
import Problem26DryRun from './Problem26DryRun';
import Problem27DryRun from './Problem27DryRun';
import Problem28DryRun from './Problem28DryRun';
import Problem29DryRun from './Problem29DryRun';
import Problem30DryRun from './Problem30DryRun';
import Problem31DryRun from './Problem31DryRun';
import Problem32DryRun from './Problem32DryRun';
import Problem33DryRun from './Problem33DryRun';
import Problem34DryRun from './Problem34DryRun';
import Problem35DryRun from './Problem35DryRun';
import Problem36DryRun from './Problem36DryRun';
import Problem37DryRun from './Problem37DryRun';
import Problem38DryRun from './Problem38DryRun';
import Problem39DryRun from './Problem39DryRun';
import Problem40DryRun from './Problem40DryRun';
import Problem41DryRun from './Problem41DryRun';
import Problem42DryRun from './Problem42DryRun';
import Problem43DryRun from './Problem43DryRun';
import Problem44DryRun from './Problem44DryRun';
import Problem45DryRun from './Problem45DryRun';
import Problem46DryRun from './Problem46DryRun';
import Problem47DryRun from './Problem47DryRun';
import Problem48DryRun from './Problem48DryRun';
import Problem49DryRun from './Problem49DryRun';
import Problem50DryRun from './Problem50DryRun';
import Problem51DryRun from './Problem51DryRun';
import Problem52DryRun from './Problem52DryRun';
import Problem53DryRun from './Problem53DryRun';
import Problem54DryRun from './Problem54DryRun';
import Problem55DryRun from './Problem55DryRun';
import Problem56DryRun from './Problem56DryRun';
import Problem57DryRun from './Problem57DryRun';
import Problem58DryRun from './Problem58DryRun';
import Problem59DryRun from './Problem59DryRun';
import Problem60DryRun from './Problem60DryRun';

/**
 * Map of problem number → component.
 * Use this for dynamic routing: dryRunComponents[problemId]
 */
export const dryRunComponents = {
  1: Problem1DryRun,
  2: Problem2DryRun,
  3: Problem3DryRun,
  4: Problem4DryRun,
  5: Problem5DryRun,
  6: Problem6DryRun,
  7: Problem7DryRun,
  8: Problem8DryRun,
  9: Problem9DryRun,
  10: Problem10DryRun,
  11: Problem11DryRun,
  12: Problem12DryRun,
  13: Problem13DryRun,
  14: Problem14DryRun,
  15: Problem15DryRun,
  16: Problem16DryRun,
  17: Problem17DryRun,
  18: Problem18DryRun,
  19: Problem19DryRun,
  20: Problem20DryRun,
  21: Problem21DryRun,
  22: Problem22DryRun,
  23: Problem23DryRun,
  24: Problem24DryRun,
  25: Problem25DryRun,
  26: Problem26DryRun,
  27: Problem27DryRun,
  28: Problem28DryRun,
  29: Problem29DryRun,
  30: Problem30DryRun,
  31: Problem31DryRun,
  32: Problem32DryRun,
  33: Problem33DryRun,
  34: Problem34DryRun,
  35: Problem35DryRun,
  36: Problem36DryRun,
  37: Problem37DryRun,
  38: Problem38DryRun,
  39: Problem39DryRun,
  40: Problem40DryRun,
  41: Problem41DryRun,
  42: Problem42DryRun,
  43: Problem43DryRun,
  44: Problem44DryRun,
  45: Problem45DryRun,
  46: Problem46DryRun,
  47: Problem47DryRun,
  48: Problem48DryRun,
  49: Problem49DryRun,
  50: Problem50DryRun,
  51: Problem51DryRun,
  52: Problem52DryRun,
  53: Problem53DryRun,
  54: Problem54DryRun,
  55: Problem55DryRun,
  56: Problem56DryRun,
  57: Problem57DryRun,
  58: Problem58DryRun,
  59: Problem59DryRun,
  60: Problem60DryRun,
};

/**
 * Ordered list of all problem titles (for gallery display).
 */
export const dryRunList = [
  { num: 1, component: Problem1DryRun },
  { num: 2, component: Problem2DryRun },
  { num: 3, component: Problem3DryRun },
  { num: 4, component: Problem4DryRun },
  { num: 5, component: Problem5DryRun },
  { num: 6, component: Problem6DryRun },
  { num: 7, component: Problem7DryRun },
  { num: 8, component: Problem8DryRun },
  { num: 9, component: Problem9DryRun },
  { num: 10, component: Problem10DryRun },
  { num: 11, component: Problem11DryRun },
  { num: 12, component: Problem12DryRun },
  { num: 13, component: Problem13DryRun },
  { num: 14, component: Problem14DryRun },
  { num: 15, component: Problem15DryRun },
  { num: 16, component: Problem16DryRun },
  { num: 17, component: Problem17DryRun },
  { num: 18, component: Problem18DryRun },
  { num: 19, component: Problem19DryRun },
  { num: 20, component: Problem20DryRun },
  { num: 21, component: Problem21DryRun },
  { num: 22, component: Problem22DryRun },
  { num: 23, component: Problem23DryRun },
  { num: 24, component: Problem24DryRun },
  { num: 25, component: Problem25DryRun },
  { num: 26, component: Problem26DryRun },
  { num: 27, component: Problem27DryRun },
  { num: 28, component: Problem28DryRun },
  { num: 29, component: Problem29DryRun },
  { num: 30, component: Problem30DryRun },
  { num: 31, component: Problem31DryRun },
  { num: 32, component: Problem32DryRun },
  { num: 33, component: Problem33DryRun },
  { num: 34, component: Problem34DryRun },
  { num: 35, component: Problem35DryRun },
  { num: 36, component: Problem36DryRun },
  { num: 37, component: Problem37DryRun },
  { num: 38, component: Problem38DryRun },
  { num: 39, component: Problem39DryRun },
  { num: 40, component: Problem40DryRun },
  { num: 41, component: Problem41DryRun },
  { num: 42, component: Problem42DryRun },
  { num: 43, component: Problem43DryRun },
  { num: 44, component: Problem44DryRun },
  { num: 45, component: Problem45DryRun },
  { num: 46, component: Problem46DryRun },
  { num: 47, component: Problem47DryRun },
  { num: 48, component: Problem48DryRun },
  { num: 49, component: Problem49DryRun },
  { num: 50, component: Problem50DryRun },
  { num: 51, component: Problem51DryRun },
  { num: 52, component: Problem52DryRun },
  { num: 53, component: Problem53DryRun },
  { num: 54, component: Problem54DryRun },
  { num: 55, component: Problem55DryRun },
  { num: 56, component: Problem56DryRun },
  { num: 57, component: Problem57DryRun },
  { num: 58, component: Problem58DryRun },
  { num: 59, component: Problem59DryRun },
  { num: 60, component: Problem60DryRun },
];

export {
  Problem1DryRun, Problem2DryRun, Problem3DryRun, Problem4DryRun, Problem5DryRun,
  Problem6DryRun, Problem7DryRun, Problem8DryRun, Problem9DryRun, Problem10DryRun,
  Problem11DryRun, Problem12DryRun, Problem13DryRun, Problem14DryRun, Problem15DryRun,
  Problem16DryRun, Problem17DryRun, Problem18DryRun, Problem19DryRun, Problem20DryRun,
  Problem21DryRun, Problem22DryRun, Problem23DryRun, Problem24DryRun, Problem25DryRun,
  Problem26DryRun, Problem27DryRun, Problem28DryRun, Problem29DryRun, Problem30DryRun,
  Problem31DryRun, Problem32DryRun, Problem33DryRun, Problem34DryRun, Problem35DryRun,
  Problem36DryRun, Problem37DryRun, Problem38DryRun, Problem39DryRun, Problem40DryRun,
  Problem41DryRun, Problem42DryRun, Problem43DryRun, Problem44DryRun, Problem45DryRun,
  Problem46DryRun, Problem47DryRun, Problem48DryRun, Problem49DryRun, Problem50DryRun,
  Problem51DryRun, Problem52DryRun, Problem53DryRun, Problem54DryRun, Problem55DryRun,
  Problem56DryRun, Problem57DryRun, Problem58DryRun, Problem59DryRun, Problem60DryRun,
};
