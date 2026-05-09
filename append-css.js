const fs = require('fs');
const css = `
/* Floating Notifications Styling */
.floating-notifications {
  position: absolute;
  top: 70px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.float-msg {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--primary-orange);
  color: var(--text-primary);
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  cursor: pointer;
  animation: slide-in 0.3s ease-out;
  max-width: 300px;
  word-wrap: break-word;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

fs.appendFileSync('frontend/src/styles/room.css', css);
console.log('Floating notifications CSS appended successfully');
