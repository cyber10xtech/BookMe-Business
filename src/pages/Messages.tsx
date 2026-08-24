import { MessageSquare } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const Messages = () => {
  return (
    <AppLayout>
      <div className="px-5 pt-5">
        <h1 className="text-2xl font-bold text-foreground mb-5">Messages</h1>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No messages yet</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Chat channels are enabled once a customer books one of your services.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
