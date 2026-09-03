import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import PermissionsModal from "@/components/PermissionsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { syncStatusBar } from "@/lib/statusBar";
import React, { Suspense, lazy } from "react";
import logo from "@/assets/logo.jpg";
import { UpdateDialog } from "@/components/UpdateDialog";
import DeactivatedScreen from "@/components/DeactivatedScreen";
import { supabase } from "@/lib/supabase";

const SignIn = lazy(() => import("./pages/SignIn"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const MorePage = lazy(() => import("./pages/MorePage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ChatsPage = lazy(() => import("./pages/ChatsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();


const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <img src={logo} alt="Logo" className="w-32 h-32" />
    </div>
  );
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

// Smart root redirect — waits for auth to resolve before deciding where to send the user.
// Prevents Capacitor cold-start (which always loads "/") from bouncing authenticated users to /signin.
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <img src={logo} alt="Logo" className="w-32 h-32" />
    </div>
  );
  return <Navigate to={user ? "/dashboard" : "/signin"} replace />;
};

const AppInner = () => {
  const { user } = useAuth();
  const [isDeactivated, setIsDeactivated] = React.useState(false);

  // Configure status bar once on mount
  useEffect(() => { syncStatusBar(false); }, []);

  // Check if profile is active & subscribe to realtime profile updates for is_active
  useEffect(() => {
    if (!user) {
      setIsDeactivated(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_active")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setIsDeactivated(data?.is_active === false);
      });

    const channel = supabase
      .channel(`business-profile-active-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.is_active === "boolean") {
            setIsDeactivated(payload.new.is_active === false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (user && isDeactivated) {
    return <DeactivatedScreen onSignOut={() => setIsDeactivated(false)} />;
  }

  return (
  <>
    <UpdateDialog />
    <PermissionsModal />
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src={logo} alt="Logo" className="w-32 h-32" />
      </div>
    }>
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/calendar" element={<AuthGuard><CalendarPage /></AuthGuard>} />
      <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
      <Route path="/more" element={<AuthGuard><MorePage /></AuthGuard>} />
      <Route path="/clients" element={<AuthGuard><ClientsPage /></AuthGuard>} />
      <Route path="/chats" element={<AuthGuard><ChatsPage /></AuthGuard>} />
      <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
      <Route path="/edit-profile" element={<AuthGuard><EditProfilePage /></AuthGuard>} />
      <Route path="/messages" element={<Navigate to="/chats" replace />} />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
