import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExecution } from '../hooks/useExecution';

const CodeHighlighter = ({ code }) => {
  const { currentStep } = useExecution();
  
  const currentLine = currentStep?.line || 0;

  const codeLines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  return (
    <div className="whiteboard-border p-4 rounded-lg flex-1 overflow-auto bg-white relative font-mono text-base leading-relaxed max-w-full text-black">
      <div className="text-sm font-marker text-gray-400 mb-2 select-none border-b border-gray-200 pb-1">
        📄 code_file.java
      </div>
      <div className="relative font-handwritten text-lg font-bold">
        {codeLines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = lineNumber === currentLine;
          
          return (
            <div 
              key={lineNumber} 
              className="flex items-center relative z-10 pr-4 py-0.5"
            >
              {/* Highlight Background (Red marker outline/highlight) */}
              {isHighlighted && (
                <motion.div 
                  layoutId="code-highlight"
                  className="absolute left-0 right-0 h-full bg-red-100/70 border-l-4 border-red-600 z-[-1]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Line Number */}
              <span className={`w-8 text-right pr-4 select-none font-marker text-xs ${isHighlighted ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                {lineNumber}
              </span>
              
              {/* Code Line */}
              <span className={`whitespace-pre ${isHighlighted ? 'text-red-700' : 'text-black'}`}>
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodeHighlighter;
