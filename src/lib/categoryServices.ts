// ─────────────────────────────────────────────────────────────────────────────
// categoryServices.ts
// Defines locked (mandatory) services and available sub-services per category.
// Locked services appear pinned at the top of every provider's page.
// Sub-services are the only options available when the business adds new services.
// ─────────────────────────────────────────────────────────────────────────────

export interface LockedService {
  key: string;          // stable identifier stored in DB
  name: string;
  emoji: string;
  defaultPrice: number; // suggested starting price in NGN
  duration: string;
}

export interface SubService {
  name: string;
  emoji: string;
  suggestedPrice: number;
  duration: string;
}

export interface CategoryServiceConfig {
  lockedServices: LockedService[];   // 1–3 locked, always shown
  subServices: SubService[];         // pick-list when adding a service
}

const CONFIG: Record<string, CategoryServiceConfig> = {
  barbers: {
    lockedServices: [
      { key: "haircut", name: "Haircut", emoji: "✂️", defaultPrice: 1500, duration: "30 mins" },
      { key: "beard_trim", name: "Beard Trim", emoji: "🧔", defaultPrice: 1000, duration: "20 mins" },
      { key: "head_shave", name: "Head Shave", emoji: "🪒", defaultPrice: 2000, duration: "30 mins" },
    ],
    subServices: [
      { name: "Fade Haircut", emoji: "✂️", suggestedPrice: 2000, duration: "45 mins" },
      { name: "Straight Razor Shave", emoji: "🪒", suggestedPrice: 2500, duration: "30 mins" },
      { name: "Hair Lineup / Edge Up", emoji: "📐", suggestedPrice: 800, duration: "15 mins" },
      { name: "Kids Haircut", emoji: "👦", suggestedPrice: 1200, duration: "20 mins" },
      { name: "Hair Wash & Style", emoji: "🚿", suggestedPrice: 1500, duration: "30 mins" },
      { name: "Scalp Treatment", emoji: "💆", suggestedPrice: 3000, duration: "45 mins" },
      { name: "Dreadlock Retwist", emoji: "🌿", suggestedPrice: 3500, duration: "1 hr" },
      { name: "Cornrows (Men)", emoji: "🎨", suggestedPrice: 2500, duration: "1 hr" },
    ],
  },

  hairdressers: {
    lockedServices: [
      { key: "wash_and_set", name: "Wash & Set", emoji: "🚿", defaultPrice: 3000, duration: "1 hr" },
      { key: "braiding", name: "Braiding & Plaiting", emoji: "🪢", defaultPrice: 5000, duration: "2 hrs" },
      { key: "hair_treatment", name: "Hair Treatment", emoji: "💆", defaultPrice: 4000, duration: "1 hr" },
    ],
    subServices: [
      { name: "Weaves & Extensions", emoji: "👑", suggestedPrice: 15000, duration: "2 hrs 30 mins" },
      { name: "Locs / Dreadlocks", emoji: "🌿", suggestedPrice: 8000, duration: "2 hrs" },
      { name: "Natural Hair Styling", emoji: "🌸", suggestedPrice: 5000, duration: "1 hr 30 mins" },
      { name: "Relaxer / Perm", emoji: "🧪", suggestedPrice: 6000, duration: "2 hrs" },
      { name: "Hair Colouring", emoji: "🎨", suggestedPrice: 12000, duration: "2 hrs" },
      { name: "Highlights / Balayage", emoji: "✨", suggestedPrice: 15000, duration: "2 hrs 30 mins" },
      { name: "Wig Installation", emoji: "💁", suggestedPrice: 7000, duration: "1 hr 30 mins" },
      { name: "Wig Customisation", emoji: "🪡", suggestedPrice: 10000, duration: "2 hrs" },
      { name: "Blow Dry & Style", emoji: "💨", suggestedPrice: 3500, duration: "45 mins" },
      { name: "Silk Press", emoji: "🌊", suggestedPrice: 5000, duration: "1 hr" },
      { name: "Kids Hair Braiding", emoji: "👧", suggestedPrice: 3000, duration: "1 hr 30 mins" },
      { name: "Mohawk / Big Chop", emoji: "⚡", suggestedPrice: 4000, duration: "1 hr" },
    ],
  },

  makeup_artists: {
    lockedServices: [
      { key: "full_glam", name: "Full Glam Makeup", emoji: "💄", defaultPrice: 20000, duration: "1 hr 30 mins" },
      { key: "natural_makeup", name: "Natural / No-Makeup Look", emoji: "🌸", defaultPrice: 12000, duration: "1 hr" },
      { key: "bridal_makeup", name: "Bridal Makeup", emoji: "👰", defaultPrice: 40000, duration: "2 hrs" },
    ],
    subServices: [
      { name: "Evening / Party Makeup", emoji: "🌙", suggestedPrice: 18000, duration: "1 hr 30 mins" },
      { name: "Aso-Ebi / Traditional Look", emoji: "👘", suggestedPrice: 25000, duration: "1 hr 30 mins" },
      { name: "Engagement Makeup", emoji: "💍", suggestedPrice: 30000, duration: "2 hrs" },
      { name: "Photoshoot Makeup", emoji: "📸", suggestedPrice: 22000, duration: "1 hr 30 mins" },
      { name: "Airbrush Makeup", emoji: "🖌️", suggestedPrice: 28000, duration: "2 hrs" },
      { name: "Editorial / Fantasy Makeup", emoji: "🎭", suggestedPrice: 25000, duration: "2 hrs" },
      { name: "Kids / Teens Makeup", emoji: "🦋", suggestedPrice: 8000, duration: "45 mins" },
      { name: "Groom Makeup", emoji: "🤵", suggestedPrice: 15000, duration: "1 hr" },
      { name: "Eyebrow Tinting / Shaping", emoji: "👁️", suggestedPrice: 5000, duration: "30 mins" },
    ],
  },

  lash_techs: {
    lockedServices: [
      { key: "classic_lashes", name: "Classic Lash Set", emoji: "👁️", defaultPrice: 10000, duration: "1 hr 30 mins" },
      { key: "lash_refill", name: "Lash Refill", emoji: "🔁", defaultPrice: 6000, duration: "1 hr" },
      { key: "lash_removal", name: "Lash Removal", emoji: "❌", defaultPrice: 3000, duration: "30 mins" },
    ],
    subServices: [
      { name: "Volume Lash Set", emoji: "✨", suggestedPrice: 15000, duration: "2 hrs" },
      { name: "Mega Volume Lashes", emoji: "💥", suggestedPrice: 20000, duration: "2 hrs 30 mins" },
      { name: "Hybrid Lash Set", emoji: "🌸", suggestedPrice: 13000, duration: "2 hrs" },
      { name: "Wispy Lashes", emoji: "🦋", suggestedPrice: 14000, duration: "2 hrs" },
      { name: "Bottom Lash Set", emoji: "👁️", suggestedPrice: 5000, duration: "30 mins" },
      { name: "Lash Lift & Tint", emoji: "⬆️", suggestedPrice: 9000, duration: "1 hr" },
      { name: "Cluster Lashes", emoji: "🌺", suggestedPrice: 7000, duration: "45 mins" },
    ],
  },

  photographers: {
    lockedServices: [
      { key: "portrait_session", name: "Portrait Session", emoji: "📸", defaultPrice: 30000, duration: "1 hr" },
      { key: "event_coverage", name: "Event Coverage", emoji: "🎉", defaultPrice: 80000, duration: "3 hrs" },
      { key: "photo_editing", name: "Photo Editing / Retouching", emoji: "🖼️", defaultPrice: 10000, duration: "2 hrs" },
    ],
    subServices: [
      { name: "Wedding Photography", emoji: "💒", suggestedPrice: 200000, duration: "3 hrs" },
      { name: "Pre-Wedding / Engagement Shoot", emoji: "💍", suggestedPrice: 80000, duration: "2 hrs" },
      { name: "Corporate / Headshot", emoji: "👔", suggestedPrice: 25000, duration: "1 hr" },
      { name: "Fashion / Editorial Shoot", emoji: "👗", suggestedPrice: 50000, duration: "2 hrs" },
      { name: "Birthday / Party Coverage", emoji: "🎂", suggestedPrice: 60000, duration: "2 hrs" },
      { name: "Baby / Maternity Shoot", emoji: "🍼", suggestedPrice: 40000, duration: "1 hr 30 mins" },
      { name: "Product Photography", emoji: "📦", suggestedPrice: 20000, duration: "1 hr" },
      { name: "Graduation Shoot", emoji: "🎓", suggestedPrice: 30000, duration: "1 hr" },
      { name: "Real Estate Photography", emoji: "🏠", suggestedPrice: 35000, duration: "2 hrs" },
      { name: "Videography Add-On", emoji: "🎬", suggestedPrice: 50000, duration: "2 hrs" },
    ],
  },

  tattoo_artists: {
    lockedServices: [
      { key: "small_tattoo", name: "Small Tattoo", emoji: "🖊️", defaultPrice: 15000, duration: "1 hr" },
      { key: "tattoo_consultation", name: "Tattoo Consultation", emoji: "📋", defaultPrice: 0, duration: "30 mins" },
      { key: "tattoo_touch_up", name: "Touch-Up Session", emoji: "✏️", defaultPrice: 8000, duration: "30 mins" },
    ],
    subServices: [
      { name: "Medium Tattoo", emoji: "🎨", suggestedPrice: 35000, duration: "2 hrs" },
      { name: "Large Tattoo / Sleeve", emoji: "💪", suggestedPrice: 80000, duration: "3 hrs" },
      { name: "Portrait Tattoo", emoji: "🖼️", suggestedPrice: 50000, duration: "2 hrs 30 mins" },
      { name: "Tribal / Cultural Tattoo", emoji: "🌍", suggestedPrice: 30000, duration: "1 hr 30 mins" },
      { name: "Watercolour Tattoo", emoji: "🎨", suggestedPrice: 45000, duration: "2 hrs" },
      { name: "Minimalist / Fine Line", emoji: "〰️", suggestedPrice: 20000, duration: "1 hr" },
      { name: "Lettering / Script", emoji: "✍️", suggestedPrice: 15000, duration: "45 mins" },
      { name: "Tattoo Cover-Up", emoji: "🔲", suggestedPrice: 50000, duration: "2 hrs 30 mins" },
      { name: "Temporary Tattoo (Henna)", emoji: "🌿", suggestedPrice: 5000, duration: "30 mins" },
    ],
  },

  djs: {
    lockedServices: [
      { key: "event_dj", name: "Event DJ (4 hrs)", emoji: "🎧", defaultPrice: 80000, duration: "3 hrs" },
      { key: "mixtape", name: "Custom Mixtape", emoji: "🎵", defaultPrice: 20000, duration: "2 hrs" },
      { key: "mc_services", name: "MC Services", emoji: "🎤", defaultPrice: 50000, duration: "3 hrs" },
    ],
    subServices: [
      { name: "Wedding Reception DJ", emoji: "💒", suggestedPrice: 150000, duration: "3 hrs" },
      { name: "Club Night DJ Set", emoji: "🌙", suggestedPrice: 100000, duration: "3 hrs" },
      { name: "Birthday Party DJ", emoji: "🎂", suggestedPrice: 60000, duration: "3 hrs" },
      { name: "Corporate Event DJ", emoji: "🏢", suggestedPrice: 80000, duration: "3 hrs" },
      { name: "Pool / Outdoor Party", emoji: "🏊", suggestedPrice: 70000, duration: "3 hrs" },
      { name: "Sound System Rental", emoji: "🔊", suggestedPrice: 40000, duration: "1 hr" },
      { name: "Live Streaming DJ", emoji: "📡", suggestedPrice: 30000, duration: "2 hrs" },
    ],
  },

  event_planners: {
    lockedServices: [
      { key: "event_consultation", name: "Event Consultation", emoji: "📋", defaultPrice: 15000, duration: "1 hr" },
      { key: "full_event_planning", name: "Full Event Planning", emoji: "🎉", defaultPrice: 200000, duration: "3 hrs" },
      { key: "venue_decoration", name: "Venue Decoration", emoji: "🎊", defaultPrice: 80000, duration: "3 hrs" },
    ],
    subServices: [
      { name: "Wedding Planning", emoji: "💒", suggestedPrice: 500000, duration: "3 hrs" },
      { name: "Birthday Party Planning", emoji: "🎂", suggestedPrice: 100000, duration: "2 hrs" },
      { name: "Corporate Event Planning", emoji: "🏢", suggestedPrice: 200000, duration: "3 hrs" },
      { name: "Traditional / Cultural Event", emoji: "🌍", suggestedPrice: 150000, duration: "3 hrs" },
      { name: "Baby Shower Planning", emoji: "🍼", suggestedPrice: 60000, duration: "2 hrs" },
      { name: "Bridal Shower Planning", emoji: "👰", suggestedPrice: 80000, duration: "2 hrs" },
      { name: "Floral Arrangement", emoji: "🌸", suggestedPrice: 30000, duration: "1 hr 30 mins" },
      { name: "Chair / Table Rental Setup", emoji: "🪑", suggestedPrice: 20000, duration: "2 hrs" },
      { name: "Day-Of Coordination", emoji: "📅", suggestedPrice: 50000, duration: "3 hrs" },
    ],
  },

  caterers: {
    lockedServices: [
      { key: "small_chops", name: "Small Chops Catering", emoji: "🍢", defaultPrice: 30000, duration: "2 hrs" },
      { key: "full_buffet", name: "Full Buffet Catering", emoji: "🍽️", defaultPrice: 150000, duration: "3 hrs" },
      { key: "food_tasting", name: "Food Tasting Session", emoji: "👨‍🍳", defaultPrice: 10000, duration: "1 hr" },
    ],
    subServices: [
      { name: "Wedding Catering", emoji: "💒", suggestedPrice: 400000, duration: "3 hrs" },
      { name: "Corporate Lunch / Dinner", emoji: "🏢", suggestedPrice: 100000, duration: "2 hrs" },
      { name: "Jollof Party Pack", emoji: "🍚", suggestedPrice: 20000, duration: "1 hr" },
      { name: "Outdoor BBQ Catering", emoji: "🔥", suggestedPrice: 80000, duration: "2 hrs" },
      { name: "Soup & Swallow Menu", emoji: "🍲", suggestedPrice: 40000, duration: "2 hrs" },
      { name: "Continental Dishes", emoji: "🥘", suggestedPrice: 60000, duration: "2 hrs" },
      { name: "Drinks / Cocktail Service", emoji: "🍹", suggestedPrice: 30000, duration: "1 hr" },
      { name: "Private Chef (Home)", emoji: "👨‍🍳", suggestedPrice: 25000, duration: "2 hrs" },
      { name: "Oven / Grilled Dishes", emoji: "🍗", suggestedPrice: 35000, duration: "2 hrs" },
    ],
  },

  cake_vendors: {
    lockedServices: [
      { key: "birthday_cake", name: "Birthday Cake", emoji: "🎂", defaultPrice: 15000, duration: "2 hrs" },
      { key: "wedding_cake", name: "Wedding Cake", emoji: "🎊", defaultPrice: 80000, duration: "3 hrs" },
      { key: "cupcakes", name: "Cupcakes (1 dozen)", emoji: "🧁", defaultPrice: 8000, duration: "1 hr" },
    ],
    subServices: [
      { name: "Custom 3D Cake", emoji: "🏗️", suggestedPrice: 50000, duration: "3 hrs" },
      { name: "Fondant Cake", emoji: "🎨", suggestedPrice: 35000, duration: "2 hrs" },
      { name: "Drip / Naked Cake", emoji: "💧", suggestedPrice: 25000, duration: "2 hrs" },
      { name: "Celebration Cake (multi-tier)", emoji: "✨", suggestedPrice: 45000, duration: "3 hrs" },
      { name: "Chin Chin / Cookies Box", emoji: "🍪", suggestedPrice: 5000, duration: "1 hr" },
      { name: "Cake Pops", emoji: "🍡", suggestedPrice: 6000, duration: "1 hr" },
      { name: "Themed Kids Cake", emoji: "🦸", suggestedPrice: 20000, duration: "2 hrs" },
      { name: "Cheesecake / No-Bake Cake", emoji: "🧀", suggestedPrice: 18000, duration: "1 hr 30 mins" },
    ],
  },

  mechanics: {
    lockedServices: [
      { key: "diagnostics", name: "Car Diagnostics", emoji: "🔬", defaultPrice: 5000, duration: "1 hr" },
      { key: "oil_change", name: "Oil Change", emoji: "🛢️", defaultPrice: 8000, duration: "30 mins" },
      { key: "tyre_change", name: "Tyre Change / Repair", emoji: "🔄", defaultPrice: 5000, duration: "30 mins" },
    ],
    subServices: [
      { name: "Engine Repair", emoji: "⚙️", suggestedPrice: 50000, duration: "3 hrs" },
      { name: "Brake Repair", emoji: "🛑", suggestedPrice: 20000, duration: "1 hr 30 mins" },
      { name: "Suspension Repair", emoji: "🔧", suggestedPrice: 30000, duration: "2 hrs" },
      { name: "AC Service", emoji: "❄️", suggestedPrice: 15000, duration: "1 hr" },
      { name: "Electrical / Wiring", emoji: "⚡", suggestedPrice: 25000, duration: "2 hrs" },
      { name: "Battery Replacement", emoji: "🔋", suggestedPrice: 10000, duration: "30 mins" },
      { name: "Wheel Alignment", emoji: "🎯", suggestedPrice: 8000, duration: "45 mins" },
      { name: "Full Car Service", emoji: "🚗", suggestedPrice: 40000, duration: "3 hrs" },
      { name: "Gearbox Repair", emoji: "⚙️", suggestedPrice: 60000, duration: "3 hrs" },
    ],
  },

  generator_mechanics: {
    lockedServices: [
      { key: "gen_diagnostics", name: "Generator Diagnostics", emoji: "🔍", defaultPrice: 5000, duration: "1 hr" },
      { key: "gen_servicing", name: "Generator Servicing", emoji: "🔧", defaultPrice: 15000, duration: "2 hrs" },
      { key: "gen_repair", name: "Generator Repair", emoji: "⚙️", defaultPrice: 20000, duration: "2 hrs" },
    ],
    subServices: [
      { name: "Oil & Filter Change", emoji: "🛢️", suggestedPrice: 8000, duration: "45 mins" },
      { name: "Spark Plug Replacement", emoji: "🔌", suggestedPrice: 5000, duration: "30 mins" },
      { name: "Carburetor Cleaning / Repair", emoji: "🧹", suggestedPrice: 10000, duration: "1 hr" },
      { name: "AVR / Control Board Repair", emoji: "🖥️", suggestedPrice: 15000, duration: "1 hr 30 mins" },
      { name: "Generator Panel Installation", emoji: "🏠", suggestedPrice: 25000, duration: "2 hrs" },
      { name: "Inverter Installation", emoji: "🔋", suggestedPrice: 30000, duration: "2 hrs" },
      { name: "Battery Charging System", emoji: "⚡", suggestedPrice: 12000, duration: "1 hr" },
    ],
  },

  cleaning_services: {
    lockedServices: [
      { key: "home_cleaning", name: "Home Cleaning", emoji: "🏠", defaultPrice: 15000, duration: "2 hrs" },
      { key: "deep_cleaning", name: "Deep Cleaning", emoji: "✨", defaultPrice: 30000, duration: "3 hrs" },
      { key: "post_construction", name: "Post-Construction Cleanup", emoji: "🏗️", defaultPrice: 50000, duration: "3 hrs" },
    ],
    subServices: [
      { name: "Office Cleaning", emoji: "🏢", suggestedPrice: 20000, duration: "2 hrs" },
      { name: "Carpet / Rug Cleaning", emoji: "🛋️", suggestedPrice: 10000, duration: "1 hr 30 mins" },
      { name: "Laundry & Ironing", emoji: "👕", suggestedPrice: 8000, duration: "2 hrs" },
      { name: "Kitchen Deep Clean", emoji: "🍳", suggestedPrice: 20000, duration: "2 hrs" },
      { name: "Bathroom Sanitisation", emoji: "🚿", suggestedPrice: 10000, duration: "1 hr" },
      { name: "Move-In / Move-Out Clean", emoji: "📦", suggestedPrice: 40000, duration: "3 hrs" },
      { name: "Window Cleaning", emoji: "🪟", suggestedPrice: 12000, duration: "1 hr 30 mins" },
      { name: "Sofa / Upholstery Cleaning", emoji: "🛋️", suggestedPrice: 15000, duration: "1 hr 30 mins" },
    ],
  },

  personal_trainers: {
    lockedServices: [
      { key: "fitness_assessment", name: "Fitness Assessment", emoji: "📊", defaultPrice: 10000, duration: "1 hr" },
      { key: "pt_session", name: "Personal Training Session", emoji: "💪", defaultPrice: 15000, duration: "1 hr" },
      { key: "nutrition_plan", name: "Nutrition Plan", emoji: "🥗", defaultPrice: 20000, duration: "1 hr" },
    ],
    subServices: [
      { name: "Weight Loss Program", emoji: "⚖️", suggestedPrice: 50000, duration: "1 hr" },
      { name: "Muscle Building Program", emoji: "🏋️", suggestedPrice: 50000, duration: "1 hr" },
      { name: "Home Workout Coaching", emoji: "🏠", suggestedPrice: 20000, duration: "1 hr" },
      { name: "Yoga / Flexibility Session", emoji: "🧘", suggestedPrice: 12000, duration: "1 hr" },
      { name: "Group Fitness Class", emoji: "👥", suggestedPrice: 5000, duration: "1 hr" },
      { name: "Pre/Post Natal Fitness", emoji: "🤰", suggestedPrice: 18000, duration: "1 hr" },
      { name: "HIIT Session", emoji: "🔥", suggestedPrice: 15000, duration: "45 mins" },
      { name: "Cardio Training", emoji: "🏃", suggestedPrice: 12000, duration: "45 mins" },
    ],
  },

  pet_services: {
    lockedServices: [
      { key: "pet_grooming", name: "Pet Grooming", emoji: "🐾", defaultPrice: 8000, duration: "1 hr" },
      { key: "pet_sitting", name: "Pet Sitting (per day)", emoji: "🐶", defaultPrice: 5000, duration: "1 hr" },
      { key: "vet_consultation", name: "Vet / Health Consultation", emoji: "🩺", defaultPrice: 10000, duration: "45 mins" },
    ],
    subServices: [
      { name: "Dog Walking (1 hr)", emoji: "🦮", suggestedPrice: 3000, duration: "1 hr" },
      { name: "Pet Bathing & Drying", emoji: "🛁", suggestedPrice: 5000, duration: "1 hr" },
      { name: "Nail Clipping", emoji: "✂️", suggestedPrice: 2000, duration: "20 mins" },
      { name: "Ear Cleaning", emoji: "👂", suggestedPrice: 2500, duration: "20 mins" },
      { name: "Flea & Tick Treatment", emoji: "🪲", suggestedPrice: 6000, duration: "30 mins" },
      { name: "Pet Training (basic)", emoji: "🎾", suggestedPrice: 15000, duration: "1 hr" },
      { name: "Boarding / Overnight Stay", emoji: "🏠", suggestedPrice: 8000, duration: "1 hr" },
      { name: "Vaccination Reminder & Booking", emoji: "💉", suggestedPrice: 3000, duration: "30 mins" },
    ],
  },

  lesson_teachers: {
    lockedServices: [
      { key: "home_lesson", name: "Home Tutoring Session", emoji: "📚", defaultPrice: 10000, duration: "1 hr" },
      { key: "online_class", name: "Online Class", emoji: "💻", defaultPrice: 7000, duration: "1 hr" },
      { key: "exam_prep", name: "Exam Prep / Coaching", emoji: "📝", defaultPrice: 15000, duration: "1 hr 30 mins" },
    ],
    subServices: [
      { name: "Primary School Tutoring", emoji: "🏫", suggestedPrice: 8000, duration: "1 hr" },
      { name: "Secondary / WAEC Coaching", emoji: "📖", suggestedPrice: 12000, duration: "1 hr 30 mins" },
      { name: "JAMB / UTME Preparation", emoji: "🎯", suggestedPrice: 15000, duration: "1 hr 30 mins" },
      { name: "Mathematics", emoji: "➗", suggestedPrice: 10000, duration: "1 hr" },
      { name: "English Language", emoji: "🔤", suggestedPrice: 10000, duration: "1 hr" },
      { name: "Science (Physics/Chemistry/Biology)", emoji: "🔬", suggestedPrice: 10000, duration: "1 hr" },
      { name: "Music Lessons", emoji: "🎵", suggestedPrice: 12000, duration: "1 hr" },
      { name: "Computer / Coding Lessons", emoji: "💻", suggestedPrice: 15000, duration: "1 hr" },
      { name: "Language Lessons (French/Yoruba/Igbo etc.)", emoji: "🌍", suggestedPrice: 10000, duration: "1 hr" },
    ],
  },
};

/** Returns the config for a category, or a generic fallback. */
export function getCategoryConfig(categoryId: string): CategoryServiceConfig {
  return (
    CONFIG[categoryId] ?? {
      lockedServices: [
        { key: "consultation", name: "Consultation", emoji: "📋", defaultPrice: 5000, duration: "30 mins" },
      ],
      subServices: [],
    }
  );
}

/** Returns locked service keys for a category */
export function getLockedServiceKeys(categoryId: string): string[] {
  return getCategoryConfig(categoryId).lockedServices.map((s) => s.key);
}
