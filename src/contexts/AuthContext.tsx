import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { initPushNotifications } from "@/lib/usePushNotifications";

// ─────────────────────────────────────────────────────────────────────────────
// "Keep me signed in" logic
//
// When the user signs in with the checkbox ticked we write "1" to this key.
// On every auth-state-change event we check the key:
//   • "1" (or not set yet) → keep the session — do nothing on TOKEN_REFRESHED
//     or similar passive events.
//   • "0" → the user opted out. We sign them out as soon as the app is next
//     launched (i.e. a new browser/webview context with no active tab), which
//     we detect by the absence of an in-memory flag.
//
// IMPORTANT: we never call signOut() in response to Supabase's own
// TOKEN_REFRESHED or INITIAL_SESSION events — that would auto-logout the user.
// We only sign out on SIGNED_IN when the preference flag is "0" AND this is a
// fresh cold-start (not a sign-in the user just performed, which is guarded
// by the `justSignedIn` ref set in SignIn.tsx via localStorage).
// ─────────────────────────────────────────────────────────────────────────────
export const KEEP_SIGNED_IN_KEY   = "bookme_keep_signed_in";
// Written by SignIn.tsx right before navigate("/dashboard") so AuthContext
// knows not to invalidate a session the user just established.
const JUST_SIGNED_IN_KEY = "bookme_just_signed_in";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Cold-start: restore persisted session ────────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check "keep me signed in" preference
        const keep = localStorage.getItem(KEEP_SIGNED_IN_KEY);

        if (keep === "0") {
          // User opted OUT of staying signed in.
          // Only sign them out on a cold start (no active tab that just signed in).
          const justSignedIn = sessionStorage.getItem(JUST_SIGNED_IN_KEY);
          if (!justSignedIn) {
            // Cold-start with "don't keep" → sign out silently
            supabase.auth.signOut().then(() => {
              setSession(null);
              setLoading(false);
            });
            return;
          }
          // They just signed in this tab — honour the session for this tab only
          sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
        }
      }

      setSession(session ?? null);
      setLoading(false);
      if (session?.user) initPushNotifications(session.user.id);
    });

    // ── Ongoing auth state changes ───────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Always update state for SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
        setSession(session);
        setLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // Mark that this tab just performed a sign-in so the cold-start
          // check above won't immediately sign them out on next mount.
          sessionStorage.setItem(JUST_SIGNED_IN_KEY, "1");
          initPushNotifications(session.user.id);
        }

        // We intentionally do NOT sign out on TOKEN_REFRESHED or any other
        // automatic Supabase event — the user stays logged in until they
        // explicitly tap "Sign Out".
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // On explicit sign-out: clear the "keep" preference so next visit starts fresh
    localStorage.removeItem(KEEP_SIGNED_IN_KEY);
    sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
