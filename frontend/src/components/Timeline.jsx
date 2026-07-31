import React from 'react';
import { useExecution } from '../hooks/useExecution';

const Timeline = () => {
  const { currentStepIndex, totalSteps, jumpToStep } = useExecution();

  // Protect against division by zero or invalid states
  const safeTotal = Math.max(1, totalSteps - 1);
  const progress = (currentStepIndex / safeTotal) * 100;

  return (
    <div className="w-full bg-white whiteboard-border p-4 rounded-lg mt-4 flex flex-col space-y-2 text-black">
      <div className="flex justify-between items-center text-lg font-marker font-bold">
        <span>Timeline Slider</span>
        <span className="text-blue-600 font-handwritten text-xl">Step {currentStepIndex + 1} / {totalSteps}</span>
      </div>
      
      <div className="relative w-full h-4 bg-gray-100 rounded cursor-pointer border-2 border-black flex items-center">
        {/* Progress Bar Fill (Blue marker look) */}
        <div 
          className="h-full bg-blue-500/30 border-r-2 border-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        
        {/* Interactive indicator circle */}
        <div 
          className="absolute w-5 h-5 rounded-full border-2 border-black bg-white -ml-2.5 transition-all duration-300 ease-out flex items-center justify-center"
          style={{ left: `${progress}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-black"></div>
        </div>

        {/* Range input overlay */}
        <input 
          type="range" 
          min="0" 
          max={safeTotal} 
          value={currentStepIndex}
          onChange={(e) => jumpToStep(parseInt(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Timeline;
