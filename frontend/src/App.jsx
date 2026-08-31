import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import Loader from "./components/Loader";
import { Footer } from "./components/Footer";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";
import { api } from "./api/client";
import { isGuestUser } from "./lib/userAccess";
import { saveCodeforaSession } from "./lib/session";

import { socket } from "./lib/socket";
import GlobalAiChat from "./components/GlobalAiChat";

const HomePage = lazy(() => import("./pages/HomePage"));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage").then((module) => ({ default: module.ProblemsPage })));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage").then((module) => ({ default: module.ChallengesPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const RoomsPage = lazy(() => import("./pages/RoomsPage").then((module) => ({ default: module.RoomsPage })));
const RoomPage = lazy(() => import("./pages/RoomPage").then((module) => ({ default: module.RoomPage })));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage").then((module) => ({ default: module.PlaygroundPage })));
const DryRunPage = lazy(() => import("./pages/DryRunPage").then((module) => ({ default: module.DryRunPage })));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage").then((module) => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage").then((module) => ({ default: module.TermsOfServicePage })));
const CodeOfConductPage = lazy(() => import("./pages/CodeOfConductPage").then((module) => ({ default: module.CodeOfConductPage })));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage").then((module) => ({ default: module.RefundPolicyPage })));
const ShippingDeliveryPage = lazy(() => import("./pages/ShippingDeliveryPage").then((module) => ({ default: module.ShippingDeliveryPage })));

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
        const profileDisplayName = String(profile.displayName || "").trim();
        const authDisplayName = user.displayName || user.email?.split("@")[0] || "Developer";
        const displayName = !profileDisplayName || profileDisplayName === "Someone" ? authDisplayName : profileDisplayName;
        document.documentElement.dataset.community = comm;
        saveCodeforaSession({ uid: user.uid, displayName, community: comm });
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
      <Suspense fallback={<Loader visible />}>
        {children}
      </Suspense>
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
