/**
 * ChatWindow.tsx  — shared WhatsApp-style chat component
 * Works in both the customer app and business app.
 *
 * Props:
 *   conversationId   — uuid from chat_conversations
 *   currentUserId    — auth.users.id of the logged-in user
 *   currentRole      — 'provider' | 'customer'
 *   otherName        — display name of the other participant
 *   otherAvatar      — avatar url (optional)
 *   onClose          — () => void  (back to inbox)
 *   onBackToDashboard — optional () => void  (shortcut to home dashboard)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Send, Paperclip, Mic, Image as ImageIcon,
  Check, CheckCheck, Smile, X, Play, Pause, Square,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Microphone permission modal ──────────────────────────────────────────────
const MicPermissionModal = ({
  onAllow, onDeny,
}: { onAllow: () => void; onDeny: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-end justify-center"
    style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
    <div
      className="w-full max-w-lg rounded-t-[2rem] p-6 pb-10 animate-slide-up"
      style={{ background: "hsl(var(--background))", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
    >
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <Mic className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
        </div>
      </div>
      <h2 className="text-lg font-extrabold text-foreground text-center mb-1">
        Microphone Access
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed px-2">
        BookMe Business needs your microphone to send voice notes.
        Your audio is only recorded while you hold the mic button — nothing is
        captured at any other time.
      </p>
      <button
        onClick={onAllow}
        className="w-full h-[52px] rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 mb-3 tap-scale"
        style={{
          background: "linear-gradient(145deg, hsl(var(--primary)), hsl(220 100% 30%))",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        <Mic className="w-4 h-4" /> Allow Microphone
      </button>
      <button
        onClick={onDeny}
        className="w-full h-11 rounded-2xl font-semibold text-sm tap-scale"
        style={{
          background: "hsl(var(--background))",
          boxShadow: "var(--shadow-flat)",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        Not Now
      </button>
    </div>
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "provider" | "customer";
  message_type: "text" | "image" | "voice";
  content: string | null;
  media_url: string | null;
  media_duration: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  currentRole: "provider" | "customer";
  otherName: string;
  otherAvatar?: string | null;
  onClose: () => void;
  /** Optional: navigate all the way back to /home dashboard */
  onBackToDashboard?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const groupByDate = (msgs: Message[]) => {
  const groups: { label: string; messages: Message[] }[] = [];
  let cur: { label: string; messages: Message[] } | null = null;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const m of msgs) {
    const d = new Date(m.created_at).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday"
      : new Date(m.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
    if (!cur || cur.label !== label) {
      cur = { label, messages: [] };
      groups.push(cur);
    }
    cur.messages.push(m);
  }
  return groups;
};

// ─── Tick icons ───────────────────────────────────────────────────────────────
const Ticks = ({ isMine, isRead }: { isMine: boolean; isRead: boolean }) => {
  if (!isMine) return null;
  return isRead
    ? <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#53bdeb" }} />
    : <CheckCheck className="w-3.5 h-3.5 flex-shrink-0 text-white/60" />;
};

// ─── Voice note player ────────────────────────────────────────────────────────
const VoicePlayer = ({ url, duration, isMine }: { url: string; duration: number | null; isMine: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.addEventListener("timeupdate", () => {
      setCurrent(Math.floor(a.currentTime));
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    });
    a.addEventListener("ended", () => { setPlaying(false); setProgress(0); setCurrent(0); });
    return () => { a.pause(); a.src = ""; };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const totalSec = duration ?? 0;
  const shown = playing ? current : totalSec;

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isMine ? "rgba(255,255,255,0.25)" : "rgba(13,22,38,0.12)" }}>
        {playing
          ? <Pause className="w-4 h-4 fill-current" style={{ color: isMine ? "#fff" : "#0d1626" }} />
          : <Play  className="w-4 h-4 fill-current ml-0.5" style={{ color: isMine ? "#fff" : "#0d1626" }} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: isMine ? "rgba(255,255,255,0.3)" : "rgba(13,22,38,0.15)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: isMine ? "#fff" : "#0d1626" }} />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: isMine ? "rgba(255,255,255,0.8)" : "rgba(13,22,38,0.5)" }}>
          {formatDuration(shown)}
        </span>
      </div>
    </div>
  );
};

// ─── Recording indicator ──────────────────────────────────────────────────────
const RecordingBar = ({ seconds, onStop, onCancel }: { seconds: number; onStop: () => void; onCancel: () => void }) => (
  <div className="flex items-center gap-3 flex-1">
    <button onClick={onCancel} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "hsl(0 60% 94%)" }}>
      <X className="w-5 h-5" style={{ color: "hsl(0 84% 45%)" }} />
    </button>
    <div className="flex-1 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
      <span className="text-sm font-semibold text-foreground">Recording  {formatDuration(seconds)}</span>
    </div>
    <button onClick={onStop}
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
      <Square className="w-4 h-4 fill-white text-white" />
    </button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ChatWindow = ({
  conversationId, currentUserId, currentRole, otherName, otherAvatar, onClose, onBackToDashboard,
}: ChatWindowProps) => {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [loading, setLoading]         = useState(true);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [isTyping, setIsTyping]       = useState(false);    // other user typing
  const [recording, setRecording]     = useState(false);
  const [recSeconds, setRecSeconds]   = useState(0);
  const [imagePreview, setImagePreview] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  // "unknown" = not asked | "granted" = OK | "requesting" = showing modal | "denied"
  const [micPermission, setMicPermission] = useState<"unknown"|"granted"|"requesting"|"denied">("unknown");

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRec     = useRef<MediaRecorder | null>(null);
  const recChunks    = useRef<Blob[]>([]);
  const recTimer     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const msgSub = supabase
      .channel(`chat-messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read if not mine
        if (msg.sender_id !== currentUserId) {
          supabase.from("chat_messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", msg.id).then(() => {});
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    const typingSub = supabase
      .channel(`chat-typing-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_typing",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row?.user_id !== currentUserId) {
          setIsTyping(row?.is_typing ?? false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(typingSub);
    };
  }, [conversationId, currentUserId]);

  // ── Mark all unread messages as read on mount ──────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const unread = messages.filter(m => !m.is_read && m.sender_id !== currentUserId);
    if (unread.length === 0) return;
    supabase.from("chat_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unread.map(m => m.id)).then(() => {});
  }, [messages, currentUserId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Typing indicator ───────────────────────────────────────────────────────
  const broadcastTyping = async (typing: boolean) => {
    await supabase.from("chat_typing").upsert({
      conversation_id: conversationId,
      user_id: currentUserId,
      is_typing: typing,
      updated_at: new Date().toISOString(),
    }, { onConflict: "conversation_id,user_id" });
  };

  const handleTextChange = (val: string) => {
    setText(val);
    broadcastTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  // ── Send text ──────────────────────────────────────────────────────────────
  const sendText = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText("");
    broadcastTyping(false);
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_role: currentRole,
      message_type: "text",
      content: t,
    });
    setSending(false);
  };

  // ── Upload media helper ─────────────────────────────────────────────────────
  const uploadToStorage = async (file: File | Blob, type: "image" | "voice"): Promise<string | null> => {
    const ext = type === "image" ? "jpg" : "m4a";
    const path = `conversations/${conversationId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Send image ─────────────────────────────────────────────────────────────
  const sendImage = async (file: File) => {
    setUploadingMedia(true);
    setImagePreview(null);
    const url = await uploadToStorage(file, "image");
    if (!url) { setUploadingMedia(false); return; }
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_role: currentRole,
      message_type: "image",
      media_url: url,
    });
    setUploadingMedia(false);
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  //
  // Permission flow:
  //   1. First tap → check browser PermissionsAPI (no OS prompt yet)
  //      a. Already "granted" → start recording immediately
  //      b. "denied"          → show our modal explaining they need to unblock in settings
  //      c. "prompt" / unknown → show our neumorphic modal first, then
  //                              invoke getUserMedia when user taps "Allow"
  //   2. Subsequent taps — if micPermission state is "granted", skip straight
  //      to recording without showing any UI.
  //
  const doStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
      mr.start();
      mediaRec.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
      setMicPermission("granted");
    } catch {
      // NotAllowedError = user blocked or OS denied
      setMicPermission("denied");
    }
  };

  const startRecording = async () => {
    if (micPermission === "granted") { doStartRecording(); return; }
    if (micPermission === "denied")  { setMicPermission("requesting"); return; }

    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (status.state === "granted") {
        setMicPermission("granted");
        doStartRecording();
      } else if (status.state === "denied") {
        setMicPermission("requesting");
      } else {
        setMicPermission("requesting");
      }
    } catch {
      setMicPermission("requesting");
    }
  };

  const stopRecording = async () => {
    if (!mediaRec.current) return;
    const mr = mediaRec.current;
    const dur = recSeconds;
    clearInterval(recTimer.current!);
    setRecording(false);
    setRecSeconds(0);

    await new Promise<void>(res => { mr.onstop = () => res(); mr.stop(); });
    mr.stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(recChunks.current, { type: "audio/mp4" });
    setUploadingMedia(true);
    const url = await uploadToStorage(blob, "voice");
    if (url) {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_role: currentRole,
        message_type: "voice",
        media_url: url,
        media_duration: dur,
      });
    }
    setUploadingMedia(false);
  };

  const cancelRecording = () => {
    if (!mediaRec.current) return;
    clearInterval(recTimer.current!);
    mediaRec.current.stop();
    mediaRec.current.stream.getTracks().forEach(t => t.stop());
    recChunks.current = [];
    setRecording(false);
    setRecSeconds(0);
  };

  // ── Grouped messages ───────────────────────────────────────────────────────
  const grouped = groupByDate(messages);

  const initials = otherName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "hsl(var(--background))" }}>

      {/* ── Microphone permission modal ──────────────────────────────────── */}
      {micPermission === "requesting" && (
        <MicPermissionModal
          onAllow={() => {
            setMicPermission("unknown"); // reset so doStartRecording sets it to "granted"
            doStartRecording();
          }}
          onDeny={() => setMicPermission("denied")}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ background: "hsl(var(--background))", boxShadow: "0 2px 12px rgba(13,22,38,0.08)" }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale flex-shrink-0"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>

        {otherAvatar
          ? <img src={otherAvatar} alt={otherName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ boxShadow: "var(--shadow-flat)" }} />
          : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,hsl(220 80% 40%),hsl(220 100% 20%))", boxShadow: "var(--shadow-flat)" }}>
              {initials}
            </div>
        }

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-foreground text-sm leading-tight truncate">{otherName}</p>
          {isTyping
            ? <p className="text-[11px] font-semibold" style={{ color: "#22c55e" }}>typing…</p>
            : <p className="text-[11px] text-muted-foreground">tap for info</p>
          }
        </div>

        {/* Dashboard shortcut — only rendered when caller provides the handler */}
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale flex-shrink-0"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}
            title="Go to dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 text-foreground">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        style={{ background: "hsl(var(--background))" }}>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Smile className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground text-center px-8">
              Send a message to {otherName}
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
                <span className="text-[10px] font-bold text-muted-foreground px-3 py-1 rounded-full"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  {group.label}
                </span>
                <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
              </div>

              {group.messages.map((msg, idx) => {
                const isMine = msg.sender_id === currentUserId;
                const prevMsg = group.messages[idx - 1];
                const sameAsPrev = prevMsg?.sender_id === msg.sender_id;

                return (
                  <div key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-0.5" : "mt-3"}`}>
                    <div className="max-w-[78%]">
                      {/* Bubble */}
                      <div className="rounded-2xl px-3 py-2 relative"
                        style={{
                          background: isMine
                            ? "linear-gradient(145deg, hsl(220 80% 40%), hsl(220 100% 20%))"
                            : "hsl(var(--background))",
                          boxShadow: isMine
                            ? "4px 4px 12px rgba(13,22,38,0.3), -2px -2px 8px rgba(255,255,255,0.1)"
                            : "var(--shadow-raised)",
                          borderRadius: isMine
                            ? "1.25rem 1.25rem 0.4rem 1.25rem"
                            : "1.25rem 1.25rem 1.25rem 0.4rem",
                        }}>

                        {/* Image */}
                        {msg.message_type === "image" && msg.media_url && (
                          <a href={msg.media_url} target="_blank" rel="noreferrer">
                            <img src={msg.media_url} alt="image"
                              className="rounded-xl max-w-[220px] max-h-[220px] object-cover"
                              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
                          </a>
                        )}

                        {/* Voice */}
                        {msg.message_type === "voice" && msg.media_url && (
                          <VoicePlayer url={msg.media_url} duration={msg.media_duration} isMine={isMine} />
                        )}

                        {/* Text */}
                        {msg.message_type === "text" && msg.content && (
                          <p className="text-sm leading-relaxed"
                            style={{ color: isMine ? "#ffffff" : "hsl(var(--foreground))" }}>
                            {msg.content}
                          </p>
                        )}

                        {/* Caption under image */}
                        {msg.message_type === "image" && msg.content && (
                          <p className="text-xs mt-1" style={{ color: isMine ? "rgba(255,255,255,0.8)" : "hsl(var(--muted-foreground))" }}>
                            {msg.content}
                          </p>
                        )}

                        {/* Time + ticks */}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className="text-[9px] font-semibold"
                            style={{ color: isMine ? "rgba(255,255,255,0.6)" : "hsl(var(--muted-foreground))" }}>
                            {formatTime(msg.created_at)}
                          </span>
                          <Ticks isMine={isMine} isRead={msg.is_read} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing bubble */}
        {isTyping && (
          <div className="flex justify-start mt-3">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)",
                borderRadius: "1.25rem 1.25rem 1.25rem 0.4rem" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ background: "hsl(var(--muted-foreground))", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Image preview ──────────────────────────────────────────────────── */}
      {imagePreview && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="relative inline-block">
            <img src={URL.createObjectURL(imagePreview)} alt=""
              className="h-20 w-20 object-cover rounded-2xl"
              style={{ boxShadow: "var(--shadow-flat)" }} />
            <button onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "#ef4444" }}>
              <X className="w-3 h-3 text-white" />
            </button>
            <button onClick={() => sendImage(imagePreview)}
              className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-3 flex items-end gap-2"
        style={{ background: "hsl(var(--background))", paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>

        {recording ? (
          <RecordingBar seconds={recSeconds} onStop={stopRecording} onCancel={cancelRecording} />
        ) : (
          <>
            {/* Attachment */}
            <button onClick={() => fileRef.current?.click()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>

            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setImagePreview(f);
                e.target.value = "";
              }} />

            {/* Text input */}
            <div className="flex-1 flex items-end rounded-3xl px-4 py-2.5 gap-2"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", minHeight: 44 }}>
              <textarea
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                placeholder="Message…"
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground leading-relaxed"
                style={{ maxHeight: 100 }}
              />
            </div>

            {/* Send / Mic */}
            {text.trim() ? (
              <button onClick={sendText} disabled={sending}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
                style={{ background: "linear-gradient(145deg, hsl(220 80% 40%), hsl(220 100% 20%))",
                  boxShadow: "var(--shadow-navy)", opacity: sending ? 0.6 : 1 }}>
                <Send className="w-5 h-5 text-white" />
              </button>
            ) : (
              <button onPointerDown={startRecording}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <Mic className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </>
        )}

        {uploadingMedia && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold text-white"
            style={{ background: "rgba(13,22,38,0.75)", backdropFilter: "blur(4px)" }}>
            Uploading…
          </div>
        )}
      </div>

      {/* bounce keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;
