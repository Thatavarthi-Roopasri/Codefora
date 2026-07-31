import React from 'react';
import { motion } from 'framer-motion';

const springTrans = { type: 'spring', stiffness: 350, damping: 25 };

/**
 * Visualizer for 2D Grid / Matrix problems.
 * Handles Unique Paths, Number of Islands, DP Tables, etc.
 */
const Grid2DViz = ({ 
  grid = [], 
  highlightRow = -1, 
  highlightCol = -1, 
  path = [], 
  visited = [], 
  result = null,
  label = "2D Matrix",
  highlight = []
}) => {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-sm font-marker text-gray-400">{label}:</div>
      <div className="inline-flex flex-col gap-1 p-4 bg-gray-900 border-4 border-gray-700 rounded-xl max-w-max shadow-2xl relative">
        {grid.map((row, r) => (
          <div key={`row-${r}`} className="flex gap-1">
            {row.map((val, c) => {
              const isHighlighted = (r === highlightRow && c === highlightCol) || (highlight && highlight.some(h => h.r === r && h.c === c));
              const isPath = path && path.some(([pr, pc]) => pr === r && pc === c);
              const isVisited = visited && visited.some(([vr, vc]) => vr === r && vc === c);
              
              return (
                <motion.div
                  key={`cell-${r}-${c}-${val}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: isHighlighted ? 1.15 : 1, opacity: 1 }}
                  transition={springTrans}
                  className={`
                    w-12 h-12 flex items-center justify-center font-mono text-xl font-bold rounded-lg border-2 transition-all duration-300
                    ${isHighlighted ? 'border-orange-500 bg-orange-900/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.6)] z-10' : ''}
                    ${isPath && !isHighlighted ? 'border-green-500 bg-green-900/40 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : ''}
                    ${isVisited && !isHighlighted && !isPath ? 'border-blue-500 bg-blue-900/40 text-blue-300 opacity-70' : ''}
                    ${!isHighlighted && !isPath && !isVisited ? 'border-gray-600 bg-[#1e1e2e] text-gray-200' : ''}
                  `}
                >
                  {val !== null && val !== undefined ? val : ''}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {result !== null && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="border-3 border-green-500 bg-green-900/40 px-6 py-3 rounded-xl shadow-lg w-max font-marker text-xl text-green-400"
        >
          ✅ Result: {result}
        </motion.div>
      )}
    </div>
  );
};

export default Grid2DViz;
