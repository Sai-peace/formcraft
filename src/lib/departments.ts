export const OAU_DEPARTMENT_CODES: Record<string, string> = {
  // Technology
  CPE: "Computer Engineering",
  CSC: "Computer Science",
  EEG: "Electronic & Electrical Engineering",
  MEE: "Mechanical Engineering",
  CVE: "Civil Engineering",
  CHE: "Chemical Engineering",
  AGE: "Agricultural Engineering",
  MSE: "Materials Science & Engineering",
  FST: "Food Science & Technology",

  // Sciences
  MTH: "Mathematics",
  PHY: "Physics",
  CHM: "Chemistry",
  BCM: "Biochemistry",
  MCB: "Microbiology",
  BOT: "Botany",
  ZOO: "Zoology",
  GLG: "Geology",

  // Health Sciences & Pharmacy
  MED: "Medicine & Surgery",
  DEN: "Dentistry",
  NUR: "Nursing Science",
  MLS: "Medical Laboratory Science",
  PHA: "Pharmacy",

  // Administration & Social Sciences
  ACC: "Accounting",
  ECN: "Economics",
  BUS: "Business Administration",
  PAD: "Public Administration",
  IRP: "International Relations",
  POL: "Political Science",
  SOC: "Sociology & Anthropology",
  PSY: "Psychology",
  DEM: "Demography & Social Statistics",

  // Arts & Law
  LAW: "Law",
  ENG: "English Language",
  LIT: "Literature in English",
  HIS: "History",
  PHI: "Philosophy",
  REL: "Religious Studies",
  DRA: "Dramatic Arts",
  FAA: "Fine & Applied Arts",
  LIN: "Linguistics",

  // Education
  EDU: "Education",
  EDM: "Educational Management",
  EGC: "Guidance & Counselling",

  // Environmental Design
  ARC: "Architecture",
  URP: "Urban & Regional Planning",
  QSV: "Quantity Surveying",
  ESM: "Estate Management",
  BLD: "Building",
};

/**
 * Extracts department code and year of entry from an OAU matric number.
 * e.g., "CPE/2021/045" -> { code: "CPE", department: "Computer Engineering", year: "2021" }
 */
export function parseOauMatric(matric: string): {
  code: string;
  department: string;
  year: string;
} | null {
  const match = matric
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{3,4})\/(\d{4})\/(\d{3,4})$/);
  if (!match) return null;

  const [, code, year] = match;
  const department =
    OAU_DEPARTMENT_CODES[code] || "Other / Combined Department";

  return { code, department, year };
}

/**
 * Matches either @student.oauife.edu.ng (students) or @oauife.edu.ng (staff/lecturers)
 */
export const OAU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(student\.)?oauife\.edu\.ng$/i;

export function isValidOauEmail(email: string): boolean {
  return OAU_EMAIL_REGEX.test(email.trim());
}