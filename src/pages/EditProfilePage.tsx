import { useState, useRef, useEffect } from "react";
import { Camera, ArrowLeft, Eye, Lock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import { useProfileCompletion, COMPLETION_THRESHOLD } from "@/hooks/useProfileCompletion";
import { useServices } from "@/hooks/useServices";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, uploadImage, loading } = useProfile();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    full_name: "",
    phone: "",
    bio: "",
    website: "",
    address: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name || "",
        owner_name: profile.owner_name || "",
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || profile.business_description || "",
        website: profile.website || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
      });
    }
  }, [profile]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const toastId = toast.loading("Uploading cover photo...");
    try {
      const url = await uploadImage(file, "cover");
      toast.dismiss(toastId);
      if (url) {
        await updateProfile({ cover_photo_url: url, cover_image_url: url });
        toast.success("Cover photo updated!");
      } else {
        toast.error("Upload failed. Check storage permissions.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const toastId = toast.loading("Uploading profile photo...");
    try {
      const url = await uploadImage(file, "avatar");
      toast.dismiss(toastId);
      if (url) {
        await updateProfile({ avatar_url: url });
        toast.success("Profile photo updated!");
      } else {
        toast.error("Upload failed. Check storage permissions.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleSave = async () => {
    await updateProfile({
      business_name: form.business_name,
      owner_name: form.owner_name,
      full_name: form.full_name || form.owner_name,
      phone: form.phone,
      bio: form.bio,
      business_description: form.bio,
      website: form.website,
      address: form.address,
      city: form.city,
      state: form.state,
    });
    toast.success("Profile saved!");
    navigate("/home");
  };

  const { services } = useServices();
  // Build a "live" profile snapshot using the current form state so the bar
  // reacts to edits before the user hits Save
  const liveProfile = profile
    ? {
        ...profile,
        business_name: form.business_name || profile.business_name,
        owner_name:    form.owner_name    || profile.owner_name,
        full_name:     form.full_name     || profile.full_name,
        phone:         form.phone         || profile.phone,
        bio:           form.bio           || profile.bio,
        business_description: form.bio   || profile.business_description,
        address:       form.address       || profile.address,
        city:          form.city          || profile.city,
        state:         form.state         || profile.state,
      }
    : null;
  const { percentage, isShadowBanned } = useProfileCompletion(liveProfile as any, services.length);

  const categoryLabel = CATEGORIES.find((c) => c.id === profile?.category)?.label || profile?.category || "Not set";
  const initials = (profile?.business_name || "B")[0]?.toUpperCase();

  if (loading) return <div className="min-h-screen bg-secondary flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-secondary">
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <span className="text-base font-bold text-foreground">Edit Profile</span>
        <button onClick={() => navigate("/home")} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Preview profile">
          <Eye className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Inline completion strip */}
      {/* Profile completion strip */}
      <div className="bg-card border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Ring */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(220 13% 91%)" strokeWidth="4" />
              <circle cx="20" cy="20" r="16" fill="none"
                stroke={isShadowBanned ? "#f43f5e" : percentage >= 90 ? "#10b981" : percentage >= COMPLETION_THRESHOLD ? "hsl(220 100% 12%)" : "#f59e0b"}
                strokeWidth="4"
                strokeDasharray={`${(percentage / 100) * 100.53} 100.53`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-foreground" style={{ fontSize: 9 }}>
              {percentage}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">Profile completion</span>
              <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " +
                (isShadowBanned ? "bg-rose-50 text-rose-700 border-rose-200" :
                 percentage >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                 "bg-amber-50 text-amber-700 border-amber-200")}>
                {isShadowBanned ? "Hidden" : percentage >= 90 ? "Live ✨" : "Almost there"}
              </span>
            </div>
            <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={"h-full rounded-full transition-all duration-500 " +
                  (isShadowBanned ? "bg-rose-500" : percentage >= 90 ? "bg-emerald-500" : percentage >= COMPLETION_THRESHOLD ? "bg-primary" : "bg-amber-500")}
                style={{ width: percentage + "%" }}
              />
              <div className="absolute top-0 h-full w-px bg-border/60" style={{ left: COMPLETION_THRESHOLD + "%" }} />
            </div>
            {isShadowBanned && (
              <p className="text-[10px] text-rose-600 mt-1 font-medium">
                Reach {COMPLETION_THRESHOLD}% to appear in customer search
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-44 bg-gradient-to-br from-primary to-primary/70">
        {(profile?.cover_photo_url || profile?.cover_image_url) && (
          <img src={profile?.cover_photo_url || profile?.cover_image_url || ""} alt="Cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute bottom-3 right-3">
          <label htmlFor="edit-cover-upload" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/60 text-background text-xs font-medium backdrop-blur-sm cursor-pointer active:scale-95 transition-transform">
            <Camera className="w-3.5 h-3.5" /> Change Cover
          </label>
          <input id="edit-cover-upload" type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
        </div>
      </div>

      <div className="flex justify-center -mt-14 relative z-10">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-card bg-primary flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
            )}
          </div>
          <button onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm">
            <Camera className="w-3.5 h-3.5 text-foreground" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
      </div>

      <div className="px-5 mt-6 pb-8 space-y-4">
        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Business Name</Label>
            <Input value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Owner Name</Label>
            <Input value={form.owner_name} onChange={(e) => setForm((p) => ({ ...p, owner_name: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} className="mt-1 rounded-xl bg-secondary border-0 min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Website</Label>
            <Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Address</Label>
            <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">City</Label>
            <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">State</Label>
            <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="mt-1 h-12 rounded-xl bg-secondary border-0" />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <Tag className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Category (Locked)</p>
              <p className="text-sm font-medium text-foreground">{categoryLabel}</p>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full h-12 rounded-xl font-semibold">Save Changes</Button>
      </div>
    </div>
  );
};

export default EditProfilePage;
