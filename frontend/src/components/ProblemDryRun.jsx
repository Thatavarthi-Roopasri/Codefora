import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Square, ChevronRight, ChevronLeft } from 'lucide-react';
import VisualRenderer from './VisualRenderer';

const SPEEDS = [0.5, 1, 2, 5];
const BASE_DELAY_MS = 1200;

const DIFFICULTY_COLOR = {
  Easy: 'text-green-400 border-green-500 bg-green-900/20',
  Medium: 'text-yellow-400 border-yellow-500 bg-yellow-900/20',
  Hard: 'text-red-400 border-red-500 bg-red-900/20',
};

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
    <div className="w-full h-full flex flex-col bg-[#0f172a]">
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
              <pre className={`relative z-10 whitespace-pre-wrap break-words py-[3px] pr-4 flex-1 min-w-0 ${isActive ? 'text-yellow-200 font-bold' : 'text-gray-300'}`} style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}>
                {line}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ProblemDryRun — the complete whiteboard dry-run player for a single problem.
 */
const ProblemDryRun = ({ problem, onNext, onPrev, problemIndex, totalProblems }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showPseudo, setShowPseudo] = useState(false);
  const timerRef = useRef(null);

  const { steps } = problem;
  const hasCode = Boolean(problem.code);
  const codeLines = hasCode ? problem.code.split('\n') : [];
  const totalSteps = steps?.length || 0;
  const currentStep = steps?.[stepIndex] || {};
  const pseudoCode = problem.pseudoCode || [];
  const activePseudoLine = currentStep.pseudoLine ?? -1;

  // Auto-advance on play
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (stepIndex < totalSteps - 1) {
          setStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, BASE_DELAY_MS / speed);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, stepIndex, speed, totalSteps]);

  // Reset when problem changes
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [problem]);

  const play = useCallback(() => {
    if (stepIndex >= totalSteps - 1) setStepIndex(0);
    setIsPlaying(true);
  }, [stepIndex, totalSteps]);

  const pause = () => setIsPlaying(false);
  const stop = () => { setIsPlaying(false); setStepIndex(0); };
  const next = () => setStepIndex(p => Math.min(p + 1, totalSteps - 1));
  const prev = () => setStepIndex(p => Math.max(p - 1, 0));

  return (
    <div className="w-full min-h-screen bg-[#000000] p-4 font-handwritten">
      <div className="bg-[#111111] border-2 border-gray-800 rounded-xl shadow-2xl max-w-7xl mx-auto">

        {/* Problem Info Bar */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-[#0a0a0a] border-b-2 border-dashed border-gray-800 rounded-t-xl">
          <h2 className="text-xl font-marker font-bold text-gray-100">{problem.title}</h2>
          {problem.difficulty && (
            <span className={`px-2 py-0.5 border-2 rounded text-xs font-marker font-bold ${DIFFICULTY_COLOR[problem.difficulty] || 'text-gray-400 border-gray-700'}`}>
              {problem.difficulty}
            </span>
          )}
          {problem.tags?.map(t => (
            <span key={t} className="px-2 py-0.5 border border-blue-800 bg-blue-900/20 text-blue-400 text-xs font-marker rounded">
              #{t}
            </span>
          ))}
          <div className="ml-auto text-sm font-handwritten text-gray-400">
            <span className="font-bold text-gray-200">Input:</span> {problem.input || 'N/A'}
            &nbsp;&nbsp;
            <span className="font-bold text-gray-200">Expected:</span> {problem.output || 'N/A'}
          </div>
        </div>


        {/* ── Main Content ── */}
        <div className="flex flex-col lg:flex-row gap-0 min-h-[600px]">

          {/* Toggle pseudo code sidebar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border-b-2 border-dashed border-gray-800">
            <button
              onClick={() => setShowPseudo(prev => !prev)}
              className="px-3 py-1 border-2 border-indigo-500 rounded bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50 transition"
            >
              {showPseudo ? 'Hide Pseudo Code' : 'Show Pseudo Code'}
            </button>
          </div>

          {/* CENTER: Whiteboard panel */}
          <div className="w-full flex flex-col">

            {/* Professor's Step Explanation — BIGGER */}
            <div className="px-6 py-6 border-b-2 border-dashed border-gray-800 bg-[#161616] min-h-[110px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl font-handwritten text-yellow-300 font-bold leading-snug"
                >
                  ✍️ {currentStep.explanation}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Visualizer + Pseudo Code side by side */}
            <div className="flex flex-row flex-1 overflow-hidden">
              {/* Visualizer area */}
              <div className={`flex-1 p-6 overflow-auto relative min-w-0 bg-[#0a0a0a] ${showPseudo ? 'lg:w-[52%]' : 'w-full'}`}>
                <VisualRenderer visual={currentStep.visual} />
              </div>

              {/* Pseudo Code Sidebar */}
              {showPseudo && (
                <div className="w-[48%] min-w-[520px] border-l-2 border-gray-800 p-3 overflow-hidden bg-[#0a0a0a]">
                  <PseudoCodePanel pseudoCode={pseudoCode} activeLine={activePseudoLine} />
                </div>
              )}
            </div>


            {/* Variables sidebar */}
            {currentStep.variables && Object.keys(currentStep.variables).length > 0 && (
              <div className="border-t-2 border-dashed border-gray-800 px-5 py-3 bg-[#111111]">
                <div className="text-xs font-marker text-gray-500 mb-1.5">📋 Current Variables:</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {Object.entries(currentStep.variables).map(([k, v]) => (
                    <motion.div key={`${k}-${v}`}
                      initial={{ scale: 1.2, color: '#f87171' }}
                      animate={{ scale: 1, color: '#e5e7eb' }}
                      transition={{ duration: 0.4 }}
                      className="font-mono text-sm"
                    >
                      <span className="text-purple-400 font-bold">{k}</span>
                      <span className="text-gray-500 mx-1">=</span>
                      <span className="font-bold text-gray-200">{String(v)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Controls ── */}
        <div className="border-t-2 border-gray-800 px-6 py-4 bg-[#0a0a0a] rounded-b-xl flex flex-col gap-3">

          {/* Timeline */}
          <div className="flex items-center gap-3">
            <span className="font-marker text-sm text-gray-400 whitespace-nowrap">Step {stepIndex + 1} / {totalSteps}</span>
            <div className="relative flex-1 h-4 border-2 border-gray-700 rounded-full bg-gray-900 flex items-center overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-blue-500/50 border-r-2 border-blue-400"
                animate={{ width: `${((stepIndex) / Math.max(totalSteps - 1, 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
              <input
                type="range"
                min={0}
                max={totalSteps - 1}
                value={stepIndex}
                onChange={e => { setIsPlaying(false); setStepIndex(Number(e.target.value)); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Playback buttons + speed */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={prev} className="p-2 border-2 border-gray-700 rounded hover:bg-gray-800 text-gray-300">
                <SkipBack size={18} />
              </button>
              {isPlaying
                ? <button onClick={pause} className="p-2 border-2 border-blue-500 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"><Pause size={22} /></button>
                : <button onClick={play}  className="p-2 border-2 border-green-500 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50"><Play size={22} fill="currentColor" /></button>
              }
              <button onClick={stop} className="p-2 border-2 border-red-500 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">
                <Square size={18} fill="currentColor" />
              </button>
              <button onClick={next} className="p-2 border-2 border-gray-700 rounded hover:bg-gray-800 text-gray-300">
                <SkipForward size={18} />
              </button>
            </div>

            {/* Problem navigation */}
            <div className="flex items-center gap-2">
              <button onClick={onPrev} disabled={problemIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 border-2 border-gray-700 rounded font-marker text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="font-marker text-sm text-gray-500">{problemIndex + 1} / {totalProblems}</span>
              <button onClick={onNext} disabled={problemIndex === totalProblems - 1}
                className="flex items-center gap-1 px-3 py-1.5 border-2 border-gray-700 rounded font-marker text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
                Next <ChevronRight size={16} />
              </button>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-1 border-2 border-gray-700 rounded overflow-hidden bg-[#111111]">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 text-sm font-marker font-bold transition-colors ${speed === s ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDryRun;
