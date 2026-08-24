/**
 * nigerianStates.ts
 *
 * Canonical list of Nigeria's 36 states, used to populate the State
 * dropdown wherever a business profile's location is entered or edited
 * (onboarding StepLocation, EditProfilePage).
 *
 * Intentionally excludes the Federal Capital Territory (Abuja) — FCT is
 * not one of the 36 states, and this app's data model has no separate
 * FCT field or option, so it is not added here.
 *
 * Values are stored as-is in profiles.state (a plain text column) —
 * no schema change required.
 */
export const NIGERIAN_STATES: string[] = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];
