import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LinkedListVisualizer from './LinkedListVisualizer';
import TreeVisualizer from './TreeVisualizer';
import { StackViz, DPTableViz, BubbleSortViz } from './ExtraVisualizers';
import PatternVisualizer from './PatternVisualizer';
import GraphVisualizer from './GraphVisualizer';
import DoubleArrayViz from './DoubleArrayViz';
import Grid2DViz from './Grid2DViz';

const springTrans = { type: "spring", stiffness: 300, damping: 25 };

/**
 * Renders a hand-drawn whiteboard array with highlighted cells (Dark Mode).
 */
const ArrayViz = ({ array = [], highlight = [], i = -1, j = -1 }) => (
  <div className="flex flex-col items-start gap-2 py-4">
    <div className="text-sm font-marker text-gray-400 mb-1">Array (indices):</div>
    <div className="flex items-end gap-2 flex-wrap">
      {array.map((val, idx) => {
        const isI = idx === i;
        const isJ = idx === j;
        const isHighlighted = highlight.includes(idx);
        return (
          <div key={idx} className="flex flex-col items-center gap-1">
            <motion.div
              layout
              key={`${idx}-${val}`}
              initial={{ scale: 0.8, opacity: 0, y: 15 }}
              animate={{ scale: isHighlighted ? 1.15 : 1, opacity: 1, y: 0 }}
              transition={springTrans}
              className={`
                w-12 h-12 flex items-center justify-center
                border-3 rounded-lg font-marker text-xl font-bold
                transition-colors duration-300
                ${isHighlighted ? 'border-red-500 bg-red-900/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)] z-10' : ''}
                ${isI && !isHighlighted ? 'border-green-500 bg-green-900/40 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] z-10' : ''}
                ${isJ && !isHighlighted ? 'border-blue-500 bg-blue-900/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] z-10' : ''}
                ${!isHighlighted && !isI && !isJ ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
              `}
            >
              {val}
            </motion.div>
            <span className="text-sm font-handwritten text-gray-500">{idx}</span>
            <div className="flex flex-col items-center text-sm font-marker leading-none min-h-[20px]">
              {isI && <motion.span initial={{y:5, opacity:0}} animate={{y:0, opacity:1}} className="text-green-500 font-bold">↑i</motion.span>}
              {isJ && <motion.span initial={{y:5, opacity:0}} animate={{y:0, opacity:1}} className="text-blue-500 font-bold">↑j</motion.span>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * Renders a hash map visualization (Dark Mode).
 */
const HashMapViz = ({ array = [], map = {}, i = -1, found = null }) => (
  <div className="flex flex-col gap-6 py-2">
    {/* Array row */}
    <div className="flex flex-col gap-2">
      <div className="text-sm font-marker text-gray-400">Array:</div>
      <div className="flex gap-2 flex-wrap">
        {array.map((val, idx) => {
          const isI = idx === i;
          const isFound = found && (idx === found[0] || idx === found[1]);
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <motion.div
                key={`${idx}-${val}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: isFound ? 1.2 : (isI ? 1.1 : 1), opacity: 1 }}
                transition={springTrans}
                className={`
                  w-12 h-12 flex items-center justify-center border-3 rounded-lg font-marker text-xl font-bold transition-all duration-300
                  ${isFound ? 'border-green-500 bg-green-900/40 text-green-400 shadow-[0_0_25px_rgba(34,197,94,0.6)] z-10' : ''}
                  ${isI && !isFound ? 'border-red-500 bg-red-900/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] z-10' : ''}
                  ${!isI && !isFound ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                `}
              >
                {val}
              </motion.div>
              <span className="text-sm font-handwritten text-gray-500">{idx}</span>
              <div className="min-h-[20px]">
                {isI && <motion.span initial={{y:5, opacity:0}} animate={{y:0, opacity:1}} className="text-sm text-red-500 font-marker font-bold">↑i</motion.span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Hash Map table */}
    <div className="flex flex-col gap-2">
      <div className="text-sm font-marker text-gray-400">Hash Map (value → index):</div>
      <div className="border-3 border-gray-600 rounded-xl inline-block min-w-[240px] overflow-hidden shadow-md">
        <div className="flex border-b-3 border-gray-600 bg-yellow-900/20">
          <div className="px-5 py-2 font-marker text-sm font-bold border-r-3 border-gray-600 w-1/2 text-gray-300">Value</div>
          <div className="px-5 py-2 font-marker text-sm font-bold w-1/2 text-gray-300">Index</div>
        </div>
        <div className="bg-[#1e1e2e]">
          <AnimatePresence>
            {Object.entries(map).length === 0 ? (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="px-5 py-4 text-gray-500 font-handwritten italic text-lg">(empty)</motion.div>
            ) : (
              Object.entries(map).map(([key, val], idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20, backgroundColor: '#422006' }}
                  animate={{ opacity: 1, x: 0, backgroundColor: '#1e1e2e' }}
                  transition={{ ...springTrans, delay: 0.1 }}
                  className={`flex ${idx > 0 ? 'border-t-2 border-dashed border-gray-600' : ''}`}
                >
                  <div className="px-5 py-2 font-mono text-base font-bold text-purple-400 border-r-3 border-gray-600 w-1/2">{key}</div>
                  <div className="px-5 py-2 font-mono text-base font-bold text-blue-400 w-1/2">{val}</div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <AnimatePresence>
      {found && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springTrans}
          className="border-3 border-green-500 bg-green-900/20 rounded-xl px-5 py-3 text-lg font-marker text-green-400 shadow-lg inline-block w-max self-start"
        >
          ✅ Pair found at indices <strong className="text-green-300 bg-green-900/40 px-2 rounded">[{found[0]}, {found[1]}]</strong>!
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/**
 * Renders a two-pointer visualization (Dark Mode).
 */
const TwoPointerViz = ({ array = [], left = -1, right = -1, maxWater = 0, area = null, highlight = [], done = false, label = ["L","R"] }) => (
  <div className="flex flex-col gap-6 py-2">
    <div className="flex flex-col gap-2">
      <div className="text-sm font-marker text-gray-400">Array (Two Pointers):</div>
      <div className="flex gap-2 flex-wrap items-end">
        {array.map((val, idx) => {
          const isLeft = idx === left;
          const isRight = idx === right;
          const isHighlighted = highlight.includes(idx);
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <motion.div
                layout
                key={`${idx}-${val}`}
                animate={{ scale: isHighlighted || isLeft || isRight ? 1.15 : 1, y: isHighlighted ? -5 : 0 }}
                transition={springTrans}
                className={`
                  w-12 h-12 flex items-center justify-center border-3 rounded-lg font-marker text-xl font-bold transition-all duration-300
                  ${done && isHighlighted ? 'border-green-500 bg-green-900/40 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] z-10' : ''}
                  ${isLeft && !done ? 'border-blue-500 bg-blue-900/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] z-10' : ''}
                  ${isRight && !done ? 'border-red-500 bg-red-900/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-10' : ''}
                  ${!isLeft && !isRight && !isHighlighted ? 'border-gray-600 bg-[#1e1e2e] text-gray-200 shadow-sm' : ''}
                  ${isHighlighted && isLeft ? 'border-blue-500 bg-blue-900/40 text-blue-300 ring-4 ring-blue-500/50 z-10' : ''}
                  ${isHighlighted && isRight ? 'border-red-500 bg-red-900/40 text-red-300 ring-4 ring-red-500/50 z-10' : ''}
                `}
              >
                {val}
              </motion.div>
              <span className="text-sm font-handwritten text-gray-500">{idx}</span>
              <div className="flex flex-col items-center leading-none min-h-[20px]">
                {isLeft && <motion.span initial={{y:5,opacity:0}} animate={{y:0,opacity:1}} className="text-sm text-blue-400 font-marker font-bold">↑{label[0]}</motion.span>}
                {isRight && <motion.span initial={{y:5,opacity:0}} animate={{y:0,opacity:1}} className="text-sm text-red-400 font-marker font-bold">↑{label[1]}</motion.span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    
    <AnimatePresence mode="wait">
      {area !== null && (
        <motion.div
          key={area}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={springTrans}
          className="font-marker text-lg border-3 border-dashed border-gray-600 bg-yellow-900/20 shadow-md inline-flex gap-8 px-6 py-3 rounded-xl w-max self-start text-gray-300"
        >
          <span>Area = <strong className="text-blue-400 text-xl">{area}</strong></span>
          <span>Max = <strong className="text-green-400 text-xl">{maxWater}</strong></span>
        </motion.div>
      )}
    </AnimatePresence>

    {done && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="font-marker text-green-400 border-3 border-green-500 bg-green-900/20 px-5 py-2 rounded-xl shadow-lg w-max">
        ✅ Done!
      </motion.div>
    )}
  </div>
);

const SUDOKU_INITIAL_BOARD = [
  ["5","3",".",".","7",".",".",".","."],
  ["6",".",".","1","9","5",".",".","."],
  [".","9","8",".",".",".",".","6","."],
  ["8",".",".",".","6",".",".",".","3"],
  ["4",".",".","8",".","3",".",".","1"],
  ["7",".",".",".","2",".",".",".","6"],
  [".","6",".",".",".",".","2","8","."],
  [".",".",".","4","1","9",".",".","5"],
  [".",".",".",".","8",".",".","7","9"]
];

const SUDOKU_SOLVED_BOARD = [
  ["5","3","4","6","7","8","9","1","2"],
  ["6","7","2","1","9","5","3","4","8"],
  ["1","9","8","3","4","2","5","6","7"],
  ["8","5","9","7","6","1","4","2","3"],
  ["4","2","6","8","5","3","7","9","1"],
  ["7","1","3","9","2","4","8","5","6"],
  ["9","6","1","5","3","7","2","8","4"],
  ["2","8","7","4","1","9","6","3","5"],
  ["3","4","5","2","8","6","1","7","9"]
];

const resolveSudokuBoard = (board) => {
  if (Array.isArray(board)) return board;
  if (String(board).toLowerCase().includes('solved')) return SUDOKU_SOLVED_BOARD;
  if (String(board).toLowerCase().includes('first empty filled')) {
    return SUDOKU_INITIAL_BOARD.map((row, r) => row.map((cell, c) => (r === 0 && c === 2 ? "1" : cell)));
  }
  return SUDOKU_INITIAL_BOARD;
};

const SudokuBoardViz = ({ board = [], highlight = [], visited = [], result = null, label = "Sudoku Board" }) => {
  const resolvedBoard = resolveSudokuBoard(board);
  const highlighted = (r, c) => highlight.some(cell => cell.r === r && cell.c === c);
  const seen = (r, c) => visited.some(cell => cell.r === r && cell.c === c);

  return (
    <div className="flex flex-col gap-5 py-2 font-marker">
      <div className="text-sm text-gray-400">{label}:</div>
      <div className="inline-grid grid-cols-9 gap-0 border-4 border-gray-300 bg-gray-300 rounded-md overflow-hidden w-max">
        {resolvedBoard.map((row, r) => row.map((val, c) => {
          const isHighlighted = highlighted(r, c);
          const isSeen = seen(r, c);
          const thickRight = c === 2 || c === 5;
          const thickBottom = r === 2 || r === 5;
          return (
            <motion.div
              key={`${r}-${c}-${val}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: isHighlighted ? 1.12 : 1, opacity: 1 }}
              transition={springTrans}
              className={`
                w-10 h-10 flex items-center justify-center font-mono text-lg font-bold
                border border-gray-700
                ${thickRight ? 'border-r-4 border-r-gray-200' : ''}
                ${thickBottom ? 'border-b-4 border-b-gray-200' : ''}
                ${isHighlighted ? 'bg-yellow-900 text-yellow-200 shadow-[0_0_14px_rgba(250,204,21,0.55)] z-10' : ''}
                ${isSeen && !isHighlighted ? 'bg-blue-900/60 text-blue-200' : ''}
                ${!isHighlighted && !isSeen ? 'bg-[#111827] text-gray-200' : ''}
              `}
            >
              {val === "." ? <span className="text-gray-600">·</span> : val}
            </motion.div>
          );
        }))}
      </div>
      {result !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-fit border-3 border-green-500 bg-green-900/30 rounded-xl px-5 py-2 text-green-300 text-lg"
        >
          ✅ {result}
        </motion.div>
      )}
    </div>
  );
};

const TextBuildViz = ({ content = "", groups = [], note = "", result = null }) => (
  <div className="flex flex-col gap-5 py-2 font-marker">
    <div className="text-sm text-gray-400">String being built:</div>
    <div className="flex flex-wrap gap-2 items-end">
      {String(content).split('').map((ch, idx) => (
        <motion.div
          key={`${idx}-${ch}`}
          initial={{ scale: 0.65, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ ...springTrans, delay: idx * 0.04 }}
          className="w-12 h-12 flex items-center justify-center border-3 border-blue-500 bg-blue-900/30 text-blue-200 rounded-lg text-2xl font-bold"
        >
          {ch}
        </motion.div>
      ))}
    </div>
    {groups.length > 0 && (
      <div className="flex flex-wrap gap-3">
        {groups.map((group, idx) => (
          <span key={`${idx}-${group}`} className="px-3 py-1 rounded-lg border-2 border-purple-500 bg-purple-900/30 text-purple-200">
            {group}
          </span>
        ))}
      </div>
    )}
    {(note || result !== null) && (
      <div className="w-fit max-w-full border-3 border-dashed border-yellow-500 bg-yellow-900/20 rounded-xl px-5 py-3 text-yellow-200 text-lg">
        ✍️ {note || `Result = ${result}`}
      </div>
    )}
  </div>
);

const ListViz = ({ items = [], label = "List", activeIndex = -1, note = "" }) => (
  <div className="flex flex-col gap-5 py-2 font-marker">
    <div className="text-sm text-gray-400">{label}:</div>
    <div className="flex flex-wrap gap-3">
      {items.length === 0 ? (
        <span className="text-gray-500 italic">(empty)</span>
      ) : items.map((item, idx) => (
        <motion.div
          key={`${idx}-${JSON.stringify(item)}`}
          initial={{ opacity: 0, y: 12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: idx === activeIndex ? 1.08 : 1 }}
          transition={springTrans}
          className={`
            px-4 py-2 rounded-xl border-3 text-lg font-bold
            ${idx === activeIndex ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200' : 'border-green-500 bg-green-900/20 text-green-200'}
          `}
        >
          {Array.isArray(item) ? `[${item.join(', ')}]` : String(item)}
        </motion.div>
      ))}
    </div>
    {note && <div className="w-fit border-3 border-dashed border-blue-500 bg-blue-900/20 rounded-xl px-5 py-3 text-blue-200">✍️ {note}</div>}
  </div>
);

/**
 * CombinationSum2Viz — shows the sorted candidates, current recursion path,
 * duplicate skip, and collected answers for Combination Sum II.
 */
const CombinationSum2Viz = ({
  candidates = [],
  start = 0,
  i = -1,
  path = [],
  sum = 0,
  target = 0,
  results = [],
  note = "",
  skip = false,
  found = false,
  backtrack = false
}) => (
  <div className="flex flex-col gap-6 py-2 font-marker">
    <div className="flex flex-col gap-2">
      <div className="text-sm text-gray-400">Sorted candidates:</div>
      <div className="flex flex-wrap items-end gap-2">
        {candidates.map((val, idx) => {
          const isCurrent = idx === i;
          const isBeforeStart = idx < start;
          const isDuplicateSkip = skip && isCurrent;
          return (
            <div key={`${idx}-${val}`} className="flex flex-col items-center gap-1">
              <motion.div
                layout
                animate={{
                  scale: isCurrent ? 1.16 : 1,
                  y: isCurrent ? -4 : 0,
                  opacity: isBeforeStart ? 0.45 : 1
                }}
                transition={springTrans}
                className={`
                  w-12 h-12 flex items-center justify-center border-3 rounded-lg text-xl font-bold
                  ${isDuplicateSkip ? 'border-orange-400 bg-orange-900/40 text-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.45)]' : ''}
                  ${isCurrent && !isDuplicateSkip ? 'border-yellow-400 bg-yellow-900/40 text-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.45)]' : ''}
                  ${!isCurrent && !isBeforeStart ? 'border-gray-600 bg-[#1e1e2e] text-gray-200' : ''}
                  ${!isCurrent && isBeforeStart ? 'border-gray-700 bg-[#111827] text-gray-500' : ''}
                `}
              >
                {val}
              </motion.div>
              <span className="text-sm font-handwritten text-gray-500">{idx}</span>
              <div className="min-h-[22px] text-xs leading-none">
                {idx === start && <span className="text-blue-400 font-bold">start</span>}
                {isCurrent && <div className={isDuplicateSkip ? 'text-orange-300 font-bold' : 'text-yellow-300 font-bold'}>↑ i</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div
        layout
        className="border-3 border-dashed border-purple-500/70 bg-purple-900/20 rounded-xl p-4 min-h-[118px]"
      >
        <div className="text-sm text-purple-300 mb-3">Current recursion path:</div>
        <div className="flex flex-wrap gap-2 items-center">
          {path.length === 0 ? (
            <span className="text-gray-500 italic">(empty)</span>
          ) : (
            path.map((num, idx) => (
              <motion.span
                key={`${idx}-${num}`}
                initial={{ scale: 0.7, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={springTrans}
                className="px-3 py-1 rounded-lg border-2 border-purple-400 bg-purple-950/60 text-purple-100 text-lg font-bold"
              >
                {num}
              </motion.span>
            ))
          )}
        </div>
        <div className="mt-4 text-sm text-gray-300">
          sum = <span className={sum === target ? 'text-green-300 font-bold' : sum > target ? 'text-red-300 font-bold' : 'text-yellow-300 font-bold'}>{sum}</span>
          <span className="text-gray-500"> / target {target}</span>
        </div>
      </motion.div>

      <motion.div
        layout
        className="border-3 border-dashed border-green-500/70 bg-green-900/20 rounded-xl p-4 min-h-[118px]"
      >
        <div className="text-sm text-green-300 mb-3">Result combinations:</div>
        <div className="flex flex-wrap gap-2">
          {results.length === 0 ? (
            <span className="text-gray-500 italic">(none yet)</span>
          ) : (
            results.map((combo, idx) => (
              <motion.span
                key={`${idx}-${combo.join('-')}`}
                initial={{ scale: 0.75, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ ...springTrans, delay: idx * 0.05 }}
                className="px-3 py-1 rounded-lg border-2 border-green-400 bg-green-950/60 text-green-100 font-bold"
              >
                [{combo.join(', ')}]
              </motion.span>
            ))
          )}
        </div>
      </motion.div>
    </div>

    <motion.div
      key={note}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTrans}
      className={`
        inline-block w-fit max-w-full rounded-xl border-3 px-5 py-3 text-lg
        ${found ? 'border-green-500 bg-green-900/30 text-green-300' : ''}
        ${skip ? 'border-orange-400 bg-orange-900/30 text-orange-300' : ''}
        ${backtrack ? 'border-red-400 bg-red-900/30 text-red-300' : ''}
        ${!found && !skip && !backtrack ? 'border-blue-500 bg-blue-900/20 text-blue-300' : ''}
      `}
    >
      ✍️ {note}
    </motion.div>
  </div>
);

/**
 * Master VisualRenderer
 */
const VisualRenderer = ({ visual }) => {
  if (!visual) return null;

  switch (visual.type) {
    case 'array':
      return (
        <ArrayViz 
          array={visual.array} 
          highlight={visual.highlights || visual.highlight || []} 
          i={visual.pointers?.i ?? visual.pointers?.scan ?? visual.i} 
          j={visual.pointers?.j ?? visual.j} 
        />
      );
    case 'hashmap':
      return (
        <HashMapViz 
          array={visual.array} 
          map={visual.map || {}} 
          i={visual.pointers?.i ?? visual.i} 
          found={visual.success ? (visual.highlights || visual.highlight) : null} 
        />
      );
    case 'twopointer':
      return (
        <TwoPointerViz
          array={visual.array}
          left={visual.pointers?.L ?? visual.left}
          right={visual.pointers?.R ?? visual.right}
          maxWater={visual.boxes?.find(b => b.label === "Max Water")?.value ?? visual.maxWater}
          area={visual.boxes?.find(b => b.label === "Area")?.value ?? null}
          highlight={visual.highlights || visual.highlight || []}
          done={visual.success ?? visual.done}
          label={visual.label || ["L","R"]}
        />
      );
    case 'linkedlist':
      return <LinkedListVisualizer listState={visual} />;
    case 'tree':
      return <TreeVisualizer treeState={visual} />;
    case 'stack':
      return <StackViz {...visual} />;
    case 'dp':
      return <DPTableViz {...visual} />;
    case 'bubblesort':
      return <BubbleSortViz {...visual} />;
    case 'pattern':
      return <PatternVisualizer {...visual} />;
    case 'graph':
      return <GraphVisualizer {...visual} />;
    case 'doublearray':
      return <DoubleArrayViz {...visual} />;
    case 'grid2d':
      return <Grid2DViz {...visual} />;
    case 'grid':
      return <SudokuBoardViz {...visual} />;
    case 'text':
      return <TextBuildViz {...visual} />;
    case 'list':
      return <ListViz {...visual} />;
    case 'combinationSum2':
      return <CombinationSum2Viz {...visual} />;
    default:
      return (
        <div className="p-4 border-2 border-dashed border-red-500 bg-red-900/20 text-red-400 font-marker rounded">
          ⚠️ Unknown visual type: {visual.type}
        </div>
      );
  }
};

export default VisualRenderer;
