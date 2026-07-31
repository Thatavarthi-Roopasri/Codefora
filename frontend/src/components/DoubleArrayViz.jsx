import React from 'react';
import { motion } from 'framer-motion';

const springTrans = { type: 'spring', stiffness: 350, damping: 25 };

/**
 * Visualizer for problems with two distinct arrays (like Assign Cookies).
 */
const DoubleArrayViz = ({ 
  array1 = [], name1 = "Array 1", ptr1 = -1, label1 = "i", 
  array2 = [], name2 = "Array 2", ptr2 = -1, label2 = "j",
  matches = [], done = false
}) => {
  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Array 1 (e.g. Greed factor) */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-marker text-gray-400">{name1}:</div>
        <div className="flex items-end gap-2 flex-wrap">
          {array1.map((val, idx) => {
            const isPtr = idx === ptr1;
            const isMatched = matches.some(m => m[0] === idx);
            return (
              <div key={`arr1-${idx}`} className="flex flex-col items-center gap-1">
                <motion.div
                  layout
                  animate={{ scale: isPtr ? 1.15 : 1, y: isPtr ? -5 : 0 }}
                  transition={springTrans}
                  className={`
                    w-12 h-12 flex items-center justify-center border-3 rounded-lg font-marker text-xl font-bold
                    ${isMatched ? 'border-green-500 bg-green-900/30 text-green-400 opacity-60' : ''}
                    ${isPtr && !isMatched ? 'border-blue-500 bg-blue-900/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10' : ''}
                    ${!isPtr && !isMatched ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                  `}
                >
                  {val}
                </motion.div>
                <span className="text-sm font-handwritten text-gray-500">{idx}</span>
                <div className="h-5">
                  {isPtr && <motion.span initial={{y:5,opacity:0}} animate={{y:0,opacity:1}} className="text-sm text-blue-400 font-marker font-bold">↑{label1}</motion.span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Array 2 (e.g. Cookie size) */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-marker text-gray-400">{name2}:</div>
        <div className="flex items-end gap-2 flex-wrap">
          {array2.map((val, idx) => {
            const isPtr = idx === ptr2;
            const isMatched = matches.some(m => m[1] === idx);
            return (
              <div key={`arr2-${idx}`} className="flex flex-col items-center gap-1">
                <motion.div
                  layout
                  animate={{ scale: isPtr ? 1.15 : 1, y: isPtr ? -5 : 0 }}
                  transition={springTrans}
                  className={`
                    w-12 h-12 flex items-center justify-center border-3 rounded-lg font-marker text-xl font-bold
                    ${isMatched ? 'border-green-500 bg-green-900/30 text-green-400 opacity-60' : ''}
                    ${isPtr && !isMatched ? 'border-red-500 bg-red-900/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10' : ''}
                    ${!isPtr && !isMatched ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                  `}
                >
                  {val}
                </motion.div>
                <span className="text-sm font-handwritten text-gray-500">{idx}</span>
                <div className="h-5">
                  {isPtr && <motion.span initial={{y:5,opacity:0}} animate={{y:0,opacity:1}} className="text-sm text-red-400 font-marker font-bold">↑{label2}</motion.span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats/Result */}
      {done !== false && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="border-3 border-green-500 bg-green-900/40 px-6 py-3 rounded-xl shadow-lg w-max font-marker text-xl text-green-400"
        >
          ✅ Total Matches: {matches.length}
        </motion.div>
      )}
    </div>
  );
};

export default DoubleArrayViz;
