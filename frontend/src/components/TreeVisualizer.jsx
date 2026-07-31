import React from 'react';
import { motion } from 'framer-motion';

const TreeVisualizer = ({ treeState = {} }) => {
  const { nodes = [], pointers = {}, highlights = [], boxes = [] } = treeState;

  const nodeById = Object.fromEntries(nodes.map(node => [node.id, node]));
  const childIds = new Set(nodes.flatMap(node => [node.left, node.right]).filter(Boolean));
  const root = nodes.find(node => !childIds.has(node.id)) || nodes[0];

  const positioned = [];
  let cursor = 0;
  const visit = (nodeId, depth = 0) => {
    const node = nodeById[nodeId];
    if (!node) return;
    visit(node.left, depth + 1);
    positioned.push({ id: nodeId, depth, order: cursor++ });
    visit(node.right, depth + 1);
  };

  if (root) visit(root.id);

  const maxDepth = Math.max(0, ...positioned.map(p => p.depth));
  const nodePositions = Object.fromEntries(
    positioned.map(({ id, depth, order }) => [
      id,
      {
        x: positioned.length === 1 ? 340 : 70 + order * (540 / Math.max(positioned.length - 1, 1)),
        y: 60 + depth * Math.max(72, Math.min(95, 260 / Math.max(maxDepth, 1)))
      }
    ])
  );

  const getArrowPath = (x1, y1, x2, y2) => {
    return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2} ${x2} ${y2}`;
  };

  return (
    <div className="w-full bg-[#111111] border-3 border-gray-700 p-4 rounded-xl flex flex-col items-center shadow-lg">
      <div className="text-lg font-marker text-gray-100 mb-2 border-b-2 border-dashed border-gray-700 w-full pb-2 flex justify-between">
        <span>🌳 Tree Whiteboard</span>
        <span className="text-sm text-gray-400 font-handwritten">Topic: Binary Search Tree</span>
      </div>

      <div className="flex gap-4 w-full px-4 pt-2">
        {boxes.map((box, i) => (
          <motion.div key={i} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} className="flex items-center gap-2 border-2 border-dashed border-blue-500 bg-blue-900/30 px-3 py-1 rounded-lg">
            <span className="font-marker text-sm text-blue-400">{box.label}:</span>
            <span className="font-bold text-lg text-gray-200">{box.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="relative w-full overflow-hidden flex justify-center mt-2">
        <svg width="680" height="340" className="bg-transparent max-w-full">
          <defs>
            <marker id="arrow-white" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#9ca3af" />
            </marker>
            <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#f87171" />
            </marker>
          </defs>

          {/* Grid lines */}
          <g opacity="0.1">
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="340" stroke="#ffffff" strokeWidth="1" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 50} x2="680" y2={i * 50} stroke="#ffffff" strokeWidth="1" />
            ))}
          </g>

          {/* Render Connections */}
          {nodes.map((node) => {
            const startPos = nodePositions[node.id];
            if (!startPos) return null;
            
            const edges = [];
            if (node.left && nodePositions[node.left]) {
               const endPos = nodePositions[node.left];
               edges.push({ to: node.left, x1: startPos.x, y1: startPos.y + 25, x2: endPos.x, y2: endPos.y - 25 });
            }
            if (node.right && nodePositions[node.right]) {
               const endPos = nodePositions[node.right];
               edges.push({ to: node.right, x1: startPos.x, y1: startPos.y + 25, x2: endPos.x, y2: endPos.y - 25 });
            }

            return edges.map((edge, i) => (
              <motion.path
                key={`edge-${node.id}-${edge.to}`}
                d={getArrowPath(edge.x1, edge.y1, edge.x2, edge.y2)}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2.5"
                markerEnd="url(#arrow-white)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ));
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isHighlighted = highlights.includes(node.id);

            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <motion.circle
                  cx="0"
                  cy="0"
                  r="25"
                  fill={node.isNew ? "#064e3b" : "#1f2937"}
                  stroke={isHighlighted ? "#f87171" : (node.isNew ? "#4ade80" : "#4b5563")}
                  strokeWidth={isHighlighted || node.isNew ? "3.5" : "2.5"}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isHighlighted ? 1.15 : 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ filter: isHighlighted ? "drop-shadow(0px 0px 12px rgba(248,113,113,0.5))" : (node.isNew ? "drop-shadow(0px 0px 12px rgba(74,222,128,0.5))" : "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))") }}
                />
                
                <text x="0" y="6" textAnchor="middle" className="text-xl font-bold font-handwritten fill-gray-100">
                  {node.value}
                </text>
              </g>
            );
          })}

          {/* Render Pointers */}
          {pointers.curr && nodePositions[pointers.curr] && (
            <motion.g
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              transform={`translate(${nodePositions[pointers.curr].x + 35}, ${nodePositions[pointers.curr].y - 35})`}
            >
              <text x="0" y="0" textAnchor="middle" className="font-marker font-bold fill-red-400 text-sm">curr</text>
              <path d="M -10 5 L -25 20" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrow-red)" />
            </motion.g>
          )}
          {pointers.t1 && nodePositions[pointers.t1] && (
            <motion.g
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              transform={`translate(${nodePositions[pointers.t1].x - 36}, ${nodePositions[pointers.t1].y - 35})`}
            >
              <text x="0" y="0" textAnchor="middle" className="font-marker font-bold fill-blue-400 text-sm">t1</text>
              <path d="M 10 5 L 25 20" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow-white)" />
            </motion.g>
          )}
          {pointers.t2 && nodePositions[pointers.t2] && (
            <motion.g
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              transform={`translate(${nodePositions[pointers.t2].x + 36}, ${nodePositions[pointers.t2].y - 35})`}
            >
              <text x="0" y="0" textAnchor="middle" className="font-marker font-bold fill-purple-400 text-sm">t2</text>
              <path d="M -10 5 L -25 20" stroke="#c084fc" strokeWidth="2" markerEnd="url(#arrow-white)" />
            </motion.g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default TreeVisualizer;
