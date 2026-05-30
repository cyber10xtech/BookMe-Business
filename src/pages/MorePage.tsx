import { useState, useEffect } from "react";
import { Lock, LogOut, FileText, Shield, MessageCircle, ChevronRight, ExternalLink, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

const MorePage = () => {
  const { signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const { percentage, missingItems, completedItems } = useProfileCompletion(profile, 0);

  const [autoAccept, setAutoAccept] = useState(false); // kept for future booking automation
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [prefs, setPrefs] = useState({
    bookingAlerts: true,
    bookingCancellations: true,
    newReviews: true,
    smsAlerts: false,
  });
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (!profile) return;
    const notifPrefs = (profile as any).notification_preferences || {};
    setAutoAccept(!!(notifPrefs as any).auto_accept_bookings ?? false);
    setPrefs({
      bookingAlerts:         notifPrefs.push ?? true,
      bookingCancellations:  notifPrefs.booking_cancellations ?? true,
      newReviews:            notifPrefs.new_reviews ?? true,
      smsAlerts:             notifPrefs.sms ?? false,
    });
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    navigate("/signin");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully!");
    setPasswordDialog(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AppLayout>
      <div className="px-5 pt-5 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-5">Settings</h1>

        {/* ── Profile Completion ── */}
        {percentage < 100 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
            <button
              onClick={() => setCompletionExpanded((p) => !p)}
              className="w-full px-5 py-4 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
            >
              {/* Mini ring */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="15" fill="none" stroke="hsl(220 13% 91%)" strokeWidth="4" />
                  <circle cx="20" cy="20" r="15" fill="none"
                    stroke={percentage < 50 ? "#f43f5e" : percentage < 75 ? "#f59e0b" : "#10b981"}
                    strokeWidth="4"
                    strokeDasharray={`${(percentage / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground rotate-0">
                  {percentage}%
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">Profile Completion</p>
                <p className="text-xs text-muted-foreground">
                  {completedItems.length}/{completedItems.length + missingItems.length} items complete
                </p>
              </div>
              {completionExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {completionExpanded && (
              <div className="border-t border-border px-5 py-3 space-y-2">
                {[...completedItems, ...missingItems].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => item.route && navigate(item.route)}
                    className="w-full flex items-start gap-3 py-2.5 text-left hover:bg-secondary/40 rounded-xl px-2 transition-colors"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      {!item.done && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                      )}
                    </div>
                    {!item.done && item.route && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Booking Automation — hidden until fully operational ── */}
        {/* Uncomment when booking automation is ready:
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          ...
        </div>
        */}

        {/* ── Notification Preferences ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Notification Preferences</p>
          </div>
          <div className="px-5 py-2">
            {[
              { key: "bookingAlerts",        label: "New booking alerts" },
              { key: "bookingCancellations", label: "Booking cancellations" },
              { key: "newReviews",           label: "New reviews" },
              { key: "smsAlerts",            label: "SMS alerts" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{item.label}</span>
                <Switch
                  checked={prefs[item.key as keyof typeof prefs]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Account ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
          </div>
          <button onClick={() => setPasswordDialog(true)}
            className="w-full flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-secondary/50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground text-sm">Change Password</p>
              <p className="text-xs text-muted-foreground">Update your login credentials</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/5 transition-colors">
            <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-destructive text-sm">Log Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
          </button>
        </div>

        {/* ── Legal ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">BookMe App</p>
          </div>
          {[
            { icon: FileText, label: "Terms & Conditions",  sub: "Read our terms of service" },
            { icon: Shield,   label: "Privacy Policy",      sub: "Read our privacy policy" },
          ].map((item, i) => (
            <button key={item.label}
              onClick={() => toast.info(`${item.label} — contact legal@bookme.ng`)}
              className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors ${i === 0 ? "border-b border-border" : ""}`}>
              <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* ── Help ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Help Center</p>
          </div>
          <a href="https://wa.me/2348000000000"
            className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-success/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">WhatsApp Support</p>
              <p className="text-xs text-muted-foreground">Chat with our team directly</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">BookMe Business v1.0.0</p>
      </div>

      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input type="password" placeholder="New password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl bg-secondary border-0" />
            <Input type="password" placeholder="Confirm new password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl bg-secondary border-0" />
            <Button onClick={handleChangePassword} disabled={changingPw} className="w-full h-12 rounded-xl">
              {changingPw ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MorePage;
