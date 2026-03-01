/**
 * DME product categories and sub-categories.
 */

export const DME_CATEGORIES: { name: string; subcategories: string[] }[] = [
  {
    name: "Respiratory",
    subcategories: [
      "PAP",
      "Nebulizer",
      "Home Oxygen",
      "Nebulizer Supplies",
      "POC",
      "PAP Supplies",
      "Respiratory Accessories",
      "Oxygen Accessories",
    ],
  },
  {
    name: "Mobility",
    subcategories: [
      "Walkers",
      "Manual Wheelchairs",
      "Canes & Crutches",
      "Lift Chairs",
      "Power Scooter",
      "Patient Lifts",
      "Wheelchair Accessories",
      "Recliners / Stair Lifts",
      "Power Wheelchair",
    ],
  },
  {
    name: "Orthotics & Prosthetics",
    subcategories: [
      "Lower Limb Orthotics",
      "Upper Limb Orthotics",
      "Back/Neck/Torso Orthotics",
      "Shoes & Orthotics",
      "Prosthetics",
    ],
  },
  {
    name: "Bath Aids",
    subcategories: ["Shower/Bath", "Toilet", "Commodes", "Accessories"],
  },
  {
    name: "Compression Garments",
    subcategories: [
      "Stockings",
      "Sleeves & Garments",
      "Pneumatic Compression",
    ],
  },
  {
    name: "Misc DME / Other",
    subcategories: [
      "TENS/Electrical Stimulation",
      "Scales & Monitoring Devices",
      "Miscellaneous",
      "Wound Care",
      "Gloves/Wipes/General Supplies",
      "Nutritional Supplements",
      "CPM / Rehab Devices",
      "Bone Stimulators",
      "Cooling Devices",
      "Suction Equipment",
      "Ostomy Supplies",
      "Tracheostomy Supplies",
      "Biliblanket",
    ],
  },
  {
    name: "Diabetes",
    subcategories: ["BGM", "CGM", "Diabetes Other"],
  },
  {
    name: "Hospital Beds & Support Surfaces",
    subcategories: [
      "Hospital Beds",
      "Mattresses & Pressure Pads",
      "Bed Accessories",
    ],
  },
  {
    name: "Vascular Health",
    subcategories: ["Blood Pressure Monitors"],
  },
  {
    name: "Incontinence",
    subcategories: ["Briefs/Diapers", "Urological", "Accessories"],
  },
];

/** Flat list of top-level category names. */
export const DME_CATEGORY_NAMES = DME_CATEGORIES.map((c) => c.name);
