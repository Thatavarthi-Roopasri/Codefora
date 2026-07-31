import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Square, Code2 } from 'lucide-react';
import VisualRenderer from './VisualRenderer';
import PseudoCodePanel from './PseudoCodePanel';

const SPEEDS = [0.5, 1, 2, 5];
const BASE_DELAY_MS = 1200;

const DIFFICULTY_COLOR = {
  Easy: 'text-green-400 border-green-500 bg-green-900/20',
  Medium: 'text-yellow-400 border-yellow-500 bg-yellow-900/20',
  Hard: 'text-red-400 border-red-500 bg-red-900/20',
};

/**
 * DryRunPlayer — a generic, reusable dry-run animation player.
 * Receives a single `problem` prop containing all data.
 * Fully self-contained: dark-mode, playback controls, pseudo-code toggle.
 */
const DryRunPlayer = ({ problem }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showPseudo, setShowPseudo] = useState(false);
  const timerRef = useRef(null);

  const { steps = [] } = problem;
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] || {};
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

        {/* Main Content */}
        <div className="flex flex-col min-h-[600px]">

          {/* Toggle pseudo code button bar */}
          <div className="flex items-center gap-3 px-5 py-2 bg-[#0d0d0d] border-b-2 border-dashed border-gray-800">
            <button
              onClick={() => setShowPseudo(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-1.5 border-2 rounded-lg font-marker text-sm font-bold transition-all duration-300 ${
                showPseudo
                  ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  : 'border-indigo-500 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50'
              }`}
            >
              <Code2 size={16} />
              {showPseudo ? 'Hide Pseudo Code' : 'Show Pseudo Code'}
            </button>
          </div>

          {/* Professor's Step Explanation */}
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

          {/* Visualizer + optional Pseudo Code side by side */}
          <div className="flex flex-row flex-1 overflow-hidden">
            {/* Visualizer area */}
            <div className="flex-1 p-6 overflow-auto relative min-w-0 bg-[#0a0a0a] transition-all duration-300">
              <VisualRenderer visual={currentStep.visual} />
            </div>

            {/* Pseudo Code Sidebar (toggled) */}
            <AnimatePresence>
              {showPseudo && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '35%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="border-l-2 border-gray-800 overflow-hidden bg-[#0a0a0a]"
                >
                  <PseudoCodePanel pseudoCode={pseudoCode} activeLine={activePseudoLine} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Variables display */}
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

        {/* Bottom Controls */}
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

export default DryRunPlayer;
