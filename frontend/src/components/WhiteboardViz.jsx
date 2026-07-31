import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Shared SVGs & Layout Constants ---

const HandDrawnBox = ({ x, y, width, height, stroke = "black", fill = "white", strokeWidth = 2 }) => {
  // Add a slight hand-drawn wiggle
  const path = `M ${x+2} ${y+2} L ${x+width-2} ${y+1} L ${x+width-1} ${y+height-2} L ${x+1} ${y+height-1} Z`;
  return (
    <motion.path
      d={path}
      stroke={stroke}
      fill={fill}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
};

const HandDrawnArrow = ({ x1, y1, x2, y2, stroke = "black" }) => {
  // Arrow head calculation
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 10;
  const h1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const h1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const h2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const h2y = y2 - headLen * Math.sin(angle + Math.PI / 6);

  const path = `M ${x1} ${y1} Q ${(x1+x2)/2 + 10} ${(y1+y2)/2 - 10} ${x2} ${y2}`;
  const headPath = `M ${h1x} ${h1y} L ${x2} ${y2} L ${h2x} ${h2y}`;

  return (
    <g>
      <motion.path
        d={path}
        stroke={stroke}
        fill="none"
        strokeWidth={2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
      />
      <motion.path
        d={headPath}
        stroke={stroke}
        fill="none"
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
    </g>
  );
};

// --- Array Visualizer ---
const ArrayViz = ({ array, pointers, highlights, boxes = [], success }) => {
  const cellW = 50;
  const cellH = 40;
  const startX = 400 - (array.length * cellW) / 2;
  const startY = 200;

  return (
    <svg width="800" height="400" className="w-full h-full">
      {/* Draw Array Cells */}
      {array.map((val, idx) => {
        const isHighlight = highlights.includes(idx);
        const stroke = success && isHighlight ? "green" : "black";
        return (
          <g key={idx}>
            <HandDrawnBox x={startX + idx * cellW} y={startY} width={cellW} height={cellH} stroke={stroke} />
            <text x={startX + idx * cellW + cellW/2} y={startY + cellH/2 + 5} textAnchor="middle" className="font-marker text-lg" fill={stroke}>
              {val}
            </text>
            <text x={startX + idx * cellW + cellW/2} y={startY + cellH + 15} textAnchor="middle" className="font-handwritten text-sm text-gray-500">
              {idx}
            </text>
          </g>
        );
      })}

      {/* Draw Pointers */}
      {Object.entries(pointers).map(([label, idx]) => {
        if (typeof idx !== 'number') return null; // skip 'dest' or 'scan' if not direct pointer
        const px = startX + idx * cellW + cellW/2;
        return (
          <g key={label}>
            <text x={px} y={startY - 25} textAnchor="middle" className="font-marker text-blue-600 font-bold">{label}</text>
            <HandDrawnArrow x1={px} y1={startY - 20} x2={px} y2={startY - 2} stroke="blue" />
          </g>
        );
      })}

      {/* Draw Boxes (e.g., Max Water) */}
      {boxes.map((box, idx) => (
        <g key={idx}>
          <HandDrawnBox x={350} y={50} width={100} height={40} />
          <text x={330} y={75} textAnchor="end" className="font-marker text-black">{box.label}:</text>
          <text x={400} y={75} textAnchor="middle" className="font-marker text-xl font-bold">{box.value}</text>
        </g>
      ))}
    </svg>
  );
};

// --- Hash Map Visualizer ---
const HashMapViz = ({ array, target, map, pointers, highlights, success }) => {
  const cellW = 50;
  const cellH = 40;
  const startX = 400 - (array.length * cellW) / 2;
  const startY = 100;

  const mapStartX = 300;
  const mapStartY = 220;

  return (
    <svg width="800" height="400" className="w-full h-full">
      {/* Target Variable Box */}
      <HandDrawnBox x={350} y={20} width={60} height={30} />
      <text x={330} y={40} textAnchor="end" className="font-marker">target</text>
      <text x={380} y={42} textAnchor="middle" className="font-marker font-bold">{target}</text>

      {/* Draw Array */}
      {array.map((val, idx) => {
        const isHighlight = highlights.includes(idx);
        const stroke = success && isHighlight ? "green" : "black";
        return (
          <g key={idx}>
            <HandDrawnBox x={startX + idx * cellW} y={startY} width={cellW} height={cellH} stroke={stroke} />
            <text x={startX + idx * cellW + cellW/2} y={startY + cellH/2 + 5} textAnchor="middle" className="font-marker text-lg" fill={stroke}>
              {val}
            </text>
            <text x={startX + idx * cellW + cellW/2} y={startY + cellH + 15} textAnchor="middle" className="font-handwritten text-sm text-gray-500">
              {idx}
            </text>
          </g>
        );
      })}

      {/* Pointers for Array */}
      {pointers.i !== undefined && (
        <g>
          <text x={startX + pointers.i * cellW + cellW/2} y={startY - 25} textAnchor="middle" className="font-marker text-blue-600 font-bold">i</text>
          <HandDrawnArrow x1={startX + pointers.i * cellW + cellW/2} y1={startY - 20} x2={startX + pointers.i * cellW + cellW/2} y2={startY - 2} stroke="blue" />
        </g>
      )}

      {/* Draw Hash Map Table */}
      <text x={400} y={mapStartY - 10} textAnchor="middle" className="font-marker text-gray-600">Hash Map (value → index)</text>
      <HandDrawnBox x={mapStartX} y={mapStartY} width={200} height={30} />
      <text x={mapStartX + 50} y={mapStartY + 20} textAnchor="middle" className="font-marker text-sm">Value</text>
      <text x={mapStartX + 150} y={mapStartY + 20} textAnchor="middle" className="font-marker text-sm">Index</text>
      
      {Object.entries(map).map(([key, val], idx) => (
        <g key={key}>
          <HandDrawnBox x={mapStartX} y={mapStartY + 30 + idx * 30} width={100} height={30} />
          <HandDrawnBox x={mapStartX + 100} y={mapStartY + 30 + idx * 30} width={100} height={30} />
          <text x={mapStartX + 50} y={mapStartY + 50 + idx * 30} textAnchor="middle" className="font-marker font-bold text-purple-700">{key}</text>
          <text x={mapStartX + 150} y={mapStartY + 50 + idx * 30} textAnchor="middle" className="font-marker font-bold text-blue-700">{val}</text>
        </g>
      ))}
    </svg>
  );
};

// --- Linked List Visualizer ---
const LinkedListViz = ({ nodes, newNode, pointers, highlights, success }) => {
  const nodeW = 80;
  const nodeH = 40;
  const gap = 60;
  
  // Calculate positions
  const positions = {};
  nodes.forEach((n, idx) => {
    positions[n.id] = { x: 100 + idx * (nodeW + gap), y: 150 };
  });

  if (newNode) {
    positions[newNode.id] = { x: 100 + nodes.length * (nodeW + gap), y: 250 };
  }

  return (
    <svg width="800" height="400" className="w-full h-full">
      {/* Draw existing nodes */}
      {nodes.map((n, idx) => {
        const { x, y } = positions[n.id];
        const isHighlight = highlights?.includes(n.id);
        const stroke = success && isHighlight ? "green" : "black";
        
        return (
          <g key={n.id}>
            {/* Value box */}
            <HandDrawnBox x={x} y={y} width={nodeW/2} height={nodeH} stroke={stroke} />
            <text x={x + nodeW/4} y={y + 25} textAnchor="middle" className="font-marker text-lg">{n.value}</text>
            
            {/* Next pointer box */}
            <HandDrawnBox x={x + nodeW/2} y={y} width={nodeW/2} height={nodeH} stroke={stroke} />
            
            {/* Address below */}
            <text x={x + nodeW/2} y={y + nodeH + 15} textAnchor="middle" className="font-handwritten text-xs text-gray-500">{n.addr}</text>

            {/* Arrow to next */}
            {n.next !== "NULL" && (
              <HandDrawnArrow x1={x + nodeW} y1={y + nodeH/2} x2={x + nodeW + gap - 10} y2={y + nodeH/2} />
            )}
            {n.next === "NULL" && (
              <text x={x + (nodeW*3)/4} y={y + 25} textAnchor="middle" className="font-handwritten text-sm">NULL</text>
            )}
          </g>
        );
      })}

      {/* Draw New Node */}
      {newNode && (
        <g>
          <HandDrawnBox x={positions[newNode.id].x} y={positions[newNode.id].y} width={nodeW/2} height={nodeH} stroke="purple" />
          <text x={positions[newNode.id].x + nodeW/4} y={positions[newNode.id].y + 25} textAnchor="middle" className="font-marker text-lg">{newNode.value}</text>
          
          <HandDrawnBox x={positions[newNode.id].x + nodeW/2} y={positions[newNode.id].y} width={nodeW/2} height={nodeH} stroke="purple" />
          <text x={positions[newNode.id].x + (nodeW*3)/4} y={positions[newNode.id].y + 25} textAnchor="middle" className="font-handwritten text-sm">NULL</text>

          <text x={positions[newNode.id].x + nodeW/2} y={positions[newNode.id].y + nodeH + 15} textAnchor="middle" className="font-handwritten text-xs text-purple-500">{newNode.addr}</text>
        </g>
      )}

      {/* Draw Pointers (head, curr) */}
      {Object.entries(pointers).map(([label, nodeId], idx) => {
        const pos = positions[nodeId];
        if (!pos) return null;
        const py = pos.y - 40 - (idx * 20); // Stack if multiple
        return (
          <g key={label}>
            <text x={pos.x + nodeW/2} y={py} textAnchor="middle" className="font-marker text-blue-600 font-bold">{label}</text>
            <HandDrawnArrow x1={pos.x + nodeW/2} y1={py + 5} x2={pos.x + nodeW/2} y2={pos.y - 5} stroke="blue" />
          </g>
        );
      })}
    </svg>
  );
};

// --- Tree Visualizer ---
const HandDrawnCircle = ({ cx, cy, r, stroke = "black", fill = "white" }) => {
  const path = `M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy} A ${r} ${r} 0 1 1 ${cx-r} ${cy}`;
  return (
    <motion.path
      d={path}
      stroke={stroke}
      fill={fill}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
}

const TreeViz = ({ nodes, boxes, pointers, highlights, success }) => {
  // Hardcode positions for this specific simple tree for demo purposes
  const positions = {
    "n1": { cx: 400, cy: 100 },
    "n2": { cx: 300, cy: 200 },
    "n3": { cx: 500, cy: 200 },
    "n4": { cx: 450, cy: 300 } // new node 25
  };

  return (
    <svg width="800" height="400" className="w-full h-full">
      {/* Draw Edges first so they are under nodes */}
      {nodes.map(n => {
        const p1 = positions[n.id];
        return (
          <g key={`edges-${n.id}`}>
            {n.left && positions[n.left] && (
              <HandDrawnArrow x1={p1.cx - 15} y1={p1.cy + 15} x2={positions[n.left].cx + 15} y2={positions[n.left].cy - 15} />
            )}
            {n.right && positions[n.right] && (
              <HandDrawnArrow x1={p1.cx + 15} y1={p1.cy + 15} x2={positions[n.right].cx - 15} y2={positions[n.right].cy - 15} />
            )}
          </g>
        );
      })}

      {/* Draw Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        const isHighlight = highlights?.includes(n.id);
        const stroke = success && isHighlight ? "green" : (n.isNew ? "purple" : "black");
        return (
          <g key={n.id}>
            <HandDrawnCircle cx={pos.cx} cy={pos.cy} r={20} stroke={stroke} />
            <text x={pos.cx} y={pos.cy + 5} textAnchor="middle" className="font-marker font-bold" fill={stroke}>{n.value}</text>
          </g>
        );
      })}

      {/* Draw Pointers */}
      {Object.entries(pointers).map(([label, nodeId], idx) => {
        if (label === 'next') return null; // Skip 'next' action text
        const pos = positions[nodeId];
        if (!pos) return null;
        return (
          <g key={label}>
            <text x={pos.cx + 40} y={pos.cy - 10} textAnchor="start" className="font-marker text-blue-600 font-bold">{label}</text>
            <HandDrawnArrow x1={pos.cx + 45} y1={pos.cy - 5} x2={pos.cx + 25} y2={pos.cy} stroke="blue" />
          </g>
        );
      })}

      {/* Draw Variables (boxes) */}
      {boxes.map((box, idx) => (
        <g key={idx}>
          <HandDrawnBox x={50} y={50} width={60} height={40} />
          <text x={40} y={75} textAnchor="end" className="font-marker">{box.label}:</text>
          <text x={80} y={75} textAnchor="middle" className="font-marker text-xl font-bold">{box.value}</text>
        </g>
      ))}
    </svg>
  );
};

export default function WhiteboardViz({ visual }) {
  if (!visual) return null;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={JSON.stringify(visual)} // re-render animation on change
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full flex items-center justify-center"
        >
          {visual.type === "hashmap" && <HashMapViz {...visual} />}
          {visual.type === "array" && <ArrayViz {...visual} />}
          {visual.type === "linkedlist" && <LinkedListViz {...visual} />}
          {visual.type === "tree" && <TreeViz {...visual} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
