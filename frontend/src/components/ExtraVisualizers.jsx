import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const springTrans = { type: 'spring', stiffness: 300, damping: 25 };

/**
 * StackViz — renders a visual stack with push/pop animations.
 */
const StackViz = ({ stack = [], currentChar = null, input = '', inputIndex = -1, result = null, valid = null }) => {
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Input string display */}
      {input && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-marker text-gray-400">Input String:</div>
          <div className="flex gap-2 flex-wrap items-end">
            {input.split('').map((ch, idx) => {
              const isCurrent = idx === inputIndex;
              const isPast = idx < inputIndex;
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <motion.div
                    layout
                    key={`${idx}-${ch}`}
                    initial={{ scale: 0.7, opacity: 0, y: -10 }}
                    animate={{
                      scale: isCurrent ? 1.25 : 1,
                      opacity: 1,
                      y: 0,
                    }}
                    transition={springTrans}
                    className={`
                      w-12 h-12 flex items-center justify-center
                      border-3 rounded-lg font-marker text-2xl font-bold transition-all duration-200
                      ${isCurrent ? 'border-orange-500 bg-orange-900/40 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.55)] z-10' : ''}
                      ${isPast ? 'border-gray-700 bg-gray-900 text-gray-500' : ''}
                      ${!isCurrent && !isPast ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                    `}
                  >
                    {ch}
                  </motion.div>
                  <span className="text-xs font-handwritten text-gray-500">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stack visual */}
      <div className="flex gap-10 items-end">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-marker text-gray-400 mb-1">Stack:</div>
          {/* Stack container — renders bottom-up */}
          <div className="relative flex flex-col-reverse gap-1 min-h-[60px] border-b-4 border-l-4 border-r-4 border-gray-600 rounded-b-none rounded-t-lg px-2 pt-2 pb-0 min-w-[100px] bg-gray-900">
            <AnimatePresence>
              {stack.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-gray-500 font-handwritten italic text-sm px-2 py-2 text-center"
                >
                  (empty)
                </motion.div>
              )}
              {stack.map((item, idx) => {
                const isTop = idx === stack.length - 1;
                return (
                  <motion.div
                    key={`stack-${idx}-${item}`}
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: isTop ? 1.1 : 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={springTrans}
                    className={`
                      w-full px-4 py-2 text-center font-marker text-xl font-bold rounded-md border-2
                      ${isTop ? 'border-blue-500 bg-blue-900/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'border-gray-600 bg-[#1e1e2e] text-gray-200'}
                    `}
                  >
                    {item}
                    {isTop && <span className="text-xs text-blue-400 ml-2">← top</span>}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {/* Bottom label */}
          <div className="text-xs font-marker text-gray-500 text-center mt-1">bottom</div>
        </div>

        {/* Matching pairs legend */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-marker text-gray-400">Matching Pairs:</div>
          {[['(', ')'], ['{', '}'], ['[', ']']].map(([open, close]) => (
            <div key={open} className="flex items-center gap-2">
              <span className="w-9 h-9 flex items-center justify-center border-2 border-purple-500 bg-purple-900/20 rounded font-marker text-lg font-bold text-purple-400">{open}</span>
              <span className="font-marker text-gray-600">→</span>
              <span className="w-9 h-9 flex items-center justify-center border-2 border-purple-500 bg-purple-900/20 rounded font-marker text-lg font-bold text-purple-400">{close}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {valid !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={springTrans}
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-3 font-marker text-xl font-bold w-max shadow-lg
              ${valid ? 'border-green-500 bg-green-900/30 text-green-400' : 'border-red-500 bg-red-900/30 text-red-400'}
            `}
          >
            {valid ? '✅ Valid parentheses!' : '❌ Invalid parentheses!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * DPTableViz — renders a 1D DP table filling up step by step.
 */
const DPTableViz = ({ table = [], activeIndex = -1, formula = '', result = null }) => {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="text-sm font-marker text-gray-400">Memoization Table (fib[i]):</div>

      {/* Index row */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 flex-wrap">
          {table.map(({ index, value, computed }) => {
            const isActive = index === activeIndex;
            return (
              <div key={index} className="flex flex-col items-center gap-1">
                <motion.div
                  layout
                  key={`${index}-${value}`}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    opacity: 1,
                  }}
                  transition={springTrans}
                  className={`
                    w-14 h-14 flex items-center justify-center
                    border-3 rounded-lg font-marker text-xl font-bold transition-all duration-300
                    ${isActive ? 'border-orange-500 bg-orange-900/40 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.55)] z-10' : ''}
                    ${computed && !isActive ? 'border-green-500 bg-green-900/30 text-green-400' : ''}
                    ${!computed && !isActive ? 'border-dashed border-gray-600 bg-gray-900 text-gray-500' : ''}
                  `}
                >
                  {computed ? value : '?'}
                </motion.div>
                <span className="text-xs font-handwritten text-gray-500">fib[{index}]</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurrence formula display */}
      <AnimatePresence mode="wait">
        {formula && (
          <motion.div
            key={formula}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-block border-3 border-dashed border-purple-500 bg-purple-900/20 rounded-xl px-5 py-3 font-marker text-lg text-purple-400 w-max shadow-md"
          >
            📐 {formula}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result banner */}
      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={springTrans}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border-3 border-green-500 bg-green-900/30 font-marker text-xl font-bold text-green-400 w-max shadow-lg"
          >
            ✅ fib(n) = {result}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * BubbleSortViz — renders array with swap highlights and sorted region.
 */
const BubbleSortViz = ({ array = [], comparing = [], swapping = [], sorted = [], pass = null, swaps = 0 }) => {
  return (
    <div className="flex flex-col gap-6 py-2">
      {pass !== null && (
        <div className="flex gap-4 items-center">
          <div className="font-marker text-base text-gray-400 border-2 border-gray-600 bg-gray-900 rounded-lg px-3 py-1">
            Pass: <strong className="text-blue-400">{pass}</strong>
          </div>
          <div className="font-marker text-base text-gray-400 border-2 border-gray-600 bg-gray-900 rounded-lg px-3 py-1">
            Swaps: <strong className="text-red-400">{swaps}</strong>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-sm font-marker text-gray-400">Array:</div>
        <div className="flex gap-2 flex-wrap items-end">
          {array.map((val, idx) => {
            const isComparing = comparing.includes(idx);
            const isSwapping = swapping.includes(idx);
            const isSorted = sorted.includes(idx);
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <motion.div
                  layout
                  key={`${idx}-${val}`}
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{
                    scale: isSwapping ? 1.25 : isComparing ? 1.12 : 1,
                    y: isSwapping ? -8 : 0,
                    opacity: 1,
                  }}
                  transition={springTrans}
                  className={`
                    w-14 h-14 flex items-center justify-center
                    border-3 rounded-lg font-marker text-xl font-bold transition-colors duration-300
                    ${isSwapping ? 'border-red-500 bg-red-900/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.55)] z-10' : ''}
                    ${isComparing && !isSwapping ? 'border-yellow-500 bg-yellow-900/40 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.45)] z-10' : ''}
                    ${isSorted && !isComparing && !isSwapping ? 'border-green-500 bg-green-900/30 text-green-400' : ''}
                    ${!isComparing && !isSwapping && !isSorted ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                  `}
                >
                  {val}
                </motion.div>
                <span className="text-xs font-handwritten text-gray-500">{idx}</span>
                {isSorted && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-marker text-green-500">✓</motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-handwritten text-sm text-gray-400">
          <div className="w-5 h-5 border-2 border-yellow-500 bg-yellow-900/30 rounded"></div> Comparing
        </div>
        <div className="flex items-center gap-2 font-handwritten text-sm text-gray-400">
          <div className="w-5 h-5 border-2 border-red-500 bg-red-900/30 rounded"></div> Swapping
        </div>
        <div className="flex items-center gap-2 font-handwritten text-sm text-gray-400">
          <div className="w-5 h-5 border-2 border-green-500 bg-green-900/30 rounded"></div> Sorted
        </div>
      </div>
    </div>
  );
};

export { StackViz, DPTableViz, BubbleSortViz };
