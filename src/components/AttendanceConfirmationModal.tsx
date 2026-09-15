import React, { useState } from "react";
import { format } from "date-fns";
import { Booking } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, User, Scissors, CreditCard, CheckCircle, XCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceConfirmationModalProps {
  booking: Booking;
  onSuccess: () => void;
  onDismiss: () => void;
}

export const AttendanceConfirmationModal = ({ booking, onSuccess, onDismiss }: AttendanceConfirmationModalProps) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (outcome: "attended" | "no_show") => {
    if (submitting) return; // Prevent duplicate taps
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("confirm_booking_attendance", {
        p_booking_id: booking.id,
        p_outcome: outcome
      });

      if (error) {
        throw error;
      }

      toast.success(
        outcome === "attended"
          ? "Attendance confirmed ✅"
          : "No-show recorded"
      );
      onSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to record outcome. Please try again.");
      // Keep the modal open on failure — do NOT call onSuccess
    } finally {
      setSubmitting(false);
    }
  };

  const bookingDate = new Date(booking.booking_date);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
              Awaiting Outcome
            </span>
            <h2 className="text-xl font-bold text-gray-900">Confirm Attendance</h2>
            <p className="text-sm text-gray-500 mt-1">
              Please verify if the customer attended this booking.
            </p>
          </div>

          <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <User className="w-4 h-4 text-primary" />
              <span className="font-semibold">{booking.customer_name || "Customer"}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Scissors className="w-4 h-4 text-primary" />
              <span>{booking.service_name || "Service"}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(bookingDate, "MMMM d, yyyy")}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-primary" />
              <span>{booking.booking_time_text || booking.booking_time.substring(0,5)}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-bold">₦{booking.total_price.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
              onClick={() => handleConfirm("attended")}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Attended
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold flex items-center justify-center gap-2"
              onClick={() => handleConfirm("no_show")}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
              No-show
            </Button>

            <Button
              variant="ghost"
              className="w-full h-10 text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-2"
              onClick={onDismiss}
              disabled={submitting}
            >
              <Timer className="w-4 h-4" />
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4 px-2">
            Accuracy notice: Your selection affects your profile completion rate and the customer's reliability score.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
