export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const popIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 20 }
};

// Colors for highlights
export const COLORS = {
  highlight: '#f97316', // orange-500
  secondary: '#38bdf8', // sky-400
  success: '#22c55e',   // green-500
  error: '#ef4444',     // red-500
  defaultText: '#f8fafc' // slate-50
};
