import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * PseudoCodePanel — shows pseudo-code with the active line highlighted.
 */
const PseudoCodePanel = ({ pseudoCode = [], activeLine = -1 }) => {
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeLine]);

  if (!pseudoCode || pseudoCode.length === 0) return null;

  return (
    <div className="w-full flex flex-col bg-[#0f172a] h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b-2 border-dashed border-gray-700 font-marker text-xs text-gray-400 bg-[#020617] flex items-center gap-2">
        <span>📋</span> Pseudo Code
      </div>
      {/* Lines */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 font-mono text-sm leading-relaxed">
        {pseudoCode.map((line, idx) => {
          const lineNum = idx + 1;
          const isActive = lineNum === activeLine;
          return (
            <div
              key={lineNum}
              ref={isActive ? activeRef : null}
              className="relative flex items-start gap-2 rounded-md"
            >
              {isActive && (
                <motion.div
                  layoutId="pseudo-highlight"
                  className="absolute inset-0 bg-yellow-400/20 border-l-4 border-yellow-400 z-0"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
              {/* Line number */}
              <span className={`relative z-10 select-none w-5 text-right shrink-0 mt-[2px] text-[11px] ${isActive ? 'text-yellow-300 font-bold' : 'text-gray-600'}`}>
                {lineNum}
              </span>
              {/* Code line */}
              <pre className={`relative z-10 whitespace-pre-wrap break-words py-[3px] flex-1 min-w-0 ${isActive ? 'text-yellow-200 font-bold' : 'text-gray-300'}`} style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}>
                {line}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PseudoCodePanel;
