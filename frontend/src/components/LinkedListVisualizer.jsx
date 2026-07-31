import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LinkedListVisualizer (Dark Mode)
 */
const LinkedListVisualizer = ({ listState = {} }) => {
  const {
    nodes = [],
    newNode = null,
    pointers = {},
    highlights = [],
  } = listState;

  const NODE_W = 140;
  const NODE_H = 60;
  const DATA_W = 70;
  const NEXT_W = 70;
  const GAP = 60;
  const NULL_W = 80;
  const SVG_PADDING = 60;

  const mainNodes = nodes;
  const totalNodes = mainNodes.length;
  const totalW = SVG_PADDING * 2 + totalNodes * NODE_W + (totalNodes) * GAP + NULL_W + (newNode ? GAP + NODE_W : 0);
  const SVG_H = 240;
  const nodeY = 100;
  const nodeX = (i) => SVG_PADDING + i * (NODE_W + GAP);
  const nullX = nodeX(totalNodes);
  const newNodeX = nullX + NULL_W + GAP;

  const POINTER_COLORS = {
    head: '#60a5fa', // lighter blue
    curr: '#f87171', // lighter red
    prev: '#4ade80', // lighter green
    next: '#c084fc', // lighter purple
    tail: '#fbbf24', // lighter yellow
  };

  const getPointerColor = (name) => POINTER_COLORS[name] || '#9ca3af';
  const highlightedIds = Array.isArray(highlights) ? highlights : [];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={Math.max(totalW, 500)}
        height={SVG_H}
        className="font-marker"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        <defs>
          <marker id="ll-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
          </marker>
          <marker id="ll-arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
          <marker id="ll-arrow-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
          </marker>
          <marker id="ll-arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4ade80" />
          </marker>
        </defs>

        {mainNodes.map((node, i) => {
          const x = nodeX(i);
          const y = nodeY;
          const isHighlighted = highlightedIds.includes(node.id);
          const borderColor = isHighlighted ? '#4ade80' : '#4b5563';
          const borderW = isHighlighted ? 3 : 2;
          const dataBg = isHighlighted ? '#064e3b' : '#1f2937';
          const nextBg = isHighlighted ? '#065f46' : '#111827';

          const badges = Object.entries(pointers)
            .filter(([, nodeId]) => nodeId === node.id)
            .map(([name]) => name);

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 25, delay: i * 0.08 }}
            >
              {badges.map((name, bi) => {
                const bx = x + DATA_W / 2;
                const by = y - 36 - bi * 22;
                const color = getPointerColor(name);
                return (
                  <g key={name}>
                    <rect x={bx - 20} y={by - 12} width={40} height={18} rx={4} fill={color} opacity={0.2} />
                    <text x={bx} y={by} textAnchor="middle" fontSize={13} fontWeight="bold" fill={color}>
                      {name}
                    </text>
                    <line x1={bx} y1={by + 6} x2={bx} y2={y - 1} stroke={color} strokeWidth={2}
                      markerEnd={`url(#ll-arrow-${name === 'head' ? 'blue' : name === 'curr' ? 'red' : 'green'})`} />
                  </g>
                );
              })}

              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={4} fill="transparent" stroke={borderColor} strokeWidth={borderW} />
              <rect x={x} y={y} width={DATA_W} height={NODE_H} rx={0} fill={dataBg} stroke="none" />
              <line x1={x + DATA_W} y1={y} x2={x + DATA_W} y2={y + NODE_H} stroke={borderColor} strokeWidth={borderW} />
              <rect x={x + DATA_W} y={y} width={NEXT_W} height={NODE_H} rx={0} fill={nextBg} stroke="none" />

              <text x={x + DATA_W / 2} y={y + NODE_H / 2 + 6} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#f3f4f6">
                {node.value}
              </text>
              <text x={x + DATA_W + NEXT_W / 2} y={y + NODE_H / 2 + 6} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#4ade80">
                {node.next === 'NULL' ? 'NULL' : node.next}
              </text>
              <text x={x + NODE_W / 2} y={y + NODE_H + 18} textAnchor="middle" fontSize={12} fill="#9ca3af">
                {node.addr}
              </text>

              {i === 0 && (
                <>
                  <text x={x + DATA_W / 2 - 30} y={y - 52} fontSize={12} fill="#9ca3af" textAnchor="middle">Data</text>
                  <line x1={x + DATA_W / 2 - 30} y1={y - 46} x2={x + DATA_W / 2} y2={y - 2} stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#ll-arrow)" />
                </>
              )}

              {i === 1 && (
                <>
                  <text x={x + DATA_W + NEXT_W / 2} y={y + NODE_H + 36} textAnchor="middle" fontSize={11} fill="#9ca3af">Address (Pointer)</text>
                  <text x={x + DATA_W + NEXT_W / 2} y={y + NODE_H + 50} textAnchor="middle" fontSize={11} fill="#9ca3af">of the next node</text>
                  <line x1={x + DATA_W + NEXT_W / 2} y1={y + NODE_H + 20} x2={x + DATA_W + NEXT_W / 2} y2={y + NODE_H + 2} stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#ll-arrow)" />
                </>
              )}

              {i < mainNodes.length - 1 && node.next !== 'NULL' && (
                <motion.line
                  key={`arrow-${node.id}`}
                  x1={x + NODE_W} y1={y + NODE_H / 2}
                  x2={nodeX(i + 1)} y2={y + NODE_H / 2}
                  stroke="#9ca3af" strokeWidth={2.5}
                  markerEnd="url(#ll-arrow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                />
              )}

              {node.next === 'NULL' && i === mainNodes.length - 1 && (
                <motion.line
                  key={`null-arrow-${node.id}`}
                  x1={x + NODE_W} y1={y + NODE_H / 2}
                  x2={nullX} y2={y + NODE_H / 2}
                  stroke="#9ca3af" strokeWidth={2.5}
                  markerEnd="url(#ll-arrow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              )}

              {node.next !== 'NULL' && node.next === listState.newNode?.addr && (
                <motion.line
                  x1={x + NODE_W} y1={y + NODE_H / 2}
                  x2={newNodeX} y2={y + NODE_H / 2}
                  stroke="#4ade80" strokeWidth={2.5}
                  markerEnd="url(#ll-arrow-green)"
                  strokeDasharray="6 3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </motion.g>
          );
        })}

        {mainNodes.length > 0 && (
          <motion.g initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <rect x={nullX} y={nodeY} width={NULL_W} height={NODE_H} rx={4} fill="#065f46" stroke="#10b981" strokeWidth={2} />
            <text x={nullX + NULL_W / 2} y={nodeY + NODE_H / 2 + 7} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#6ee7b7">NULL</text>
            <text x={nullX + NULL_W / 2 + 10} y={nodeY - 28} textAnchor="middle" fontSize={11} fill="#9ca3af">Last node points</text>
            <text x={nullX + NULL_W / 2 + 10} y={nodeY - 15} textAnchor="middle" fontSize={11} fill="#9ca3af">to NULL</text>
          </motion.g>
        )}

        <AnimatePresence>
          {newNode && (
            <motion.g
              key="new-node"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            >
              <rect x={newNodeX} y={nodeY} width={NODE_W} height={NODE_H} rx={4} fill="transparent" stroke="#6b7280" strokeWidth={2} strokeDasharray="8 4" />
              <rect x={newNodeX} y={nodeY} width={DATA_W} height={NODE_H} fill="#422006" />
              <line x1={newNodeX + DATA_W} y1={nodeY} x2={newNodeX + DATA_W} y2={nodeY + NODE_H} stroke="#6b7280" strokeWidth={2} />
              <rect x={newNodeX + DATA_W} y={nodeY} width={NEXT_W} height={NODE_H} fill="#065f46" />

              <text x={newNodeX + DATA_W / 2} y={nodeY + NODE_H / 2 + 7} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#fcd34d">
                {newNode.value}
              </text>
              <text x={newNodeX + DATA_W + NEXT_W / 2} y={nodeY + NODE_H / 2 + 7} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#4ade80">
                NULL
              </text>

              <text x={newNodeX + NODE_W / 2} y={nodeY - 18} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#fbbf24">New Node</text>
              <text x={newNodeX + NODE_W / 2} y={nodeY + NODE_H + 18} textAnchor="middle" fontSize={12} fill="#9ca3af">{newNode.addr}</text>
            </motion.g>
          )}
        </AnimatePresence>

        {mainNodes.length === 0 && !newNode && (
          <text x="50%" y="50%" textAnchor="middle" fontSize={16} fill="#6b7280">
            (empty — watching the list build...)
          </text>
        )}
      </svg>
    </div>
  );
};

export default LinkedListVisualizer;
