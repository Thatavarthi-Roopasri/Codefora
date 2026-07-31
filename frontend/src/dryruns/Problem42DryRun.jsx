import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';
import { PROBLEMS_DRYRUNS } from '../data/problemsDryRun';

const Problem42DryRun = () => {
  const problemData = PROBLEMS_DRYRUNS.find(p => p.id === 42);
  return <DryRunPlayer problem={problemData} />;
};
export default Problem42DryRun;
