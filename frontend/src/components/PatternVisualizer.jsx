import React from 'react';
import { motion } from 'framer-motion';

const springTrans = { type: 'spring', stiffness: 350, damping: 25 };

/**
 * Renders a 2D grid for pattern printing problems.
 * Expects visual.grid (array of arrays of characters).
 * Optional: visual.highlight (string like "r,c" for current cell).
 */
const PatternVisualizer = ({ grid = [], highlightRow = -1, highlightCol = -1, activeRow = -1 }) => {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-sm font-marker text-gray-500 mb-1">Pattern Output:</div>
      <div className="flex flex-col gap-2 p-6 bg-gray-900 border-4 border-gray-800 rounded-xl max-w-max shadow-2xl">
        {grid.map((row, r) => (
          <div key={`row-${r}`} className="flex gap-2 min-h-[32px]">
            {row.map((char, c) => {
              const isHighlighted = r === highlightRow && c === highlightCol;
              const isActiveRow = r === activeRow && c <= highlightCol;
              
              // Only render if char is not empty (or just render spaces)
              return (
                <motion.div
                  key={`cell-${r}-${c}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isHighlighted ? 1.2 : 1, opacity: 1 }}
                  transition={springTrans}
                  className={`
                    w-8 h-8 flex items-center justify-center font-mono text-xl font-bold rounded
                    ${char === ' ' || char === '' ? 'bg-transparent' : 'bg-gray-800'}
                    ${isHighlighted ? 'text-yellow-400 ring-2 ring-yellow-400 bg-gray-700 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'text-blue-300'}
                    ${isActiveRow && !isHighlighted ? 'text-blue-100' : ''}
                  `}
                >
                  {char}
                </motion.div>
              );
            })}
          </div>
        ))}
        {grid.length === 0 && (
          <div className="text-gray-600 font-mono italic">(empty terminal)</div>
        )}
      </div>
    </div>
  );
};

export default PatternVisualizer;
