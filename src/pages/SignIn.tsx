import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Mail, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/contexts/AuthContext";

// Key used to persist the user's "keep me signed in" preference
export const KEEP_SIGNED_IN_KEY = "bookme_keep_signed_in";

const SignIn = () => {
  const { user, loading } = useAuth();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPasswordValue, setShowPasswordValue] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [keepSignedIn, setKeep]   = useState(true);   // default ON
  const [signingIn, setLoading]          = useState(false);
  const navigate = useNavigate();

  // Already authenticated — skip the sign-in screen entirely
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleContinue = () => { if (!email) return; setShowPass(true); };

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast.error(error.message); return; }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", data.user.id).single();

    if (!profile || profile.role !== "provider") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This app is for business accounts only.");
      return;
    }

    // Persist preference + mark this tab as a fresh sign-in
    localStorage.setItem(KEEP_SIGNED_IN_KEY, keepSignedIn ? "1" : "0");
    sessionStorage.setItem("bookme_just_signed_in", "1");

    setLoading(false);
    navigate("/dashboard");
  };

  const neuInput = {
    background: "hsl(var(--background))",
    boxShadow: "var(--shadow-inset)",
  };

  return (
    <div
      className="min-h-screen flex flex-col px-6 pb-10"
      style={{ background: "hsl(var(--background))", paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-raised)" }}>
          <img src={logo} alt="BookMe" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-xl font-extrabold text-foreground tracking-tight">BookMe</p>
          <p className="text-sm font-semibold text-muted-foreground">Business Portal</p>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-foreground mb-2">Welcome back</h1>
      <p className="text-sm text-muted-foreground mb-10">Sign in to manage your bookings.</p>

      {/* Email field */}
      <div className="mb-4">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
          Email Address
        </label>
        <div className="flex items-center rounded-2xl overflow-hidden h-14" style={neuInput}>
          <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (showPass ? handleSignIn() : handleContinue())}
            placeholder="you@example.com"
            className="flex-1 h-full bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Password field */}
      {showPass && (
        <div className="mb-5 animate-fade-in">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
            Password
          </label>
          <div className="flex items-center rounded-2xl overflow-hidden h-14" style={neuInput}>
            <div className="w-12 h-full flex items-center justify-center flex-shrink-0">
              <span className="text-muted-foreground text-xs font-bold">🔑</span>
            </div>
            <input
              type={showPasswordValue ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignIn()}
              placeholder="••••••••"
              className="flex-1 h-full bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPasswordValue(v => !v)}
              className="w-12 h-full flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPasswordValue ? "Hide password" : "Show password"}
            >
              {showPasswordValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            className="text-xs text-primary font-semibold mt-2 ml-1 tap-scale"
            onClick={() => toast.info("Password reset coming soon.")}
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* ── Keep me signed in ── */}
      {showPass && (
        <button
          type="button"
          onClick={() => setKeep(v => !v)}
          className="flex items-center gap-3 mb-6 tap-scale select-none w-fit animate-fade-in"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* Neumorphic checkbox */}
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={
              keepSignedIn
                ? {
                    background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
                    boxShadow: "var(--shadow-navy)",
                  }
                : {
                    background: "hsl(var(--background))",
                    boxShadow: "var(--shadow-inset)",
                  }
            }
          >
            {keepSignedIn && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />}
          </div>
          <span className="text-sm font-semibold text-foreground">Keep me signed in</span>
        </button>
      )}

      {/* CTA */}
      <button
        onClick={showPass ? handleSignIn : handleContinue}
        disabled={signingIn || !email}
        className="w-full h-14 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-3 mb-8 tap-scale disabled:opacity-40"
        style={{
          background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
          boxShadow: "var(--shadow-navy)",
        }}
      >
        {signingIn
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Mail className="w-5 h-5" />{showPass ? "Sign In" : "Continue with Email"}<ArrowRight className="w-5 h-5" /></>}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <button onClick={() => navigate("/register")} className="font-bold text-primary tap-scale">
          Register your business
        </button>
      </p>
    </div>
  );
};

export default SignIn;
