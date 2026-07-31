import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QueueVisualizer = ({ data = [] }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h4 className="text-sm font-semibold text-primary mb-2">Queue</h4>
      <div className="flex items-center justify-start w-64 h-16 border-y-4 border-border bg-surface/30 p-2 gap-2 overflow-hidden relative">
        <div className="absolute left-1 top-0 text-[10px] text-textMuted font-bold uppercase">Front</div>
        <div className="absolute right-1 top-0 text-[10px] text-textMuted font-bold uppercase">Rear</div>
        
        <AnimatePresence>
          {data.map((item, index) => (
            <motion.div
              key={`${index}-${item}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50, scale: 0.8 }}
              layout
              className="flex items-center justify-center min-w-[2.5rem] h-full border border-secondary bg-secondary/20 text-white font-medium rounded shadow-md"
            >
              {item}
            </motion.div>
          ))}
        </AnimatePresence>
        {data.length === 0 && (
          <div className="w-full text-center text-textMuted text-xs opacity-50">Empty</div>
        )}
      </div>
    </div>
  );
};

export default QueueVisualizer;
