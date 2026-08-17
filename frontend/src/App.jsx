import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoomsPage } from "./pages/RoomsPage";
import { RoomPage } from "./pages/RoomPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { DryRunPage } from "./pages/DryRunPage";
import FeedbackPage from "./pages/FeedbackPage";
import Loader from "./components/Loader";
import { Footer } from "./components/Footer";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { CodeOfConductPage } from "./pages/CodeOfConductPage";
import { RefundPolicyPage } from "./pages/RefundPolicyPage";
import { ShippingDeliveryPage } from "./pages/ShippingDeliveryPage";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";
import { api } from "./api/client";
import { isGuestUser } from "./lib/userAccess";

import { socket } from "./lib/socket";
import GlobalAiChat from "./components/GlobalAiChat";

function LoaderManager({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // initial show
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    
    // Silently ping the Hugging Face space to wake it up from sleep/cold-start
    fetch("https://roopasri06-codefora-lora-api.hf.space/").catch(() => {});
    
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Global Community Theme Sync & Online Presence
    if (!user || isGuestUser(user)) {
      document.documentElement.dataset.community = "sider";
      return;
    }

    let active = true;
    async function startAuthenticatedSession() {
      try {
        const profile = await api.bootstrapProfile();
        if (!active) return;
        const comm = profile.community || "sider";
        document.documentElement.dataset.community = comm;
        localStorage.setItem("codefora_community", comm);
        localStorage.setItem("codefora_user_id", user.uid);
        localStorage.setItem("codefora_username", profile.displayName || user.displayName || user.email?.split("@")[0] || "Developer");
        window.dispatchEvent(new Event("profileUpdated"));

        socket.connect();
        socket.emit("user:presence", user.uid);
      } catch (error) {
        console.error("Profile bootstrap failed:", error);
      }
    }

    startAuthenticatedSession();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    // show on route changes briefly
    window.scrollTo(0, 0);
    setLoading(true);
    trackPageView(location.pathname);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const footerRoutes = ['/home', '/rooms', '/problems', '/feedback', '/profile', '/privacy', '/terms', '/conduct', '/refund-policy', '/shipping', '/about', '/services', '/contact'];
  const showFooter = footerRoutes.includes(location.pathname);

  return (
    <>
      <Loader visible={loading} />
      {children}
      <GlobalAiChat />
      {showFooter && <Footer />}
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <LoaderManager>
        <Outlet />
      </LoaderManager>
    ),
    children: [
      { index: true, element: <SignInPage /> },
      { path: "home", element: <HomePage /> },
      { path: "rooms", element: <RoomsPage /> },
      { path: "problems", element: <ProblemsPage /> },
      { path: "problems/:id/dry-run/:dryRunId", element: <DryRunPage /> },
      { path: "challenges", element: <ChallengesPage /> },
      { path: "admin", element: <AdminDashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/:userId", element: <ProfilePage /> },
      { path: "playground", element: <PlaygroundPage /> },
      { path: "feedback", element: <FeedbackPage /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "conduct", element: <CodeOfConductPage /> },
      { path: "refund-policy", element: <RefundPolicyPage /> },
      { path: "shipping", element: <ShippingDeliveryPage /> },
      { path: "about", element: <HomePage /> },
      { path: "services", element: <HomePage /> },
      { path: "contact", element: <FeedbackPage /> },
      { path: "room/:roomId", element: <RoomPage /> },
      { path: "code/:roomId", element: <RoomPage /> },
      { path: "code/private/:roomId", element: <RoomPage /> }
    ]
  }
]);

export default function App() {
  useTheme();

  return <RouterProvider router={router} />;
}
