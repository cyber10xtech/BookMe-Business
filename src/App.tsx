import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { setupDeepLinks } from "@/services/native";
import PermissionsModal from "@/components/PermissionsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import React, { Suspense, lazy } from "react";

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

const DeepLinkHandler = () => {
  const navigate = useNavigate();
  useEffect(() => { setupDeepLinks(navigate); }, [navigate]);
  return null;
};



const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <img src="/src/assets/logo.jpg" alt="Logo" className="w-32 h-32" />
    </div>
  );
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

const AppInner = () => (
  <>
    <DeepLinkHandler />
    <PermissionsModal />
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img src="/src/assets/logo.jpg" alt="Logo" className="w-32 h-32" />
      </div>
    }>
      <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
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
