import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, CheckCircle, ShieldCheck, FileText, Camera, Upload, AlertTriangle,
  User, Building, BadgeCheck, Clock, RefreshCw, ChevronRight, Check, X, Info, HelpCircle, Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import StateLgaSelector from "@/components/common/StateLgaSelector";
import { PhoneInput, isValidNigerianPhone } from "@/components/PhoneInput";
import { CATEGORIES } from "@/lib/categories";

type Step = 1 | 2 | 3 | 4 | 5 | 6; // 1: Identity, 2: ID Doc, 3: Business Info, 4: Business Proof, 5: Selfie, 6: Review & Submit

const ID_DOC_TYPES = [
  { id: "nin_slip", label: "National ID / NIN Slip" },
  { id: "drivers_license", label: "Driver's License" },
  { id: "international_passport", label: "International Passport" },
  { id: "voters_card", label: "Voter's Card" },
];

const PROOF_TYPES = [
  { id: "cac_cert", label: "CAC Registration Certificate (Registered Business)", category: "registered" },
  { id: "skill_cert", label: "Trade / Skill Certificate (Mechanic, Barber, Makeup, etc.)", category: "skill" },
  { id: "professional_cert", label: "Professional Certification / License", category: "skill" },
  { id: "academic_cert", label: "Academic / Vocational Credential", category: "skill" },
];

export default function VerificationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Form State
  // Step 1: Personal Identity
  const [ownerName, setOwnerName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nin, setNin] = useState("");

  // Step 2: ID Document
  const [idType, setIdType] = useState("nin_slip");
  const [idNumber, setIdNumber] = useState("");
  const [idDocUrl, setIdDocUrl] = useState("");

  // Step 3: Business Information
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");

  // Step 4: Business Proof
  const [proofType, setProofType] = useState("cac_cert");
  const [cacNumber, setCacNumber] = useState("");
  const [proofDocUrl, setProofDocUrl] = useState("");

  // Step 5: Selfie
  const [selfieUrl, setSelfieUrl] = useState("");

  // Step 6: Confirmation
  const [confirmedAccurate, setConfirmedAccurate] = useState(false);

  // Load existing profile & verification document data
  useEffect(() => {
    if (!profile) return;
    setOwnerName(profile.owner_name || profile.full_name || "");
    setDob(profile.dob || profile.date_of_birth || "");
    setPhone(profile.phone || "");
    setEmail(profile.email || user?.email || "");
    setNin(profile.nin || "");

    setBusinessName(profile.business_name || "");
    setCategory(profile.category || "");
    setBio(profile.bio || profile.business_description || "");
    setAddress(profile.address || "");
    setStateName(profile.state || "");
    setCityName(profile.city || "");
    setCacNumber(profile.business_registration_number || "");

    // Fetch existing documents from public.documents
    if (user?.id) {
      supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const idDoc = data.find((d: any) => ["nin_slip", "drivers_license", "international_passport", "voters_card", "id_card"].includes(d.document_type));
            if (idDoc) {
              setIdType(idDoc.document_type);
              setIdNumber(idDoc.document_number || "");
              setIdDocUrl(idDoc.document_url || "");
            }

            const proofDoc = data.find((d: any) => ["cac_cert", "skill_cert", "professional_cert", "academic_cert", "cac"].includes(d.document_type));
            if (proofDoc) {
              setProofType(proofDoc.document_type);
              setProofDocUrl(proofDoc.document_url || "");
            }

            const selfieDoc = data.find((d: any) => d.document_type === "selfie");
            if (selfieDoc) {
              setSelfieUrl(selfieDoc.document_url || "");
            }
          }
        });
    }
  }, [profile, user]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, targetKey: "id" | "proof" | "selfie") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(targetKey);
    const toastId = toast.loading(`Uploading ${targetKey === "id" ? "ID document" : targetKey === "proof" ? "business proof" : "verification selfie"}...`);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${targetKey}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("verification-documents").upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("verification-documents").getPublicUrl(fileName);
      const fileUrl = publicUrlData.publicUrl;

      if (targetKey === "id") setIdDocUrl(fileUrl);
      if (targetKey === "proof") setProofDocUrl(fileUrl);
      if (targetKey === "selfie") setSelfieUrl(fileUrl);

      toast.dismiss(toastId);
      toast.success("Document uploaded securely!");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Upload failed: ${err.message || "Please try again."}`);
    } finally {
      setUploadingDoc(null);
      e.target.value = "";
    }
  };

  const handleNextStep1 = () => {
    if (!ownerName.trim()) { toast.error("Please enter your full legal name."); return; }
    if (!isValidNigerianPhone(phone)) { toast.error("Enter a valid 11-digit Nigerian phone number."); return; }
    const cleanNin = nin.replace(/[^\d]/g, "");
    if (cleanNin && cleanNin.length !== 11) { toast.error("NIN must be exactly 11 digits."); return; }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!idDocUrl) { toast.error("Please upload a clear image of your ID document."); return; }
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!businessName.trim()) { toast.error("Please enter your business name."); return; }
    if (!category) { toast.error("Please select a business category."); return; }
    if (!address.trim()) { toast.error("Please enter your business street address."); return; }
    if (!stateName || !cityName) { toast.error("Please select your State and City/LGA."); return; }
    setStep(4);
  };

  const handleNextStep4 = () => {
    if (!proofDocUrl) { toast.error("Please upload your business registration or skill certificate."); return; }
    setStep(5);
  };

  const handleNextStep5 = () => {
    if (!selfieUrl) { toast.error("Please upload a clear selfie for identity confirmation."); return; }
    setStep(6);
  };

  const handleSubmitFinal = async () => {
    if (!user || !profile) return;
    if (!confirmedAccurate) { toast.error("Please confirm that all information provided is accurate."); return; }

    setSubmitting(true);
    const toastId = toast.loading("Submitting verification for Admin review...");

    try {
      // 1. Update Profile fields & status
      await updateProfile({
        owner_name: ownerName.trim(),
        full_name: ownerName.trim(),
        dob: dob,
        phone: phone,
        nin: nin.replace(/[^\d]/g, ""),
        business_name: businessName.trim(),
        category: category,
        bio: bio.trim(),
        business_description: bio.trim(),
        address: address.trim(),
        state: stateName,
        city: cityName,
        business_registration_number: cacNumber.trim() || null,
        verification_status: "under_review",
        action_required_reason: null,
      });

      // 2. Upsert document rows into public.documents
      const docsToUpsert = [
        {
          profile_id: profile.id,
          user_id: user.id,
          document_type: idType,
          document_number: idNumber || nin || null,
          document_url: idDocUrl,
          status: "under_review",
          action_required_reason: null,
        },
        {
          profile_id: profile.id,
          user_id: user.id,
          document_type: proofType,
          document_number: cacNumber || null,
          document_url: proofDocUrl,
          status: "under_review",
          action_required_reason: null,
        },
        {
          profile_id: profile.id,
          user_id: user.id,
          document_type: "selfie",
          document_number: null,
          document_url: selfieUrl,
          status: "under_review",
          action_required_reason: null,
        },
      ];

      for (const doc of docsToUpsert) {
        // Delete previous doc of same type if present
        await supabase.from("documents").delete().eq("profile_id", profile.id).eq("document_type", doc.document_type);
        await supabase.from("documents").insert(doc);
      }

      // 3. Add notification for provider
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Verification Submitted",
        body: "Your business verification has been submitted. Our team will review your application shortly.",
        type: "promotion",
        is_read: false,
      });

      toast.dismiss(toastId);
      toast.success("Verification submitted successfully!");
      setStep(6);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Submission failed: ${err.message || "Please check your network and try again."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = profile?.verification_status || (profile?.is_verified ? "verified" : "not_started");
  const actionReason = profile?.action_required_reason;

  const maskNin = (val: string) => {
    const cleanDigits = val.replace(/[^\d]/g, "");
    if (cleanDigits.length < 4) return cleanDigits;
    return "*".repeat(cleanDigits.length - 4) + cleanDigits.slice(-4);
  };

  return (
    <AppLayout>
      <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-extrabold text-foreground">Business Verification</h1>
          <div className="w-10" />
        </div>

        <div className="px-5 mt-5 space-y-6">

          {/* STATUS CARDS */}
          {currentStatus === "verified" ? (
            <div className="rounded-3xl p-6 text-center space-y-3 animate-fade-in" style={{ background: "hsl(142 76% 95%)", border: "1.5px solid hsl(142 71% 40%)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "hsl(142 71% 35%)" }}>
                <BadgeCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-green-900">✓ Business Verified</h2>
              <p className="text-xs text-green-800 leading-relaxed max-w-sm mx-auto">
                Your business identity and credentials have been verified by BookMe. Customers will see your official Verified badge.
              </p>
            </div>
          ) : currentStatus === "under_review" || currentStatus === "submitted" ? (
            <div className="rounded-3xl p-6 text-center space-y-3 animate-fade-in" style={{ background: "hsl(38 100% 95%)", border: "1.5px solid hsl(38 92% 50%)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "hsl(38 92% 50%)" }}>
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-extrabold text-amber-900">UNDER REVIEW</h2>
              <p className="text-xs text-amber-800 leading-relaxed max-w-sm mx-auto">
                Your verification has been submitted. We'll notify you when the review is complete or if we need anything else.
              </p>
            </div>
          ) : currentStatus === "action_required" ? (
            <div className="rounded-3xl p-6 space-y-3 animate-fade-in" style={{ background: "hsl(0 100% 96%)", border: "1.5px solid hsl(0 84% 60%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(0 84% 60%)" }}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-red-900">ACTION REQUIRED</h2>
                  <p className="text-xs text-red-700 font-medium">Please review Admin feedback and update your submission.</p>
                </div>
              </div>
              {actionReason && (
                <div className="rounded-2xl p-3 bg-white/80 border border-red-200 text-xs text-red-950 italic">
                  "{actionReason}"
                </div>
              )}
              <button onClick={() => setStep(1)} className="w-full h-12 rounded-2xl bg-red-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 tap-scale">
                <RefreshCw className="w-4 h-4" /> Fix & Resubmit Verification
              </button>
            </div>
          ) : currentStatus === "rejected" ? (
            <div className="rounded-3xl p-6 space-y-3 animate-fade-in" style={{ background: "hsl(0 100% 96%)", border: "1.5px solid hsl(0 84% 60%)" }}>
              <h2 className="text-base font-extrabold text-red-900">Verification Unsuccessful</h2>
              <p className="text-xs text-red-700 leading-relaxed">
                {actionReason || "Your verification could not be approved because the submitted information or documents could not be validated."}
              </p>
              <button onClick={() => setStep(1)} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs tap-scale">
                Restart Verification Application
              </button>
            </div>
          ) : null}

          {/* PROGRESS STEPS INDICATOR (When editable) */}
          {["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Verification Journey</h3>
                  <p className="text-[11px] text-muted-foreground">{step === 6 ? "Review & Submit" : `Step ${step} of 5 completed`}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full text-primary bg-primary/10">
                  {step === 6 ? "5 of 5" : `${step - 1} of 5`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => s < step && setStep(s as Step)} disabled={s > step}
                    className={`h-2 rounded-full transition-all ${s < step ? "bg-primary" : s === step ? "bg-primary animate-pulse" : "bg-muted"}`} />
                ))}
              </div>

              {/* Steps List */}
              <div className="space-y-2 pt-2">
                {[
                  { num: 1, label: "Personal Identity", done: step > 1 || !!ownerName },
                  { num: 2, label: "ID Document", done: step > 2 || !!idDocUrl },
                  { num: 3, label: "Business Information", done: step > 3 || !!businessName },
                  { num: 4, label: "Business Proof / Certificate", done: step > 4 || !!proofDocUrl },
                  { num: 5, label: "Owner Confirmation (Selfie)", done: step > 5 || !!selfieUrl },
                ].map((st) => (
                  <button key={st.num} onClick={() => setStep(st.num as Step)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs font-bold transition-all tap-scale ${step === st.num ? "border-2 border-primary bg-primary/5" : "bg-secondary/40"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${st.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                        {st.done ? <Check className="w-3.5 h-3.5" /> : st.num}
                      </div>
                      <span className="text-foreground">{st.label}</span>
                    </div>
                    {step === st.num ? <span className="text-[10px] text-primary font-bold uppercase">Active</span> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP FORM PANELS */}

          {/* STEP 1: PERSONAL IDENTITY */}
          {step === 1 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Step 1 — Personal Identity</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Full Legal Name *</label>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="As it appears on official ID"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Nigerian Phone Number *</label>
                <PhoneInput value={phone} onChange={(val) => setPhone(val)} />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled placeholder="owner@email.com"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary/50 text-muted-foreground text-sm outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">National Identity Number (NIN)</label>
                <input type="text" maxLength={11} value={nin} onChange={(e) => setNin(e.target.value.replace(/[^\d]/g, ""))} placeholder="11-digit NIN"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none font-mono" />
                {nin && <p className="text-[11px] text-muted-foreground mt-1">Masked preview: <span className="font-mono font-bold text-foreground">{maskNin(nin)}</span></p>}
              </div>

              <button onClick={handleNextStep1} className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale mt-4">
                Continue to ID Document <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: GOVT ID DOCUMENT */}
          {step === 2 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Step 2 — Government ID Document</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Document Type *</label>
                <div className="grid grid-cols-1 gap-2">
                  {ID_DOC_TYPES.map((dt) => (
                    <button key={dt.id} onClick={() => setIdType(dt.id)}
                      className={`p-3 rounded-2xl text-left text-xs font-bold border transition-all ${idType === dt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-foreground"}`}>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Document Number (Optional)</label>
                <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. License or Passport number"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none" />
              </div>

              {/* Requirement Alert Banner */}
              <div className="rounded-2xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Upload Requirements:</p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800">
                  <li>Entire document must be visible and readable</li>
                  <li>No blur, heavy shadows, or cropped edges</li>
                  <li>Must be an authentic government-issued document</li>
                </ul>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Upload Document Image *</label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors bg-secondary/20">
                  {idDocUrl ? (
                    <div className="text-center space-y-2">
                      <img src={idDocUrl} alt="ID Document" className="w-32 h-20 object-cover rounded-xl mx-auto shadow-md" />
                      <p className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Document Uploaded</p>
                      <span className="text-[10px] text-primary font-bold underline">Tap to change image</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-xs font-bold text-foreground">Tap to upload ID document</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG or PDF up to 10MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleUploadFile(e, "id")} />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 h-12 rounded-2xl bg-secondary text-foreground font-bold text-xs">Back</button>
                <button onClick={handleNextStep2} className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale">
                  Continue to Business Info <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS INFORMATION */}
          {step === 3 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Building className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Step 3 — Business Information</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Business Name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Toni Cuts Barbershop"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Business Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none">
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Street Address *</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 14 Wetheral Road, Owerri"
                  className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none" />
              </div>

              <StateLgaSelector stateValue={stateName} lgaValue={cityName} onStateChange={setStateName} onLgaChange={setCityName} required />

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Short Bio / Description</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief description of your services..."
                  className="w-full p-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none resize-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 h-12 rounded-2xl bg-secondary text-foreground font-bold text-xs">Back</button>
                <button onClick={handleNextStep3} className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale">
                  Continue to Business Proof <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: BUSINESS PROOF */}
          {step === 4 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Step 4 — Business Proof / Certificate</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Proof Document Type *</label>
                <div className="space-y-2">
                  {PROOF_TYPES.map((pt) => (
                    <button key={pt.id} onClick={() => setProofType(pt.id)}
                      className={`w-full p-3 rounded-2xl text-left text-xs font-bold border transition-all ${proofType === pt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-foreground"}`}>
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {proofType === "cac_cert" && (
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">CAC / RC Registration Number</label>
                  <input type="text" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="e.g. RC123456"
                    className="w-full h-12 px-3.5 rounded-2xl bg-secondary text-foreground text-sm outline-none font-mono" />
                </div>
              )}

              {/* Upload Dropzone */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Upload Proof Document *</label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors bg-secondary/20">
                  {proofDocUrl ? (
                    <div className="text-center space-y-2">
                      <img src={proofDocUrl} alt="Proof Document" className="w-32 h-20 object-cover rounded-xl mx-auto shadow-md" />
                      <p className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Proof Uploaded</p>
                      <span className="text-[10px] text-primary font-bold underline">Tap to change file</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-xs font-bold text-foreground">Tap to upload CAC or Skill Certificate</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG or PDF up to 10MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleUploadFile(e, "proof")} />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(3)} className="flex-1 h-12 rounded-2xl bg-secondary text-foreground font-bold text-xs">Back</button>
                <button onClick={handleNextStep4} className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale">
                  Continue to Owner Selfie <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: OWNER CONFIRMATION (SELFIE) */}
          {step === 5 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Step 5 — Owner Confirmation Selfie</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Take or upload a clear recent selfie of yourself. Our Admin team compares this photo with your government ID document to confirm account ownership.
              </p>

              <div>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors bg-secondary/20">
                  {selfieUrl ? (
                    <div className="text-center space-y-2">
                      <img src={selfieUrl} alt="Owner Selfie" className="w-24 h-24 rounded-full object-cover mx-auto shadow-md border-2 border-primary" />
                      <p className="text-xs font-bold text-green-600 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Selfie Captured</p>
                      <span className="text-[10px] text-primary font-bold underline">Retake / Change selfie</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Camera className="w-10 h-10 text-primary mx-auto" />
                      <p className="text-xs font-bold text-foreground">Tap to take or upload selfie</p>
                      <p className="text-[10px] text-muted-foreground">Clear face photo without heavy filters</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFile(e, "selfie")} />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(4)} className="flex-1 h-12 rounded-2xl bg-secondary text-foreground font-bold text-xs">Back</button>
                <button onClick={handleNextStep5} className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale">
                  Review & Submit <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & SUBMIT */}
          {step === 6 && ["not_started", "in_progress", "action_required"].includes(currentStatus) && (
            <div className="rounded-3xl p-5 space-y-4 animate-fade-in" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <BadgeCheck className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Review Your Verification Application</h3>
              </div>

              <div className="space-y-3 divide-y divide-border text-xs">
                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Owner Identity</p>
                    <p className="text-muted-foreground">{ownerName} · NIN: {nin ? maskNin(nin) : "—"}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-primary font-bold text-[11px]">Edit</button>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">ID Document</p>
                    <p className="text-muted-foreground">{ID_DOC_TYPES.find(t => t.id === idType)?.label}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="text-primary font-bold text-[11px]">Edit</button>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Business Information</p>
                    <p className="text-muted-foreground">{businessName} · {address}, {cityName}, {stateName}</p>
                  </div>
                  <button onClick={() => setStep(3)} className="text-primary font-bold text-[11px]">Edit</button>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Business Proof</p>
                    <p className="text-muted-foreground">{PROOF_TYPES.find(t => t.id === proofType)?.label}</p>
                  </div>
                  <button onClick={() => setStep(4)} className="text-primary font-bold text-[11px]">Edit</button>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">Selfie Status</p>
                    <p className="text-green-600 font-bold">✓ Captured</p>
                  </div>
                  <button onClick={() => setStep(5)} className="text-primary font-bold text-[11px]">Edit</button>
                </div>
              </div>

              <div className="pt-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={confirmedAccurate} onChange={(e) => setConfirmedAccurate(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary w-4 h-4" />
                  <span className="text-xs text-foreground font-medium leading-tight">
                    I confirm that all information and uploaded documents provided are authentic, accurate, and belong to this business.
                  </span>
                </label>
              </div>

              <button onClick={handleSubmitFinal} disabled={submitting || !confirmedAccurate}
                className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 tap-scale disabled:opacity-50 mt-4">
                {submitting ? "Submitting Application..." : "Submit for Verification"}
              </button>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
