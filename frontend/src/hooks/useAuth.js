import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

function getManualUser() {
  try {
    const uid = localStorage.getItem("codefora_user_id");
    const displayName = localStorage.getItem("codefora_username");
    if (!uid || !displayName) return null;
    return {
      uid,
      displayName,
      email: `${displayName}@codefora.local`,
      photoURL: null,
      providerId: "manual",
    };
  } catch {
    return null;
  }
}

export const useAuth = () => {
  const [user, setUser] = useState(() => getManualUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || getManualUser());
      setLoading(false);
    }, (err) => {
      setError(err);
      setUser(getManualUser());
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Secure admin check based on email
  const isAdmin = ["ganeshvanamala16@gmail.com", "roopasri061216@gmail.com"].includes(user?.email);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem("codefora_role", "admin");
      localStorage.setItem("codefora_admin_token", "firebase_master_admin");
    } else if (user) {
      localStorage.removeItem("codefora_admin_token");
      localStorage.setItem("codefora_role", "user");
    }
  }, [isAdmin, user]);

  return { user, loading, error, isAdmin };
};
