/**
 * ClientsPage.tsx  — business app (neu_output)
 *
 * Changes vs original:
 * 1. "Message" button on each client's sheet + card shortcut opens ChatWindow.
 * 2. Conversations are created on-demand using the most recent completed booking.
 * 3. Unread badge shows on clients who have sent messages.
 */

import { useState, useEffect } from "react";
import {
  Search, Users, Phone, Mail, Calendar, ChevronRight,
  X, TrendingUp, MessageSquare,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/components/ChatWindow";

interface Client {
  id: string; name: string; email?: string|null; phone?: string|null;
  total_bookings?: number; last_booking_date?: string|null;
  business_user_id: string; created_at: string; updated_at: string;
  totalSpend?: number;
  customer_profile_id?: string;
  customer_user_id?: string;
  latest_completed_booking_id?: string;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#22c55e,#15803d)",
  "linear-gradient(135deg,#f59e0b,#b45309)",
  "linear-gradient(135deg,#ec4899,#be185d)",
  "linear-gradient(135deg,#14b8a6,#0f766e)",
];
const gradientFor = (name: string) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

// ── Client detail sheet ───────────────────────────────────────────────────────
const ClientSheet = ({
  client, myProfileId, myUserId, onClose, onChat,
}: {
  client: Client;
  myProfileId: string;
  myUserId: string;
  onClose: () => void;
  onChat: (client: Client) => void;
}) => {
  const initials = client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "85vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold text-white"
              style={{ background: gradientFor(client.name), boxShadow: "var(--shadow-raised)" }}>
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{client.name}</h2>
              <p className="text-xs text-muted-foreground">
                {client.total_bookings || 0} booking{(client.total_bookings || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl p-4 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center mx-auto mb-2"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{client.total_bookings || 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total Bookings</p>
            </div>
            <div className="rounded-3xl p-4 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center mx-auto mb-2"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "#22c55e" }} />
              </div>
              <p className="text-2xl font-extrabold text-foreground">
                {client.totalSpend ? `₦${client.totalSpend.toLocaleString()}` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total Spend</p>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-3xl p-4 space-y-3"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Contact</p>
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-3 tap-scale">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                  <p className="text-sm text-foreground truncate">{client.email}</p>
                </div>
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-3 tap-scale">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Phone</p>
                  <p className="text-sm font-bold text-foreground">{client.phone}</p>
                </div>
                <span className="text-xs font-bold text-primary px-2.5 py-1.5 rounded-xl tap-scale"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  Call
                </span>
              </a>
            )}
            {!client.email && !client.phone && (
              <p className="text-sm text-muted-foreground text-center py-2">No contact info</p>
            )}
          </div>

          {client.last_booking_date && (
            <div className="rounded-3xl px-4 py-3 flex items-center gap-3"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Last Booking</p>
                <p className="text-sm font-semibold text-foreground">
                  {new Date(client.last_booking_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pt-3 space-y-2"
          style={{ borderTop: "1px solid hsl(var(--border))", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)", background: "hsl(var(--background))" }}>
          {/* Message button — only for clients with completed bookings */}
          {client.latest_completed_booking_id && client.customer_user_id && (
            <button onClick={() => { onClose(); onChat(client); }}
              className="w-full h-[52px] rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
              style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
              <MessageSquare className="w-5 h-5" /> Message {client.name.split(" ")[0]}
            </button>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`}
              className="w-full h-[52px] rounded-3xl font-extrabold text-sm flex items-center justify-center gap-2 tap-scale"
              style={{ display: "flex", background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
              <Phone className="w-5 h-5" /> Call {client.name.split(" ")[0]}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Client card ───────────────────────────────────────────────────────────────
const ClientCard = ({
  client, unreadCount, onTap, onChat,
}: {
  client: Client;
  unreadCount: number;
  onTap: () => void;
  onChat: () => void;
}) => {
  const initials = client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="w-full rounded-3xl p-4 flex items-center gap-3 animate-fade-in"
      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
      <button onClick={onTap} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
            style={{ background: gradientFor(client.name), boxShadow: "var(--shadow-flat)" }}>
            {initials}
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
              style={{ background: "#22c55e" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{client.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {client.email || client.phone || "No contact info"}
          </p>
          {client.last_booking_date && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last: {new Date(client.last_booking_date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}>
            {client.total_bookings || 0} {(client.total_bookings || 0) === 1 ? "booking" : "bookings"}
          </span>
        </div>
      </button>

      {/* Quick chat button */}
      {client.latest_completed_booking_id && client.customer_user_id && (
        <button onClick={onChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 tap-scale"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <MessageSquare className="w-4 h-4 text-primary" />
        </button>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const ClientsPage = () => {
  const { user } = useAuth();
  const [clients,    setClients]    = useState<Client[]>([]);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Client|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  // Chat state
  const [chatClient,  setChatClient]  = useState<Client | null>(null);
  const [chatConvId,  setChatConvId]  = useState<string | null>(null);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [unreadMap,   setUnreadMap]   = useState<Record<string, number>>({});

  // Load my profile id
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setMyProfileId(data.id); });
  }, [user]);

  // Load clients
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Derive from bookings — fetch more fields for chat
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!prof) { setLoading(false); return; }

      const { data: bks } = await supabase
        .from("bookings")
        .select("customer_name,customer_email,customer_phone,customer_id,total_price,booking_date,status,id")
        .eq("provider_id", prof.id);
      if (!bks) { setLoading(false); return; }

      // Also fetch customer user_ids via profiles
      const customerProfileIds = [...new Set(bks.map(b => b.customer_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (customerProfileIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id,user_id").in("id", customerProfileIds);
        if (profs) profs.forEach((p: any) => { profileMap[p.id] = p.user_id; });
      }

      const seen = new Set<string>();
      const derived: Client[] = bks
        .filter(b => b.customer_name && !seen.has(b.customer_id || b.customer_name) && seen.add(b.customer_id || b.customer_name))
        .map(b => {
          const same = bks.filter(x => (b.customer_id ? x.customer_id === b.customer_id : x.customer_name === b.customer_name));
          const last = same.map(x => x.booking_date).sort().reverse()[0] || null;
          const totalSpend = same.reduce((s, x) => s + (x.total_price || 0), 0);
          const latestCompleted = same.filter(x => x.status === "completed").sort((a, b) => b.booking_date?.localeCompare(a.booking_date || "") || 0)[0];
          const customerUserId = b.customer_id ? profileMap[b.customer_id] : undefined;
          return {
            id: b.customer_id || b.customer_name,
            business_user_id: user.id,
            name: b.customer_name || "Unknown",
            email: b.customer_email || null,
            phone: b.customer_phone || null,
            total_bookings: same.length,
            last_booking_date: last,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            totalSpend,
            customer_profile_id: b.customer_id || undefined,
            customer_user_id: customerUserId,
            latest_completed_booking_id: latestCompleted?.id,
          } as Client;
        });
      setClients(derived);
      setLoading(false);

      // Load unread counts for all conversations
      if (user.id) {
        const { data: convs } = await supabase
          .from("chat_conversations")
          .select("id, customer_id")
          .eq("provider_user_id", user.id);
        if (convs && convs.length > 0) {
          const convIds = convs.map((c: any) => c.id);
          const { data: unread } = await supabase
            .from("chat_messages")
            .select("conversation_id")
            .in("conversation_id", convIds)
            .eq("is_read", false)
            .neq("sender_id", user.id);
          if (unread) {
            const map: Record<string, number> = {};
            unread.forEach((m: any) => {
              const conv = convs.find((c: any) => c.id === m.conversation_id);
              if (conv) {
                const customerId = conv.customer_id;
                map[customerId] = (map[customerId] || 0) + 1;
              }
            });
            setUnreadMap(map);
          }
        }
      }
    };
    load();
  }, [user]);

  // Open chat with a client — lazy create conversation
  const handleChat = async (client: Client) => {
    if (!client.latest_completed_booking_id || !client.customer_user_id || !myProfileId || !user) return;
    setChatClient(client);

    // Check for existing conversation
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("booking_id", client.latest_completed_booking_id)
      .maybeSingle();

    if (existing) {
      setChatConvId(existing.id);
      setChatOpen(true);
      return;
    }

    // Create new conversation
    const { data, error } = await supabase.from("chat_conversations").insert({
      booking_id:        client.latest_completed_booking_id,
      provider_id:       myProfileId,
      customer_id:       client.customer_profile_id,
      provider_user_id:  user.id,
      customer_user_id:  client.customer_user_id,
    }).select("id").single();

    if (data) {
      setChatConvId(data.id);
      setChatOpen(true);
    } else if (error?.code === "23505") {
      const { data: retry } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("booking_id", client.latest_completed_booking_id)
        .maybeSingle();
      if (retry) { setChatConvId(retry.id); setChatOpen(true); }
    }
  };

  const filtered = clients
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0));

  return (
    <AppLayout>
      {selected && myProfileId && user && (
        <ClientSheet
          client={selected}
          myProfileId={myProfileId}
          myUserId={user.id}
          onClose={() => setSelected(null)}
          onChat={handleChat}
        />
      )}

      {chatOpen && chatConvId && chatClient && user && (
        <ChatWindow
          conversationId={chatConvId}
          currentUserId={user.id}
          currentRole="provider"
          otherName={chatClient.name}
          onClose={() => {
            setChatOpen(false);
            setChatClient(null);
            setChatConvId(null);
            // Clear unread for this client
            if (chatClient.customer_profile_id) {
              setUnreadMap(prev => ({ ...prev, [chatClient.customer_profile_id!]: 0 }));
            }
          }}
        />
      )}

      <div className="px-5 pt-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-foreground">Clients</h1>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <Users className="w-5 h-5 text-primary" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {clients.length} total client{clients.length !== 1 ? "s" : ""}
        </p>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-2xl"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", border: "none" }}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-3xl skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {search ? "No clients found" : "No clients yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Try a different search" : "Clients appear here after their first booking."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                unreadCount={c.customer_profile_id ? (unreadMap[c.customer_profile_id] || 0) : 0}
                onTap={() => setSelected(c)}
                onChat={() => handleChat(c)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ClientsPage;
