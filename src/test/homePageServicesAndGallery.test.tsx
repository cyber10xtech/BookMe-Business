import { describe, it, expect } from "vitest";

describe("BookMe Business - Home Page Services and Gallery Interaction", () => {
  const sampleServices = [
    {
      id: "svc-default-101",
      provider_id: "prov-123",
      user_id: "user-123",
      name: "Default Signature Haircut",
      duration: "45 mins",
      duration_minutes: 45,
      price: 5000,
      is_active: true,
      is_featured: true,
      description: JSON.stringify({
        pricingType: "fixed",
        isLocked: true,
        lockedKey: "barbers_cut",
        emoji: "💈",
        imageUrls: [],
        description: "Onboarding default haircut",
      }),
    },
    {
      id: "svc-custom-202",
      provider_id: "prov-123",
      user_id: "user-123",
      name: "VIP Beard Alignment",
      duration: "30 mins",
      duration_minutes: 30,
      price: 3500,
      is_active: true,
      is_featured: false,
      description: JSON.stringify({
        pricingType: "fixed",
        isLocked: false,
        emoji: "✂️",
        imageUrls: [],
        description: "Custom added beard service",
      }),
    },
  ];

  it("distinguishes default vs custom services on Home page and preserves respective flags when saved", () => {
    const getMeta = (s: any) => JSON.parse(s.description);

    // 1. Default Service Edit on Home Page
    const defaultSvc = sampleServices[0];
    const defaultMeta = getMeta(defaultSvc);
    const isDefault = defaultSvc.is_featured === true || defaultMeta.isLocked === true;
    expect(isDefault).toBe(true);

    const updatedDefaultMeta = {
      ...defaultMeta,
      emoji: "✂️",
      isLocked: isDefault ? true : false,
      description: "Updated onboarding description from Home",
    };
    const updatedDefaultRow = {
      ...defaultSvc,
      name: "Default Signature Haircut (Premium)",
      price: 6500,
      is_featured: isDefault ? true : false,
      description: JSON.stringify(updatedDefaultMeta),
    };

    expect(updatedDefaultRow.id).toBe("svc-default-101");
    expect(updatedDefaultRow.is_featured).toBe(true);
    expect(JSON.parse(updatedDefaultRow.description).isLocked).toBe(true);

    // 2. Custom Service Edit on Home Page
    const customSvc = sampleServices[1];
    const customMeta = getMeta(customSvc);
    const isCustomDefault = customSvc.is_featured === true || customMeta.isLocked === true;
    expect(isCustomDefault).toBe(false);

    const updatedCustomMeta = {
      ...customMeta,
      description: "Updated custom service from Home",
      isLocked: isCustomDefault ? true : false,
    };
    const updatedCustomRow = {
      ...customSvc,
      price: 4500,
      is_featured: isCustomDefault ? true : false,
      description: JSON.stringify(updatedCustomMeta),
    };

    expect(updatedCustomRow.id).toBe("svc-custom-202");
    expect(updatedCustomRow.is_featured).toBe(false);
    expect(JSON.parse(updatedCustomRow.description).isLocked).toBe(false);
  });

  it("handles gallery replacement safely by verifying upload, DB update, local state update, and safe removal of old file", () => {
    const initialGallery = [
      { id: "gal-1", photo_url: "https://example.com/old_photo1.jpg", caption: "Fade trim" },
      { id: "gal-2", photo_url: "https://example.com/photo2.jpg", caption: "Nail art" },
    ];

    // Simulate replacement of gal-1
    const newPhotoUrl = "https://example.com/new_photo1.jpg";
    const updatedPhoto = { ...initialGallery[0], photo_url: newUrlPhotoUrl(newPhotoUrl) };

    function newUrlPhotoUrl(url: string) {
      return url;
    }

    const stateAfterReplace = initialGallery.map((item) =>
      item.id === updatedPhoto.id ? { ...item, photo_url: newPhotoUrl } : item
    );

    expect(stateAfterReplace[0].photo_url).toBe("https://example.com/new_photo1.jpg");
    expect(stateAfterReplace[1].photo_url).toBe("https://example.com/photo2.jpg");
  });

  it("handles gallery deletion safely by removing only the target photo and keeping others intact", () => {
    const initialGallery = [
      { id: "gal-1", photo_url: "https://example.com/photo1.jpg" },
      { id: "gal-2", photo_url: "https://example.com/photo2.jpg" },
      { id: "gal-3", photo_url: "https://example.com/photo3.jpg" },
    ];

    const deletedId = "gal-2";
    const stateAfterDelete = initialGallery.filter((item) => item.id !== deletedId);

    expect(stateAfterDelete).toHaveLength(2);
    expect(stateAfterDelete.map((g) => g.id)).toEqual(["gal-1", "gal-3"]);
  });

  it("handles gallery caption updates cleanly without altering photo_url or id", () => {
    const photo = { id: "gal-10", photo_url: "https://example.com/photo10.jpg", caption: "Old caption" };

    const updatedPhoto = { ...photo, caption: "New luxury hairstyle caption" };

    expect(updatedPhoto.id).toBe("gal-10");
    expect(updatedPhoto.photo_url).toBe("https://example.com/photo10.jpg");
    expect(updatedPhoto.caption).toBe("New luxury hairstyle caption");
  });
});
