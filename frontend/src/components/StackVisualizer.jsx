import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUp } from '../animations/animationEngine';

const StackVisualizer = ({ data = [] }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h4 className="text-sm font-semibold text-primary mb-2">Stack</h4>
      <div className="flex flex-col-reverse items-center justify-start w-24 h-48 border-x-4 border-b-4 border-border rounded-b bg-surface/30 p-1 gap-1 overflow-hidden">
        <AnimatePresence>
          {data.map((item, index) => (
            <motion.div
              key={`${index}-${item}`} // simple key for pop/push
              {...slideUp}
              className="flex items-center justify-center w-full h-8 border border-primary bg-primary/20 text-white font-medium rounded"
            >
              {item}
            </motion.div>
          ))}
        </AnimatePresence>
        {data.length === 0 && (
          <span className="text-textMuted text-xs mt-auto mb-2 opacity-50">Empty</span>
        )}
      </div>
    </div>
  );
};

export default StackVisualizer;
