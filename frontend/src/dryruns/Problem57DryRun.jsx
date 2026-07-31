import React from 'react';
import DryRunPlayer from '../components/DryRunPlayer';
import { PROBLEMS_DRYRUNS } from '../data/problemsDryRun';

const Problem57DryRun = () => {
  const problemData = PROBLEMS_DRYRUNS.find(p => p.id === 57);
  return <DryRunPlayer problem={problemData} />;
};
export default Problem57DryRun;
