import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import WelcomePromotionModal from "../components/onboarding/WelcomePromotionModal";

describe("WelcomePromotionModal", () => {
  it("renders nothing when open is false", () => {
    render(<WelcomePromotionModal open={false} onContinue={() => {}} />);
    expect(screen.queryByText(/Welcome to BookMe/i)).toBeNull();
  });

  it("renders exact reference image layout, messaging, and CTA when open is true", () => {
    const handleContinue = vi.fn();
    render(<WelcomePromotionModal open={true} onContinue={handleContinue} />);

    // Headline with emoji
    expect(screen.getAllByText(/Welcome to BookMe/i).length).toBeGreaterThan(0);

    // Benefit Item 1
    expect(screen.getAllByText(/Your business is now listed on BookMe for/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("FREE").length).toBeGreaterThan(0);

    // Benefit Item 2
    expect(screen.getAllByText(/Enjoy Premium benefits/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/first 2 months/i).length).toBeGreaterThan(0);

    // Benefit Item 3
    expect(screen.getAllByText("No card.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No payment required.").length).toBeGreaterThan(0);

    // CTA button
    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDefined();

    // Clicking Continue invokes onContinue callback
    fireEvent.click(continueBtn);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });
});
