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
import Loader from "./components/Loader";
import { useLocation } from "react-router-dom";

function LoaderManager({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // initial show
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // show on route changes briefly
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <>
      <Loader visible={loading} />
      {children}
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
