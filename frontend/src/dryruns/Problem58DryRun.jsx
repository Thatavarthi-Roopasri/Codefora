import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';
import { PROBLEMS_DRYRUNS } from '../data/problemsDryRun';

const Problem58DryRun = () => {
  const problemData = PROBLEMS_DRYRUNS.find(p => p.id === 58);
  return <DryRunPlayer problem={problemData} />;
};
export default Problem58DryRun;
