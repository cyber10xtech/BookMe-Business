/**
 * ChatsPage.tsx — business app (provider role)
 *
 * Two-tab inbox:
 *   "Messages"  — existing conversations (sorted by last message)
 *   "Clients"   — customers with ≥1 completed booking; tap to start a chat
 *
 * Starting a chat creates (or reuses) a chat_conversations row keyed on
 * the most recent completed booking_id, exactly as ClientsPage does.
 */

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Search, Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ChatableClient {
  customer_profile_id: string;   // profiles.id
  customer_user_id: string;      // auth user id
  name: string;
  avatar_url: string | null;
  latest_completed_booking_id: string;
  // already has a conversation?
  existing_conv_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const initials    = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

// ─── Main component ───────────────────────────────────────────────────────────

const ChatsPage = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab]               = useState<"messages" | "clients">("messages");
  const [conversations, setConvs]   = useState<Conversation[]>([]);
  const [chatableClients, setChatable] = useState<ChatableClient[]>([]);
  const [loading,       setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search,        setSearch]  = useState("");
  const [active,        setActive]  = useState<{ convId: string; name: string; avatar: string | null } | null>(null);
  const [starting,      setStarting] = useState<string | null>(null); // profile id being opened

  // ── Load existing conversations ──────────────────────────────────────────

  const loadConvs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("provider_user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!convs?.length) { setConvs([]); setLoading(false); return; }

    const { data: profs } = await supabase.from("profiles")
      .select("id,full_name,business_name,avatar_url")
      .in("id", convs.map((c: any) => c.customer_id));
    const pm: Record<string, any> = {};
    (profs || []).forEach((p: any) => { pm[p.id] = p; });

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

  // ── Load clients who have ≥1 completed booking ───────────────────────────

  const loadChatableClients = useCallback(async () => {
    if (!user) return;
    setClientsLoading(true);

    // 1. Get my profile id
    const { data: myProf } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    if (!myProf) { setClientsLoading(false); return; }

    // 2. Fetch all completed bookings for this provider
    const { data: bks } = await supabase
      .from("bookings")
      .select("id, customer_id, booking_date")
      .eq("provider_id", myProf.id)
      .eq("status", "completed")
      .order("booking_date", { ascending: false });

    if (!bks?.length) { setChatable([]); setClientsLoading(false); return; }

    // 3. Collapse to one row per customer (most recent completed booking)
    const byCustomer = new Map<string, { booking_id: string }>();
    for (const b of bks) {
      if (b.customer_id && !byCustomer.has(b.customer_id)) {
        byCustomer.set(b.customer_id, { booking_id: b.id });
      }
    }

    const customerProfileIds = [...byCustomer.keys()];

    // 4. Resolve customer profile → auth user_id + display name + avatar
    const { data: custProfs } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, business_name, avatar_url")
      .in("id", customerProfileIds);
    const profMap: Record<string, any> = {};
    (custProfs || []).forEach((p: any) => { profMap[p.id] = p; });

    // 5. Fetch existing conversations so we can show "continue" vs "start"
    const { data: existingConvs } = await supabase
      .from("chat_conversations")
      .select("id, customer_id")
      .eq("provider_user_id", user.id);
    const convByCustomer: Record<string, string> = {};
    (existingConvs || []).forEach((c: any) => { convByCustomer[c.customer_id] = c.id; });

    const clients: ChatableClient[] = [];
    for (const [profileId, { booking_id }] of byCustomer.entries()) {
      const prof = profMap[profileId];
      if (!prof?.user_id) continue; // can't chat without auth user id
      clients.push({
        customer_profile_id:          profileId,
        customer_user_id:             prof.user_id,
        name:                         prof.full_name || prof.business_name || "Client",
        avatar_url:                   prof.avatar_url || null,
        latest_completed_booking_id:  booking_id,
        existing_conv_id:             convByCustomer[profileId] || null,
      });
    }

    // Sort: clients with existing conversations last (they show in Messages tab already)
    clients.sort((a, b) => {
      if (a.existing_conv_id && !b.existing_conv_id) return 1;
      if (!a.existing_conv_id && b.existing_conv_id) return -1;
      return a.name.localeCompare(b.name);
    });

    setChatable(clients);
    setClientsLoading(false);
  }, [user]);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { loadChatableClients(); }, [loadChatableClients]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`msgs-biz-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, loadConvs)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, loadConvs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadConvs]);

  // ── Start / open a chat with a client ─────────────────────────────────────

  const openChat = async (client: ChatableClient) => {
    setStarting(client.customer_profile_id);

    // Get my profile id (needed for insert)
    const { data: myProf } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
    if (!myProf) { setStarting(null); return; }

    let convId = client.existing_conv_id;

    if (!convId) {
      // Check by booking_id first (most precise)
      const { data: byBooking } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("booking_id", client.latest_completed_booking_id)
        .maybeSingle();

      if (byBooking) {
        convId = byBooking.id;
      } else {
        // Create
        const { data: created, error } = await supabase.from("chat_conversations").insert({
          booking_id:       client.latest_completed_booking_id,
          provider_id:      myProf.id,
          customer_id:      client.customer_profile_id,
          provider_user_id: user!.id,
          customer_user_id: client.customer_user_id,
        }).select("id").single();

        if (created) {
          convId = created.id;
        } else if (error?.code === "23505") {
          // Race condition: another insert won
          const { data: retry } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("booking_id", client.latest_completed_booking_id)
            .maybeSingle();
          convId = retry?.id || null;
        }
      }
    }

    setStarting(null);
    if (convId) {
      setActive({ convId, name: client.name, avatar: client.avatar_url });
      // Also refresh so Messages tab picks up the new conversation
      loadConvs();
      loadChatableClients();
    }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredConvs    = conversations.filter(c => c.other_name.toLowerCase().includes(q));
  const filteredClients  = chatableClients.filter(c => c.name.toLowerCase().includes(q));
  const totalUnread      = conversations.reduce((s, c) => s + c.unread_count, 0);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* Chat window overlay */}
      {active && user && (
        <ChatWindow
          conversationId={active.convId}
          currentUserId={user.id}
          currentRole="provider"
          otherName={active.name}
          otherAvatar={active.avatar}
          onClose={() => { setActive(null); loadConvs(); loadChatableClients(); }}
          onBackToDashboard={() => { setActive(null); navigate("/dashboard"); }}
        />
      )}

      <div className="px-5 pt-5 pb-8">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
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

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4 p-1 rounded-2xl"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
          {(["messages", "clients"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all tap-scale"
              style={tab === t ? {
                background: "hsl(var(--background))",
                boxShadow: "var(--shadow-raised)",
                color: "hsl(var(--primary))",
              } : { color: "hsl(var(--muted-foreground))" }}>
              {t === "messages"
                ? <><MessageSquare className="w-3.5 h-3.5" /> Chats {totalUnread > 0 && tab !== "messages" && <span className="w-4 h-4 rounded-full bg-destructive text-white text-[8px] font-extrabold flex items-center justify-center">{totalUnread > 9 ? "9+" : totalUnread}</span>}</>
                : <><Users className="w-3.5 h-3.5" /> Clients</>
              }
            </button>
          ))}
        </div>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === "messages" ? "Search chats…" : "Search clients…"}
            className="w-full h-12 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-2xl"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", border: "none" }} />
        </div>

        {/* ── Messages tab ─────────────────────────────────────────────── */}
        {tab === "messages" && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">{search ? "No results" : "No messages yet"}</p>
                <p className="text-xs text-muted-foreground mt-1 px-8">
                  {search ? "Try a different name" : "Switch to the Clients tab to start a chat."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConvs.map(conv => {
                  const ini = initials(conv.other_name);
                  const hasUnread = conv.unread_count > 0;
                  return (
                    <button key={conv.id}
                      onClick={() => setActive({ convId: conv.id, name: conv.other_name, avatar: conv.other_avatar })}
                      className="w-full text-left rounded-3xl p-4 flex items-center gap-3 tap-scale-sm"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                      <div className="relative flex-shrink-0">
                        {conv.other_avatar
                          ? <img src={conv.other_avatar} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: "var(--shadow-flat)" }} />
                          : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                              style={{ background: gradientFor(conv.other_name), boxShadow: "var(--shadow-flat)" }}>{ini}</div>
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
          </>
        )}

        {/* ── Clients tab ──────────────────────────────────────────────── */}
        {tab === "clients" && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {chatableClients.length} client{chatableClients.length !== 1 ? "s" : ""} with completed bookings
            </p>

            {clientsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}</div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">{search ? "No clients found" : "No eligible clients yet"}</p>
                <p className="text-xs text-muted-foreground mt-1 px-8">
                  {search ? "Try a different name" : "Clients appear here once you complete a booking with them."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map(client => {
                  const ini = initials(client.name);
                  const isStarting = starting === client.customer_profile_id;
                  const hasConv = !!client.existing_conv_id;
                  return (
                    <button key={client.customer_profile_id}
                      onClick={() => !isStarting && openChat(client)}
                      disabled={isStarting}
                      className="w-full text-left rounded-3xl p-4 flex items-center gap-3 tap-scale-sm"
                      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", opacity: isStarting ? 0.7 : 1 }}>

                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {client.avatar_url
                          ? <img src={client.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: "var(--shadow-flat)" }} />
                          : <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                              style={{ background: gradientFor(client.name), boxShadow: "var(--shadow-flat)" }}>{ini}</div>
                        }
                      </div>

                      {/* Name + status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasConv ? "Continue conversation" : "Tap to start chatting"}
                        </p>
                      </div>

                      {/* Action pill */}
                      <div className="flex-shrink-0">
                        {isStarting ? (
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                            {hasConv
                              ? <MessageSquare className="w-4 h-4 text-primary" />
                              : <UserPlus className="w-4 h-4 text-primary" />
                            }
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ChatsPage;
