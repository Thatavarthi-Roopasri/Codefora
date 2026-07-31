import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';
import { useExecution } from '../hooks/useExecution';

const PlaybackControls = () => {
  const { 
    isPlaying, 
    play, 
    pause, 
    stop, 
    nextStep, 
    prevStep, 
    speed, 
    setSpeed 
  } = useExecution();

  const speedOptions = [0.5, 1, 2, 5];

  return (
    <div className="flex items-center justify-between p-4 bg-white whiteboard-border rounded-lg mt-4 text-black font-marker">
      {/* Control Buttons */}
      <div className="flex items-center space-x-2">
        <button 
          onClick={prevStep}
          className="p-2 border-2 border-black rounded hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Previous Step"
        >
          <SkipBack size={20} />
        </button>
        
        {isPlaying ? (
          <button 
            onClick={pause}
            className="p-2 border-2 border-black rounded hover:bg-gray-100 active:bg-gray-200 text-blue-600 font-bold"
            title="Pause"
          >
            <Pause size={24} />
          </button>
        ) : (
          <button 
            onClick={play}
            className="p-2 border-2 border-black rounded hover:bg-gray-100 active:bg-gray-200 text-green-600 font-bold"
            title="Play"
          >
            <Play size={24} fill="currentColor" />
          </button>
        )}
        
        <button 
          onClick={stop}
          className="p-2 border-2 border-black rounded hover:bg-gray-100 active:bg-gray-200 text-red-600"
          title="Stop"
        >
          <Square size={20} fill="currentColor" />
        </button>
        
        <button 
          onClick={nextStep}
          className="p-2 border-2 border-black rounded hover:bg-gray-100 active:bg-gray-200"
          title="Next Step"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center space-x-1 border-2 border-black p-0.5 rounded bg-gray-50">
        {speedOptions.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-3 py-1 text-sm rounded transition-colors font-bold ${
              speed === s 
                ? 'bg-black text-white' 
                : 'text-gray-600 hover:text-black hover:bg-gray-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlaybackControls;
