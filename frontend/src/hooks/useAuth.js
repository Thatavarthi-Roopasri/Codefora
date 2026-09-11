import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { isLocalIdentityAllowed, saveCodeforaSession } from "../lib/session";
import { subscribeProfileSync } from "../lib/profileSync";

function getManualUser() {
  if (!isLocalIdentityAllowed()) return null;

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
    if (!auth) {
      setUser(getManualUser());
      setLoading(false);
      return undefined;
    }

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

  // This is only a client-side navigation/display hint. Admin API access is enforced by backend token checks.
  const isAdmin = ["ganeshvanamala16@gmail.com", "roopasri061216@gmail.com"].includes(user?.email);

  useEffect(() => {
    if (user?.uid) {
      saveCodeforaSession({
        uid: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Developer",
        role: isAdmin ? "admin" : "user"
      });
    }
  }, [isAdmin, user]);

  useEffect(() => {
    return subscribeProfileSync((profile) => {
      setUser((current) => {
        if (!current?.uid || profile.uid !== current.uid) return current;
        return {
          ...current,
          displayName: profile.displayName || current.displayName,
          photoURL: profile.photoURL || current.photoURL
        };
      });
    });
  }, []);

  return { user, loading, error, isAdmin };
};
