import React from 'react';
import { motion } from 'framer-motion';

const ArrayVisualizer = ({ data = [], highlightedIndices = [] }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h4 className="text-sm font-semibold text-primary mb-2">Array</h4>
      <div className="flex gap-2">
        {data.map((item, index) => {
          const isHighlighted = highlightedIndices.includes(index);
          return (
            <motion.div
              key={index}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center justify-center w-12 h-12 border-2 rounded ${
                isHighlighted 
                  ? 'border-primary bg-primary/20 text-white font-bold' 
                  : 'border-border bg-surface text-text'
              }`}
            >
              {item}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ArrayVisualizer;
