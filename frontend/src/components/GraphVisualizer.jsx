import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const springTrans = { type: 'spring', stiffness: 350, damping: 25 };

/**
 * Basic GraphVisualizer specifically tuned for the Star Graph problem.
 * Expects visual.nodes (array of {id, x, y, value, isCenter})
 * Expects visual.edges (array of {from, to})
 * Expects visual.highlightNode (id)
 */
const GraphVisualizer = ({ nodes = [], edges = [], highlightNodes = [], centerFound = null, resultLabel = "Current Node" }) => {
  const hasActiveNode = centerFound !== null && centerFound !== undefined;
  return (
    <div className="flex flex-col gap-4 py-4 w-full h-[380px] relative">
      <div className="text-sm font-marker text-gray-400 mb-1">Graph Diagram:</div>
      <div className="w-full h-full relative border-4 border-dashed border-gray-700 rounded-xl bg-gray-900 overflow-hidden">
        
        {/* Draw Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <AnimatePresence>
            {edges.map((edge, i) => {
              const n1 = nodes.find(n => n.id === edge.from);
              const n2 = nodes.find(n => n.id === edge.to);
              if (!n1 || !n2) return null;
              
              const isHighlight = highlightNodes.includes(n1.id) && highlightNodes.includes(n2.id);
              
              return (
                <motion.line
                  key={`edge-${edge.from}-${edge.to}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  x1={n1.x} y1={n1.y}
                  x2={n2.x} y2={n2.y}
                  stroke={isHighlight ? "#60a5fa" : "#4b5563"}
                  strokeWidth={isHighlight ? 4 : 2}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Draw Nodes */}
        {nodes.map(node => {
          const isHighlight = highlightNodes.includes(node.id);
          const isCenter = hasActiveNode && centerFound === node.id;
          
          return (
            <motion.div
              key={`node-${node.id}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: isCenter ? 1.3 : (isHighlight ? 1.15 : 1), 
                opacity: 1 
              }}
              transition={springTrans}
              className={`
                absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center font-marker text-xl shadow-lg border-4
                ${isCenter ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400 z-20 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : ''}
                ${isHighlight && !isCenter ? 'bg-blue-900/40 border-blue-500 text-blue-400 z-10' : ''}
                ${!isHighlight && !isCenter ? 'bg-[#1e1e2e] border-gray-600 text-gray-200' : ''}
              `}
              style={{ left: node.x, top: node.y }}
            >
              {node.value}
            </motion.div>
          );
        })}
      </div>
      
      {/* Result badge */}
      <AnimatePresence>
        {hasActiveNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 border-3 border-yellow-500 bg-yellow-900/40 px-6 py-2 rounded-full font-marker text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)] text-lg z-30"
          >
            ⭐ {resultLabel}: Node {nodes.find(n => n.id === centerFound)?.value}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphVisualizer;
