import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

// Key used to persist the user's "keep me signed in" preference
export const KEEP_SIGNED_IN_KEY = "bookme_keep_signed_in";

const SignIn = () => {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [keepSignedIn, setKeep]   = useState(true);   // default ON
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

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
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignIn()}
              placeholder="••••••••"
              className="flex-1 h-full bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => setShowPwd(v => !v)}
              className="w-12 h-full flex items-center justify-center flex-shrink-0 tap-scale"
            >
              {showPwd
                ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                : <Eye    className="w-4 h-4 text-muted-foreground" />}
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
        disabled={loading || !email}
        className="w-full h-14 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-3 mb-8 tap-scale disabled:opacity-40"
        style={{
          background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
          boxShadow: "var(--shadow-navy)",
        }}
      >
        {loading
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Mail className="w-5 h-5" />{showPass ? "Sign In" : "Continue with Email"}<ArrowRight className="w-5 h-5" /></>}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
        <span className="text-xs text-muted-foreground font-semibold">or continue with</span>
        <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
      </div>

      {/* Social buttons */}
      <div className="flex gap-3 mb-10">
        {[
          { label: "Google", icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )},
          { label: "Apple", icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )},
        ].map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => toast.info(`${label} sign-in coming soon!`)}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-foreground tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

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
