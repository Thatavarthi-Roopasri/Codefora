import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExecution } from '../hooks/useExecution';

const VariablePanel = () => {
  const { currentStep } = useExecution();

  if (!currentStep) return null;

  const { variables } = currentStep;
  const entries = Object.entries(variables || {});

  return (
    <div className="whiteboard-border p-4 rounded-lg flex-1 min-w-[250px] max-w-sm bg-white text-black">
      <h3 className="text-xl font-marker font-bold text-black mb-3 border-b-2 border-black pb-1">
        📋 Variables & Memory
      </h3>
      
      <div className="space-y-2 font-handwritten text-xl">
        <AnimatePresence>
          {entries.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-400 italic text-lg"
            >
              No active variables.
            </motion.div>
          ) : (
            entries.map(([key, value]) => {
              const isChanged = value !== "undefined";
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between py-1 border-b border-dashed border-gray-300"
                >
                  <span className="font-bold text-purple-700 font-mono text-base">{key}</span>
                  <span className="text-gray-400 font-bold mx-2">→</span>
                  <motion.span 
                    key={`${key}-${value}`} // Re-animate on value change
                    initial={{ scale: 1.3, color: '#dc2626' }} // red marker highlight when changing
                    animate={{ scale: 1, color: value === 'null' ? '#16a34a' : '#111111' }} // default black or green for null
                    transition={{ duration: 0.4 }}
                    className="font-mono text-base font-bold bg-gray-50 border border-gray-300 px-2 py-0.5 rounded"
                  >
                    {String(value)}
                  </motion.span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VariablePanel;
