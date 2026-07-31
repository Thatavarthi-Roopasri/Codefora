import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';
import { PROBLEMS_DRYRUNS } from '../data/problemsDryRun';

const Problem50DryRun = () => {
  const problemData = PROBLEMS_DRYRUNS.find(p => p.id === 50);
  return <DryRunPlayer problem={problemData} />;
};
export default Problem50DryRun;
