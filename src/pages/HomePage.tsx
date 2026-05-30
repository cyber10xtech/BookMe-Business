import { useState, useRef, useEffect } from "react";
import { Camera, Globe, MapPin, Phone, Mail, Tag, Lock, Star, Plus, Edit2, Image as ImageIcon, Clock, Eye, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/layout/AppLayout";
import AddServiceSheet, { type AddServiceData } from "@/components/dashboard/AddServiceSheet";
import { useProfile } from "@/hooks/useProfile";
import { useServices } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/categories";
import { useNavigate } from "react-router-dom";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const NeuSection = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-3xl p-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">{title}</p>
      {action}
    </div>
    {children}
  </div>
);

const NeuRow = ({ icon: Icon, label, value, locked }: { icon: any; label: string; value?: string|null; locked?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-primary font-extrabold uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5 truncate">{value || "Not set"}</p>
    </div>
    {locked && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
  </div>
);

const Divider = () => <div className="h-px my-3" style={{ background: "hsl(var(--border))" }} />;

const HomePage = () => {
  const { user } = useAuth();
  const { profile, uploadImage, updateProfile } = useProfile();
  const { services, addService } = useServices();
  const navigate = useNavigate();

  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  const coverRef  = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("gallery_photos").select("photo_url").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGalleryPhotos(data?.map((p: any) => p.photo_url) || []));
  }, [user]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingCover(true);
    const url = await uploadImage(file, "cover");
    if (url) { await updateProfile({ cover_photo_url: url, cover_image_url: url }); toast.success("Cover photo updated!"); }
    else toast.error("Upload failed.");
    setUploadingCover(false); e.target.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadImage(file, "avatar");
    if (url) { await updateProfile({ avatar_url: url }); toast.success("Profile photo updated!"); }
    e.target.value = "";
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || !user) return;
    for (const file of Array.from(files)) {
      const path = `${user.id}/gallery/${Date.now()}-${file.name}`;
      await supabase.storage.from("business-assets").upload(path, file);
      const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
      await supabase.from("gallery_photos").insert({ user_id: user.id, photo_url: data.publicUrl });
      setGalleryPhotos(prev => [data.publicUrl, ...prev]);
    }
    toast.success("Photos added!"); e.target.value = "";
  };

  const handleAddService = async (data: AddServiceData) => {
    await addService({
      name: data.name, duration: data.duration, price: data.price, category: profile?.category,
      description: JSON.stringify({ pricingType: data.pricingType, maxPrice: data.maxPrice, imageUrls: data.imageUrls, description: data.description }),
    });
    toast.success("Service added!");
  };

  const getMeta = (s: any) => { try { return JSON.parse(s.description || "{}"); } catch { return {}; } };
  const categoryLabel = CATEGORIES.find(c => c.id === profile?.category)?.label || profile?.category || "Not set";
  const coverUrl = profile?.cover_photo_url || profile?.cover_image_url;
  const businessHours = profile?.business_hours || {};
  const displayRating = profile?.average_rating || profile?.rating || 0;
  const reviewCount   = profile?.review_count || 0;
  const initials = (profile?.business_name || "B")[0]?.toUpperCase();

  return (
    <AppLayout>
      {/* Hidden inputs */}
      <input ref={coverRef}   type="file" accept="image/*"          className="hidden" onChange={handleCoverUpload}  />
      <input ref={avatarRef}  type="file" accept="image/*"          className="hidden" onChange={handleAvatarUpload} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload}/>

      <AddServiceSheet open={serviceSheetOpen} onClose={() => setServiceSheetOpen(false)}
        onSave={handleAddService} userId={user?.id || ""} />

      {/* Cover photo */}
      <div className="relative h-48 cursor-pointer group select-none" onClick={() => coverRef.current?.click()}>
        <div className="w-full h-full overflow-hidden"
          style={{ background: "linear-gradient(160deg, hsl(220 60% 15%), hsl(220 100% 8%))" }}>
          {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />}
        </div>
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all ${uploadingCover ? "bg-black/50" : "bg-black/25 group-active:bg-black/40"}`}>
          {uploadingCover
            ? <><div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" /><p className="text-white text-xs">Uploading…</p></>
            : <><div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><Camera className="w-5 h-5 text-white" /></div>
               <p className="text-white text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }}>{coverUrl ? "Change Cover" : "Add Cover Photo"}</p></>
          }
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center -mt-14 relative z-10">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 overflow-hidden flex items-center justify-center"
            style={{ borderColor: "hsl(var(--background))", background: "linear-gradient(135deg, hsl(220 80% 30%), hsl(220 100% 12%))", boxShadow: "var(--shadow-raised)" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl font-extrabold text-white">{initials}</span>}
          </div>
          <button onClick={() => avatarRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <Camera className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <h1 className="text-xl font-extrabold text-foreground mt-3">{profile?.business_name || "Your Business"}</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <Tag className="w-3.5 h-3.5" />{categoryLabel}
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3.5 h-3.5 ${s <= displayRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/25"}`} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({reviewCount} reviews)</span>
        </div>

        <div className="flex gap-3 mt-4">
          {[{ label: "Edit Profile", icon: Edit2, action: () => navigate("/edit-profile") },
            { label: "Preview",      icon: Eye,   action: () => toast.info("This is how customers see your profile.") }
          ].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-8 mt-4 px-6 py-4 rounded-3xl"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          {[{ value: services.length, label: "Services" },
            { value: reviewCount,     label: "Reviews"  },
            { value: galleryPhotos.length, label: "Gallery" }
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
              </div>
              {i < 2 && <div className="w-px h-8" style={{ background: "hsl(var(--border))" }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-6">

        {/* About */}
        <NeuSection title="About" action={
          <button onClick={() => navigate("/edit-profile")} className="text-xs font-bold text-primary tap-scale">Edit</button>
        }>
          <div className="space-y-3">
            <NeuRow icon={Globe} label="Bio" value={profile?.bio || profile?.business_description} />
            <Divider />
            <NeuRow icon={Globe} label="Website" value={profile?.website} />
          </div>
        </NeuSection>

        {/* Contact */}
        <NeuSection title="Contact & Location">
          <div className="space-y-3">
            <NeuRow icon={Mail}   label="Email"    value={profile?.email || user?.email} />
            <Divider />
            <NeuRow icon={Phone}  label="Phone"    value={profile?.phone} />
            <Divider />
            <NeuRow icon={MapPin} label="Address"  value={profile?.address} />
            <Divider />
            <NeuRow icon={MapPin} label="City"     value={profile?.city} />
            <Divider />
            <NeuRow icon={MapPin} label="State"    value={profile?.state} />
            <Divider />
            <NeuRow icon={Tag}    label="Category" value={categoryLabel} locked />
          </div>
        </NeuSection>

        {/* Business hours */}
        <NeuSection title="Business Hours" action={
          <button onClick={() => navigate("/edit-profile")}
            className="text-xs font-bold px-3 py-1.5 rounded-xl tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--foreground))" }}>
            Edit Hours
          </button>
        }>
          <div className="space-y-3">
            {DAYS.map((day, i) => {
              const d = (businessHours as any)?.[day];
              const isOpen = d?.enabled;
              return (
                <div key={day}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{day}</span>
                    <div className="flex items-center gap-3">
                      {isOpen
                        ? <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{d.start} – {d.end}</span>
                        : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 84% 50%)" }}>Closed</span>
                      }
                      <Switch checked={isOpen} disabled className="pointer-events-none" />
                    </div>
                  </div>
                  {i < DAYS.length - 1 && <Divider />}
                </div>
              );
            })}
          </div>
        </NeuSection>

        {/* Services */}
        <NeuSection title="Services" action={
          <button onClick={() => setServiceSheetOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl tap-scale"
            style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)", color: "white" }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }>
          {services.length === 0 ? (
            <button onClick={() => setServiceSheetOpen(true)}
              className="w-full rounded-2xl p-8 flex flex-col items-center tap-scale"
              style={{ border: "2px dashed hsl(var(--border))" }}>
              <Plus className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Add your first service</p>
            </button>
          ) : (
            <div className="space-y-3">
              {services.map((s, i) => {
                const meta = getMeta(s);
                return (
                  <div key={s.id}>
                    <div className="flex items-center gap-3">
                      {meta.imageUrls?.[0]
                        ? <img src={meta.imageUrls[0]} className="w-11 h-11 rounded-2xl object-cover flex-shrink-0" style={{ boxShadow: "var(--shadow-flat)" }} alt={s.name} />
                        : <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>{meta.emoji || "⭐"}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.duration} · {meta.pricingType === "range" && meta.maxPrice
                            ? `₦${s.price.toLocaleString()} – ₦${meta.maxPrice.toLocaleString()}`
                            : `₦${s.price.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    {i < services.length - 1 && <Divider />}
                  </div>
                );
              })}
            </div>
          )}
        </NeuSection>

        {/* Gallery */}
        <NeuSection title="Gallery" action={
          <button onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--foreground))" }}>
            <ImageIcon className="w-3.5 h-3.5" /> Add
          </button>
        }>
          {galleryPhotos.length === 0 ? (
            <button onClick={() => galleryRef.current?.click()}
              className="w-full rounded-2xl p-8 flex flex-col items-center tap-scale"
              style={{ border: "2px dashed hsl(var(--border))" }}>
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Upload photos of your work</p>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.slice(0, 9).map((url, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden"
                  style={{ boxShadow: "var(--shadow-flat)" }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {galleryPhotos.length > 9 && (
                <div className="aspect-square rounded-2xl flex items-center justify-center text-sm font-bold text-primary"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                  +{galleryPhotos.length - 9}
                </div>
              )}
            </div>
          )}
        </NeuSection>
      </div>
    </AppLayout>
  );
};

export default HomePage;
