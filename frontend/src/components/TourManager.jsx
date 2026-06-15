import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { TourMascotTooltip } from './TourMascotTooltip';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { API_URL } from '../config';

const AutoClickBeacon = React.forwardRef((props, forwardedRef) => {
  const localRef = React.useRef(null);

  React.useEffect(() => {
    // Instantly click ourselves so the event bubbles to react-joyride's listener
    const timer = setTimeout(() => {
      if (localRef.current) {
        localRef.current.click();
        localRef.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
      if (props.onClick) {
        props.onClick();
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [props.onClick]);

  return (
    <span 
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }} 
      style={{ opacity: 0, pointerEvents: 'none', position: 'absolute', width: '1px', height: '1px' }} 
      {...props} 
    />
  );
});

export const TourManager = () => {

  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [tourInitialized, setTourInitialized] = useState(false);
  const [domReady, setDomReady] = useState(true);
  const [mountJoyride, setMountJoyride] = useState(false);
  const [tourViewVersion, setTourViewVersion] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  // Expose user ID to global scope for brutal overrides in tooltip
  useEffect(() => {
    if (user) window.currentUserUid = user.uid;
    else window.currentUserUid = null;
  }, [user]);

  useEffect(() => {
    const handleChatToggle = (e) => setChatOpen(e.detail?.isOpen);
    window.addEventListener('chat-toggled', handleChatToggle);
    return () => window.removeEventListener('chat-toggled', handleChatToggle);
  }, []);

  const getPageName = (path) => {
    if (path.startsWith('/code/')) return 'code_room';
    return path.replace('/', '') || 'home';
  };
  const pageName = getPageName(location.pathname);

  // Wait for the heavy Code Room DOM to fully mount before starting the tour
  useEffect(() => {
    if (location.pathname.startsWith('/code/')) {
      setDomReady(false);
      const interval = setInterval(() => {
        if (document.querySelector('.tour-users-panel') || document.querySelector('.tour-problem-left')) {
          setDomReady(true);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDomReady(true);
    }
  }, [location.pathname]);

  // Bulletproof sync: Directly flip the toggle in the UI via the global setter!
  useEffect(() => {
    if (typeof window.setTourToggleState === 'function') {
      window.setTourToggleState(run);
    }
  }, [run]);

  // Listen for manual tour controls from UI
  useEffect(() => {
    const saveTourStatusToApi = (status) => {
      if (!user) return;
      fetch(`${API_URL}/api/profiles/${user.uid}/tour-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageName, status }),
        keepalive: true
      }).catch(console.error);
    };

    const handleManualStart = () => {
      // Clear session block and local storage to force it to run
      sessionStorage.removeItem(`tourCompleted_${pageName}`);
      if (user) {
        localStorage.removeItem(`codefora_tour_${user.uid}_${pageName}`);
        saveTourStatusToApi(false);
      } else {
        localStorage.removeItem(`codefora_tour_guest_${pageName}`);
      }
      setRun(true);
    };

    const handleManualStop = () => {
      setRun(false);
      sessionStorage.setItem(`tourCompleted_${pageName}`, 'true');
      
      // Save permanently just like skipping the tour would
      const isManualUser = user?.providerId === 'manual';
      if (user && !isManualUser) {
        saveTourStatusToApi(true);
        localStorage.setItem(`codefora_tour_${user.uid}_${pageName}`, 'true');
      } else {
        const fallbackId = user ? user.uid : 'guest';
        localStorage.setItem(`codefora_tour_${fallbackId}_${pageName}`, 'true');
      }
    };

    window.addEventListener('manual-start-tour', handleManualStart);
    window.addEventListener('manual-stop-tour', handleManualStop);

    return () => {
      window.removeEventListener('manual-start-tour', handleManualStart);
      window.removeEventListener('manual-stop-tour', handleManualStop);
    };
  }, [pageName]);

  // Determine if we should show the tour based on Firestore or Guest LocalStorage
  useEffect(() => {
    if (loading) return; // wait for auth to completely resolve

    const checkTourStatus = async () => {
      // Only allow tour on requested pages
      const allowedPages = ['code_room'];
      if (!allowedPages.includes(pageName)) {
        setRun(false);
        return; // Silently exit, no logs, no tour
      }

      console.log(`[TourManager] Checking status for page: ${pageName}`);
      
      // Prevent showing the tour again if they hit 'Back' to a page they already completed in this session
      const isCompletedInSession = sessionStorage.getItem(`tourCompleted_${pageName}`) === 'true';
      console.log(`[TourManager] Session completed status: ${isCompletedInSession}`);
      
      if (isCompletedInSession) {
        setRun(false);
        setTourInitialized(true);
        return;
      }

      const isManualUser = user?.providerId === 'manual';

      if (user && !isManualUser) {
        try {
          const response = await fetch(`${API_URL}/api/profiles/${user.uid}/tour-status/${pageName}`);
          
            if (response.ok) {
              const data = await response.json();
              const dbStatus = data.status;
              console.log(`[TourManager] DB status via API for ${pageName}: ${dbStatus}`);
              
              const hasSeenLocal = localStorage.getItem(`codefora_tour_${user.uid}_${pageName}`) === 'true';
              
              if (dbStatus || hasSeenLocal) {
                setRun(false);
              } else {
                setRun(true);
              }
            } else {
            throw new Error("API request failed");
          }
        } catch (error) {
          console.error("[TourManager] Error fetching tour status via API, falling back to local storage:", error);
          const hasSeenLocal = localStorage.getItem(`codefora_tour_${user.uid}_${pageName}`) === 'true';
          setRun(!hasSeenLocal);
        }
      } else {
        const fallbackId = user ? user.uid : 'guest';
        const hasSeen = localStorage.getItem(`codefora_tour_${fallbackId}_${pageName}`) === 'true';
        console.log(`[TourManager] Local storage status for ${fallbackId}: ${hasSeen}`);
        setRun(!hasSeen);
      }
      setTourInitialized(true);
    };

    checkTourStatus();
  }, [user, loading, pageName]);

  // Once status is resolved, handle DOM readiness and Joyride mounting
  useEffect(() => {
    if (!tourInitialized) return;

    // Delay mounting Joyride to guarantee DOM elements are painted for first-time load
    const timer = setTimeout(() => {
      setMountJoyride(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [tourInitialized]);

  useEffect(() => {
    const handleViewChange = () => {
      setTourViewVersion(v => v + 1);
      if (sessionStorage.getItem('tourActive') === 'true') {
        setTimeout(() => setRun(true), 100);
      }
    };
    window.addEventListener('tour-view-changed', handleViewChange);
    return () => window.removeEventListener('tour-view-changed', handleViewChange);
  }, []);

  // We split the steps by page!
  const homeSteps = [
    {
      target: '.tour-navbar',
      content: 'Welcome to Codefora! This is your main navigation hub. You can access all tools from here.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#tour-join-room',
      content: 'Click here to join a room and start pair-programming with others!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#tour-practice-button',
      content: 'Or click Practice to solve LeetCode-style algorithmic problems on your own!',
      disableBeacon: true,
      placement: 'bottom',
    }
  ];

  const roomsSteps = [
    {
      target: '.tour-rooms-list',
      content: 'You can join any of these active private and public rooms listed right here!',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-create-room',
      content: 'Click this button to open the menu, then click Next!',
      spotlightClicks: true,
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-name',
      content: 'Enter a fun name for your room here.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-size',
      content: 'Choose how many people can join the room (up to 10).',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-mode',
      content: 'Choose Public (anyone can join) or Private (invite-only).',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-submit-room',
      content: 'Click here to launch your room and enter the Code Editor!',
      disableBeacon: true,
      placement: 'bottom',
      spotlightClicks: true,
    }
  ];

  const problemsListSteps = [
    {
      target: '.tour-problems-search',
      content: 'Use this search bar to quickly find specific algorithmic challenges.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problems-difficulty',
      content: 'Filter problems by Difficulty: Easy, Medium, or Hard.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problems-tags',
      content: 'Filter by specific Tags like Arrays, Dynamic Programming, or Graphs.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problems-sort',
      content: 'Sort the list by Trending, Newest, or Most Solved.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problem-card',
      content: 'Click on any problem card to open it! (Do NOT click Next, click the actual problem)',
      spotlightClicks: true,
      disableBeacon: true,
      placement: 'top',
    }
  ];

  const problemDetailsSteps = [
    {
      target: '.tour-problem-left',
      content: 'This panel shows the problem statement, constraints, and sample test cases.',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '.tour-problem-ai-chat',
      content: 'Click this floating button to ask the AI Assistant for hints if you get stuck.',
      spotlightClicks: true,
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-problem-lang',
      content: 'Select your preferred programming language from this dropdown.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problem-run',
      content: 'Run your code against the sample test cases to see if it works.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-problem-submit',
      content: 'Submit your code against the hidden test cases to solve the problem and earn XP!',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-problem-collaborate',
      content: 'Stuck? Click Collaborate & Solve to create a private Room with this problem loaded!',
      spotlightClicks: true,
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-name',
      content: 'You can customize the room name here.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-size',
      content: 'Choose how many friends can join you.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-room-mode',
      content: 'Make it public for anyone, or private for friends only.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-submit-room',
      content: 'Click Create Room to jump into the collaborative editor!',
      spotlightClicks: true,
      disableBeacon: true,
      placement: 'top',
    }
  ];

  const playgroundSteps = [
    {
      target: '.tour-pg-file-create',
      content: 'Welcome to the Playground! You can create new files for your project here.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-file-import',
      content: 'Import existing files from your computer to work on them.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-file-export',
      content: 'Download your entire project as a ZIP file when you are done.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-tabs',
      content: 'Switch between your open files easily using these tabs.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-editor',
      content: 'This is the code editor. Write your awesome code here!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-run',
      content: 'Run your code to see the output in the console.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-pg-save',
      content: 'Save your work to your profile so you can access it later.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-console',
      content: 'The output of your code will appear down here in the Console.',
      disableBeacon: true,
      placement: 'top',
    }
  ];

  const profileSteps = [
    {
      target: '.tour-profile-card',
      content: 'This is your developer profile card. It shows your global rank and stats!',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '.tour-profile-settings',
      content: 'Here you can update your personal information and preferences.',
      disableBeacon: true,
      placement: 'left',
    },
    {
      target: '.tour-profile-name',
      content: 'Change your display name so friends can find you.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-profile-bio',
      content: 'Write a short bio to introduce yourself to the community.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-profile-community',
      content: 'Select which community you belong to, Sider or Loop.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-profile-avatar',
      content: 'Customize your avatar or emotion to express yourself!',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-profile-works',
      content: 'All the projects you save in the Playground will securely appear right here.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-profile-activity',
      content: 'Your recent activity, such as rooms joined or problems solved, will show up here.',
      disableBeacon: true,
      placement: 'top',
    }
  ];

  const codeRoomSteps = [
    {
      target: '.tour-users-panel',
      content: 'This is the Users Panel! You can see who is currently in the room and what their role is (Host, Editor, or Viewer).',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '.tour-chat-button',
      content: 'Click this floating button to open the Room Chat & AI assistant!',
      disableBeacon: true,
      placement: 'left',
      spotlightClicks: true,
    },
    {
      target: '.tour-chat-attachment',
      content: 'In the chat, you can click this file symbol to send fun stickers to your teammates!',
      disableBeacon: true,
      placement: 'left',
      spotlightClicks: true,
    },
    {
      target: '.tour-chat-ai',
      content: 'You can also switch to the AI tab to ask our intelligent coding assistant for help debugging!',
      disableBeacon: true,
      placement: 'left',
    },
    {
      target: '.tour-mic-button',
      content: 'Click here to turn on your microphone and talk to your team with crystal-clear voice chat!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-notes-button',
      content: 'Need to explain an algorithm? Click Notes to open a shared whiteboard and scratchpad!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-settings-button',
      content: 'Room Hosts can click here to configure room permissions and anti-cheat settings.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-code-editor',
      content: 'This is the synchronized code editor. Every keystroke is instantly shared with the room!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-run-button',
      content: 'Click Run to execute your code securely in our cloud environment.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-submit-button',
      content: 'If this is a Problem Room, click Submit to test your code against all hidden test cases.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-console',
      content: 'The output of your code, as well as compilation errors, will appear down here in the Console.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-web-preview',
      content: 'If you are writing HTML/CSS/JS, click Web Preview to see a live render of your website!',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '.tour-leave-button',
      content: 'Click Leave to exit the room. You can always rejoin later using the Room ID.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-end-button',
      content: 'If you are the Host, you can End the Room entirely to kick everyone out and delete the session.',
      disableBeacon: true,
      placement: 'bottom',
    }
  ];

  // Pick the right steps based on current URL
  let currentSteps = [];
  if (location.pathname === '/rooms') currentSteps = roomsSteps.slice(0, 1);
  if (location.pathname.startsWith('/code/')) {
    const isProblemRoom = document.querySelector('.tour-problem-left') !== null;
    if (isProblemRoom) {
      currentSteps = [
        {
          target: '.tour-problem-left',
          content: 'This panel shows the problem statement, constraints, and sample test cases.',
          disableBeacon: true,
          placement: 'right',
        },
        {
          target: '.tour-room-users-btn',
          content: 'Click here to view all users in the room and see who is Host, Editor, or Viewer.',
          disableBeacon: true,
          placement: 'bottom',
        },
        ...codeRoomSteps.slice(1) // skip the .tour-users-panel since it's hidden in a modal
      ];
    } else {
      currentSteps = codeRoomSteps;
    }
  }
  if (location.pathname === '/problems') {
    const isDetailsView = document.querySelector('.tour-problem-left') !== null || document.querySelector('.tour-problem-lang') !== null;
    currentSteps = isDetailsView ? problemDetailsSteps : problemsListSteps;
  }

  // CRITICAL FIX: Only include steps where the target element actually exists in the DOM right now!
  // This prevents react-joyride from crashing if a button is hidden (like the End Room button for non-hosts).
  currentSteps = currentSteps.filter(step => {
    // Explicitly exclude chat internal steps if chat is closed, because they exist in DOM but are off-screen!
    if (!chatOpen && (step.target === '.tour-chat-attachment' || step.target === '.tour-chat-ai')) {
      return false;
    }

    // Joyride uses body for some global steps, so body always exists
    if (step.target === 'body') return true;
    try {
      return document.querySelector(step.target) !== null;
    } catch {
      return false;
    }
  });

  const handleJoyrideCallback = React.useCallback((data) => {
    const { status, type, step, action } = data;
    console.log(`[Joyride Event] Type: ${type}, Status: ${status}, Action: ${action}`);

    // Manually scroll to elements inside custom overflow containers if needed
    if (type === EVENTS.TOOLTIP || type === EVENTS.STEP_BEFORE) {
      if (step?.target === '.tour-problem-collaborate') {
        setTimeout(() => {
          const btn = document.querySelector('.tour-problem-collaborate');
          if (btn) btn.scrollIntoView({ behavior: 'auto', block: 'center' });
        }, 10);
      }
    }

    // When the tour finishes on the current page...
    const isTourEnding = 
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) || 
      ['skip', 'close'].includes(action) || 
      type === EVENTS.TOUR_END;

    if (isTourEnding) {
      console.log(`[TourManager] Tour completed or skipped on ${pageName}. Status: ${status}, Action: ${action}, Type: ${type}`);
      setRun(false);
      if (typeof window.setTourToggleState === 'function') {
        window.setTourToggleState(false);
      }
      
      const isManualUser = user?.providerId === 'manual';
      
      if (user && !isManualUser) {
        console.log(`[TourManager] Saving completion to API for user ${user.uid}`);
        // Sync completion for THIS SPECIFIC PAGE permanently to database via API
        fetch(`${API_URL}/api/profiles/${user.uid}/tour-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageName, status: true }),
          keepalive: true
        }).catch(console.error);
        
        // Also save to local storage as a robust fallback
        localStorage.setItem(`codefora_tour_${user.uid}_${pageName}`, 'true');
      } else {
        const fallbackId = user ? user.uid : 'guest';
        console.log(`[TourManager] Saving completion to local storage for ${fallbackId}`);
        localStorage.setItem(`codefora_tour_${fallbackId}_${pageName}`, 'true');
      }
      
      // Mark this specific page as completed for this session to prevent re-running on browser back
      console.log(`[TourManager] Saving completion to session storage`);
      sessionStorage.setItem(`tourCompleted_${pageName}`, 'true');
    }
  }, [user, pageName]);

  return (
    <>
      {mountJoyride && (
        <Joyride
          key={location.pathname}
          callback={handleJoyrideCallback}
          continuous
          disableOverlayClose
          disableScrolling
          hideCloseButton
          run={run && domReady}
          showProgress
          showSkipButton
          steps={currentSteps}
          tooltipComponent={TourMascotTooltip}
          beaconComponent={AutoClickBeacon}
          styles={{
            options: {
              zIndex: 9999999,
              overlayColor: 'rgba(0, 0, 0, 0.75)',
            },
          }}
        />
      )}
    </>
  );
};
