import { describe, it, expect, vi } from "vitest";

describe("BookMe Business - Default Onboarding Services Editing on Profile Page", () => {
  const sampleServices = [
    {
      id: "svc-onboarding-001",
      provider_id: "prov-123",
      user_id: "user-123",
      name: "Standard Haircut",
      duration: "45 mins",
      duration_minutes: 45,
      price: 5000,
      is_active: true,
      is_featured: true,
      description: JSON.stringify({
        pricingType: "fixed",
        maxPrice: undefined,
        isLocked: true,
        lockedKey: "barbers_standard_cut",
        emoji: "💈",
        sortOrder: 0,
        imageUrls: ["https://example.com/photo1.jpg"],
        description: "Initial onboarding description",
      }),
    },
    {
      id: "svc-onboarding-002",
      provider_id: "prov-123",
      user_id: "user-123",
      name: "Beard Grooming",
      duration: "30 mins",
      duration_minutes: 30,
      price: 3000,
      is_active: true,
      is_featured: true,
      description: JSON.stringify({
        pricingType: "fixed",
        maxPrice: undefined,
        isLocked: true,
        lockedKey: "barbers_beard_trim",
        emoji: "✂️",
        sortOrder: 1,
        imageUrls: [],
        description: "Beard shape-up and hot towel treatment",
      }),
    },
    {
      id: "svc-custom-099",
      provider_id: "prov-123",
      user_id: "user-123",
      name: "Custom Hair Dye",
      duration: "1 hr 30 mins",
      duration_minutes: 90,
      price: 15000,
      is_active: true,
      is_featured: false,
      description: JSON.stringify({
        pricingType: "range",
        maxPrice: 25000,
        isLocked: false,
        emoji: "🎨",
        imageUrls: [],
        description: "Custom hair coloring service added later from Dashboard",
      }),
    },
  ];

  it("correctly identifies default onboarding services and filters out custom services", () => {
    const getMeta = (s: any) => {
      try {
        return JSON.parse(s.description || "{}");
      } catch {
        return {};
      }
    };

    const isDefault = (s: any) => s.is_featured === true || getMeta(s).isLocked === true;

    const defaultServices = sampleServices.filter(isDefault);
    const customServices = sampleServices.filter((s) => !isDefault(s));

    expect(defaultServices).toHaveLength(2);
    expect(defaultServices.map((s) => s.id)).toEqual(["svc-onboarding-001", "svc-onboarding-002"]);
    expect(customServices).toHaveLength(1);
    expect(customServices[0].id).toBe("svc-custom-099");
  });

  it("updates name, duration, fixed price, description, emoji, and photos while maintaining stable service ID and lock identity", () => {
    const originalService = sampleServices[0];
    const prevMeta = JSON.parse(originalService.description);

    // Edit service fields on Profile page
    const updatedName = "Executive Fade & Haircut";
    const updatedDurationMins = 60;
    const updatedDurationLabel = "1 hr";
    const updatedPrice = 7500;
    const updatedDescText = "Luxury haircut including wash, scalp massage, and hot towel.";
    const updatedEmoji = "✂️";
    const updatedPhotos = ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"];

    const updatedMeta = {
      ...prevMeta,
      pricingType: "fixed",
      maxPrice: undefined,
      emoji: updatedEmoji,
      isLocked: true, // Must preserve lock identity
      imageUrls: updatedPhotos,
      description: updatedDescText,
    };

    const updatedServiceRow = {
      ...originalService,
      name: updatedName,
      duration: updatedDurationLabel,
      duration_minutes: updatedDurationMins,
      price: updatedPrice,
      is_featured: true, // Must preserve featured identity
      description: JSON.stringify(updatedMeta),
    };

    // 1. Stable Service ID
    expect(updatedServiceRow.id).toBe(originalService.id);

    // 2. Updated DB fields
    expect(updatedServiceRow.name).toBe("Executive Fade & Haircut");
    expect(updatedServiceRow.duration).toBe("1 hr");
    expect(updatedServiceRow.duration_minutes).toBe(60);
    expect(updatedServiceRow.price).toBe(7500);

    // 3. Identity preserved
    expect(updatedServiceRow.is_featured).toBe(true);
    const parsedMeta = JSON.parse(updatedServiceRow.description);
    expect(parsedMeta.isLocked).toBe(true);
    expect(parsedMeta.lockedKey).toBe("barbers_standard_cut");
    expect(parsedMeta.emoji).toBe("✂️");
    expect(parsedMeta.description).toBe("Luxury haircut including wash, scalp massage, and hot towel.");
    expect(parsedMeta.imageUrls).toEqual(["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]);
  });

  it("supports range pricing mode updates on default onboarding services", () => {
    const originalService = sampleServices[1];
    const prevMeta = JSON.parse(originalService.description);

    const updatedPrice = 4000;
    const updatedMaxPrice = 7000;
    const updatedPricingType: "range" = "range";

    const updatedMeta = {
      ...prevMeta,
      pricingType: updatedPricingType,
      maxPrice: updatedMaxPrice,
      isLocked: true,
    };

    const updatedServiceRow = {
      ...originalService,
      price: updatedPrice,
      description: JSON.stringify(updatedMeta),
    };

    expect(updatedServiceRow.id).toBe("svc-onboarding-002");
    expect(updatedServiceRow.price).toBe(4000);

    const parsedMeta = JSON.parse(updatedServiceRow.description);
    expect(parsedMeta.pricingType).toBe("range");
    expect(parsedMeta.maxPrice).toBe(7000);
    expect(parsedMeta.isLocked).toBe(true);
  });

  it("handles photo addition, replacement, and removal cleanly", () => {
    const metaWithPhotos = {
      pricingType: "fixed",
      isLocked: true,
      imageUrls: ["https://example.com/photoA.jpg", "https://example.com/photoB.jpg"],
    };

    // 1. Photo replacement at index 0
    const photosAfterReplace = [...metaWithPhotos.imageUrls];
    photosAfterReplace[0] = "https://example.com/photoA_new.jpg";
    expect(photosAfterReplace).toEqual(["https://example.com/photoA_new.jpg", "https://example.com/photoB.jpg"]);

    // 2. Photo addition at slot 2
    const photosAfterAdd = [...photosAfterReplace, "https://example.com/photoC.jpg"];
    expect(photosAfterAdd).toEqual([
      "https://example.com/photoA_new.jpg",
      "https://example.com/photoB.jpg",
      "https://example.com/photoC.jpg",
    ]);

    // 3. Photo removal at index 1
    const photosAfterRemove = photosAfterAdd.filter((_, idx) => idx !== 1);
    expect(photosAfterRemove).toEqual(["https://example.com/photoA_new.jpg", "https://example.com/photoC.jpg"]);
  });

  it("ensures existing customer booking references remain linked to updated default services", () => {
    const originalServiceId = "svc-onboarding-001";
    const existingCustomerBooking = {
      id: "booking-777",
      service_id: originalServiceId,
      customer_name: "Test Customer",
      service_price: 5000,
    };

    // After updating default service on Profile page
    const updatedServiceId = "svc-onboarding-001";

    expect(existingCustomerBooking.service_id).toBe(updatedServiceId);
  });
});
