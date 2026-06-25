import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./hooks/useTheme";
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoomsPage } from "./pages/RoomsPage";
import { RoomPage } from "./pages/RoomPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import FeedbackPage from "./pages/FeedbackPage";
import Loader from "./components/Loader";
import { Footer } from "./components/Footer";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { CodeOfConductPage } from "./pages/CodeOfConductPage";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";
import { API_URL } from "./config";

import { socket } from "./lib/socket";

function LoaderManager({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // initial show
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Global Community Theme Sync & Online Presence
    if (!user) {
      document.documentElement.dataset.community = "sider";
      return;
    }
    
    // Connect socket for global online presence tracking
    socket.connect();
    socket.emit("user:presence", user.uid);

    fetch(`${API_URL}/api/profiles/${user.uid}`)
      .then(r => r.json())
      .then(profile => {
        const comm = profile.community || "sider";
        document.documentElement.dataset.community = comm;
        localStorage.setItem("codefora_community", comm);
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    // show on route changes briefly
    window.scrollTo(0, 0);
    setLoading(true);
    trackPageView(location.pathname);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const footerRoutes = ['/home', '/rooms', '/problems', '/feedback', '/profile', '/privacy', '/terms', '/conduct'];
  const showFooter = footerRoutes.includes(location.pathname);

  return (
    <>
      <Loader visible={loading} />
      {children}
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
      { path: "admin", element: <AdminDashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "playground", element: <PlaygroundPage /> },
      { path: "feedback", element: <FeedbackPage /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "conduct", element: <CodeOfConductPage /> },
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
