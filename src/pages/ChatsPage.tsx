/**
 * ChatsPage.tsx — business app (provider role)
 * Conversation inbox showing all client chats, sorted by last message.
 * WhatsApp-style: last message preview, unread counts, realtime updates.
 */

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";

interface Conversation {
  id: string;
  customer_id: string;
  provider_user_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  other_name: string;
  other_avatar: string | null;
  unread_count: number;
}

const fmtTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

const GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#1d4ed8)", "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#22c55e,#15803d)", "linear-gradient(135deg,#f59e0b,#b45309)",
  "linear-gradient(135deg,#ec4899,#be185d)", "linear-gradient(135deg,#14b8a6,#0f766e)",
];
const gradientFor = (name: string) => GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length];

const ChatsPage = () => {
  const { user } = useAuth();
  const [conversations, setConvs]   = useState<Conversation[]>([]);
  const [loading,       setLoading] = useState(true);
  const [search,        setSearch]  = useState("");
  const [active,        setActive]  = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("provider_user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!convs?.length) { setConvs([]); setLoading(false); return; }

    // Customer profiles
    const { data: profs } = await supabase.from("profiles")
      .select("id,full_name,business_name,avatar_url")
      .in("id", convs.map((c: any) => c.customer_id));
    const pm: Record<string, any> = {};
    (profs || []).forEach((p: any) => { pm[p.id] = p; });

    // Unread counts (messages from customer that provider hasn't read)
    const { data: unread } = await supabase.from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", convs.map((c: any) => c.id))
      .eq("is_read", false).neq("sender_id", user.id);
    const um: Record<string, number> = {};
    (unread || []).forEach((m: any) => { um[m.conversation_id] = (um[m.conversation_id] || 0) + 1; });

    setConvs(convs.map((c: any) => {
      const p = pm[c.customer_id];
      return { ...c, other_name: p?.full_name || p?.business_name || "Client", other_avatar: p?.avatar_url || null, unread_count: um[c.id] || 0 };
    }));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`msgs-biz-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const filtered = conversations.filter(c => c.other_name.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <AppLayout>
      {active && user && (
        <ChatWindow
          conversationId={active.id}
          currentUserId={user.id}
          currentRole="provider"
          otherName={active.other_name}
          otherAvatar={active.other_avatar}
          onClose={() => { setActive(null); load(); }}
        />
      )}

      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-foreground">Messages</h1>
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                style={{ background: "#22c55e" }}>
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full h-12 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-2xl"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", border: "none" }} />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">{search ? "No results" : "No messages yet"}</p>
            <p className="text-xs text-muted-foreground mt-1 px-8">
              {search ? "Try a different name" : "Chats appear here after a booking is completed."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(conv => {
              const initials = conv.other_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
              const hasUnread = conv.unread_count > 0;
              return (
                <button key={conv.id} onClick={() => setActive(conv)}
                  className="w-full text-left rounded-3xl p-4 flex items-center gap-3 tap-scale-sm"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                  <div className="relative flex-shrink-0">
                    {conv.other_avatar
                      ? <img src={conv.other_avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: "var(--shadow-flat)" }} />
                      : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                          style={{ background: gradientFor(conv.other_name), boxShadow: "var(--shadow-flat)" }}>{initials}</div>
                    }
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                        style={{ background: "#22c55e" }}>
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${hasUnread ? "font-extrabold" : "font-bold"} text-foreground`}>{conv.other_name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtTime(conv.last_message_at)}</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${hasUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {conv.last_message_preview || "Start a conversation…"}
                    </p>
                  </div>
                  {hasUnread && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ChatsPage;
