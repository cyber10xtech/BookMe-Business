import React, { useState } from "react";
import { format } from "date-fns";
import { Booking } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, User, Scissors, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceConfirmationModalProps {
  booking: Booking;
  onSuccess: () => void;
}

export const AttendanceConfirmationModal = ({ booking, onSuccess }: AttendanceConfirmationModalProps) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (outcome: "attended" | "no_show") => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("confirm_booking_attendance", {
        p_booking_id: booking.id,
        p_outcome: outcome
      });

      if (error) {
        throw error;
      }

      toast.success("Attendance outcome recorded");
      onSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to record outcome. Please try again.");
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
              Confirm customer attended
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold flex items-center justify-center gap-2"
              onClick={() => handleConfirm("no_show")}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
              Customer did not come
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

