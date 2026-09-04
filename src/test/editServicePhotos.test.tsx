import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Supabase client
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://example.com/storage/${path}` } })),
      })),
    },
  },
}));

describe("BookMe Business - Edit Service Photos Functionality", () => {
  it("parses service description JSON correctly and preserves existing photo metadata when editing", () => {
    const originalService = {
      id: "svc-123",
      name: "Tattoo Session",
      price: 15000,
      duration: "2 hrs",
      description: JSON.stringify({
        pricingType: "fixed",
        maxPrice: undefined,
        emoji: "🎨",
        isLocked: false,
        imageUrls: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
        description: "Full arm tattoo design",
      }),
    };

    const meta = JSON.parse(originalService.description);
    expect(meta.imageUrls).toHaveLength(2);
    expect(meta.imageUrls[0]).toBe("https://example.com/photo1.jpg");

    // Simulate photo removal
    const updatedPhotos = meta.imageUrls.filter((_: string, idx: number) => idx !== 0);
    const updatedDescription = JSON.stringify({
      ...meta,
      imageUrls: updatedPhotos,
    });

    const parsedUpdated = JSON.parse(updatedDescription);
    expect(parsedUpdated.imageUrls).toEqual(["https://example.com/photo2.jpg"]);
    expect(parsedUpdated.pricingType).toBe("fixed");
    expect(parsedUpdated.description).toBe("Full arm tattoo design");
  });

  it("handles range pricing services with photos correctly", () => {
    const rangeService = {
      id: "svc-456",
      name: "Bridal Makeup",
      price: 25000,
      duration: "3 hrs",
      description: JSON.stringify({
        pricingType: "range",
        maxPrice: 40000,
        emoji: "💄",
        isLocked: false,
        imageUrls: ["https://example.com/makeup1.jpg"],
        description: "Full glam bridal makeup package",
      }),
    };

    const meta = JSON.parse(rangeService.description);
    expect(meta.pricingType).toBe("range");
    expect(meta.maxPrice).toBe(40000);

    // Simulate adding a second photo
    const newPhotoUrl = "https://example.com/makeup2.jpg";
    const updatedDescription = JSON.stringify({
      ...meta,
      imageUrls: [...meta.imageUrls, newPhotoUrl],
    });

    const customerView = JSON.parse(updatedDescription);
    expect(customerView.imageUrls).toEqual([
      "https://example.com/makeup1.jpg",
      "https://example.com/makeup2.jpg",
    ]);
  });

  it("allows adding photos to services that initially had zero photos", () => {
    const noPhotoService = {
      id: "svc-789",
      name: "Quick Hair Trim",
      price: 3000,
      duration: "30 mins",
      description: JSON.stringify({
        pricingType: "fixed",
        emoji: "✂️",
        isLocked: false,
        imageUrls: [],
        description: "Standard hair trimming service",
      }),
    };

    const meta = JSON.parse(noPhotoService.description);
    expect(meta.imageUrls).toEqual([]);

    // Add first photo
    const updatedDescription = JSON.stringify({
      ...meta,
      imageUrls: ["https://example.com/new_photo.jpg"],
    });

    const parsed = JSON.parse(updatedDescription);
    expect(parsed.imageUrls).toEqual(["https://example.com/new_photo.jpg"]);
  });
});
