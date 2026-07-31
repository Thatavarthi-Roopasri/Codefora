import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dryRunComponents } from '../dryruns';
import { AnimatePresence, motion } from 'framer-motion';
import '../dryrun.css'; // Load tailwind CSS only for this page

export function DryRunPage() {
  const { id, dryRunId } = useParams();
  const navigate = useNavigate();

  const problemNum = parseInt(dryRunId, 10);
  const DryRunComponent = dryRunComponents[problemNum];

  if (!DryRunComponent) {
    return (
      <div className="min-h-screen bg-[#000000] p-8 flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-4">Dry Run Not Found</h1>
        <p className="text-gray-400 mb-8">We don't have a visual dry run for problem #{problemNum} yet.</p>
        <button
          onClick={() => navigate('/problems')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
        >
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={problemNum}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-[#000000] pt-4 px-4 max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate('/problems')}
              className="font-marker text-sm text-gray-400 hover:text-gray-100 border-2 border-gray-700 rounded px-3 py-1 hover:border-indigo-500 transition-colors mb-2"
            >
              ← Back to Problems
            </button>
          </div>
          
          <DryRunComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
