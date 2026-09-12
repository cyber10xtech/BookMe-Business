import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { useServices } from "../hooks/useServices";
import { useBookings } from "../hooks/useBookings";
import { useProfileCompletion } from "../hooks/useProfileCompletion";
import { useReviews } from "../hooks/useReviews";

vi.mock("../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../hooks/useProfile", () => ({ useProfile: vi.fn() }));
vi.mock("../hooks/useServices", () => ({ useServices: vi.fn() }));
vi.mock("../hooks/useBookings", () => ({ useBookings: vi.fn() }));
vi.mock("../hooks/useProfileCompletion", () => ({ useProfileCompletion: vi.fn() }));
vi.mock("../hooks/useReviews", () => ({ useReviews: vi.fn() }));

describe("Dashboard Rescheduling", () => {
  let rescheduleMock = vi.fn();
  const mockBooking = {
    id: "booking-1",
    customer_name: "John Doe",
    customer_avatar_url: null,
    service_name: "Haircut",
    status: "pending",
    booking_date: "2050-01-01",
    booking_time: "10:00",
    total_price: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: "user-1" } });
    (useProfile as any).mockReturnValue({ profile: { id: "prof-1", business_name: "Test Biz" } });
    (useServices as any).mockReturnValue({ services: [] });
    (useProfileCompletion as any).mockReturnValue({ percentage: 100, missingItems: [], completedItems: [], isShadowBanned: false });
    (useReviews as any).mockReturnValue({ reviews: [], loading: false, averageRating: 5, ratingBreakdown: {}, totalReviews: 0 });
    
    rescheduleMock = vi.fn().mockResolvedValue(undefined);
    (useBookings as any).mockReturnValue({
      bookings: [mockBooking],
      stats: { pendingCount: 1, todayCount: 0, revenue: 0 },
      updateBookingStatus: vi.fn(),
      rescheduleBooking: rescheduleMock,
    });
  });

  it("prevents double submission for rescheduling", async () => {
    // Delay the mock to allow double clicking
    let resolveReschedule: any;
    rescheduleMock.mockImplementation(() => new Promise(r => { resolveReschedule = r; }));

    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    
    // Open sheet
    fireEvent.click(screen.getByText("John Doe"));
    
    // Open reschedule
    fireEvent.click(screen.getByText("Reschedule Booking"));
    
    // Fill note
    fireEvent.change(screen.getByPlaceholderText(/Why are you rescheduling/i), { target: { value: "Conflicts" } });
    
    const confirmBtn = screen.getByText("Confirm");
    expect(confirmBtn).not.toBeDisabled();
    
    // Click once
    fireEvent.click(confirmBtn);
    
    // Should immediately disable and change text
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn.textContent).toBe("Rescheduling...");
    
    // Try clicking again
    fireEvent.click(confirmBtn);
    
    expect(rescheduleMock).toHaveBeenCalledTimes(1);
    expect(rescheduleMock).toHaveBeenCalledWith("booking-1", "2050-01-01", "10:00", "Conflicts");
    
    // Resolve
    resolveReschedule();
    await waitFor(() => {
      // the modal is closed and state is reset
      expect(screen.queryByText("Rescheduling...")).toBeNull();
    });
  });
});
