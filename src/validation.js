export function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const VALIDATION_ORDER = [
  "nationalId",
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "email",
  "phone",
  "address",
  "city",
  "region",
  "college",
  "department",
  "academicYear",
  "semester",
  "enrollmentDate",
  "guardianName",
  "guardianPhone",
  "profilePhoto",
  "terms",
];

export const DEPARTMENTS_BY_COLLEGE = {
  "College of Computing and Informatics": [
    "Information Technology",
    "Software Engineering",
    "Computer Science",
    "Information System",
    "Information Science and Statistics",
  ],
};

export const ETHIOPIAN_REGIONS = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Dire Dawa",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "Southwest Ethiopia",
  "Tigray",
];

export const ACADEMIC_YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
export const SEMESTERS = ["Semester 1", "Semester 2", "Summer"];
export const GENDERS = ["Female", "Male", "Prefer not to say"];

const departmentsByCollege = DEPARTMENTS_BY_COLLEGE;
const regions = new Set(ETHIOPIAN_REGIONS);
const academicYears = new Set(ACADEMIC_YEARS);
const semesters = new Set(SEMESTERS);
const genders = new Set(GENDERS);
const faydaLengthError =
  "Please enter a valid Fayda FIN (12 digits) or FAN (16 digits).";

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && localDateValue(date) === value;
}

function validName(value) {
  return /^\p{L}[\p{L}\p{M}]*(?:[ '-’]\p{L}[\p{L}\p{M}]*)*$/u.test(value);
}

function emailError(value) {
  if (!value) return "Email address is required.";
  if (value.length > 100) return "Use no more than 100 characters.";

  const parts = value.split("@");
  if (parts.length !== 2) return "Enter a valid email address.";
  const [local, domain] = parts;
  const labels = domain.split(".");
  const validLocal =
    local.length > 0 &&
    local.length <= 64 &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..") &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local);
  const validDomain =
    labels.length >= 2 &&
    labels.every((label) => (
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label)
    )) &&
    /^[A-Z]{2,63}$/i.test(labels.at(-1));

  return validLocal && validDomain ? "" : "Enter a valid email address.";
}

export function normalizePersonName(value) {
  return value.trim();
}

export function normalizeEmail(value) {
  return value.trim();
}

export function normalizeEthiopianPhone(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("0") ? `+251${trimmed.slice(1)}` : trimmed;
}

function validateName(value, label, maxLength) {
  const normalized = normalizePersonName(value);
  if (!normalized) return `${label} is required.`;
  if (normalized.length < 2) return "Use at least 2 characters.";
  if (normalized.length > maxLength) return `Use no more than ${maxLength} characters.`;
  if (!validName(normalized)) {
    return "Use letters, spaces, hyphens, or apostrophes only.";
  }
  return "";
}

export function validateForm(form, photoError = "", nationalIdPasteError = "") {
  const errors = {};
  const addError = (key, message) => {
    if (message) errors[key] = message;
  };
  const value = (key) => String(form[key] ?? "");
  const trimmed = (key) => value(key).trim();

  const nationalId = value("nationalId");
  if (!nationalId) {
    addError("nationalId", "National ID is required.");
  } else if (!/^[0-9]+$/.test(nationalId)) {
    addError("nationalId", "National ID must contain numeric digits only (0–9).");
  } else if (![12, 16].includes(nationalId.length)) {
    addError("nationalId", faydaLengthError);
  }
  if (nationalIdPasteError) addError("nationalId", nationalIdPasteError);

  addError("firstName", validateName(value("firstName"), "First name", 50));
  addError("lastName", validateName(value("lastName"), "Last name", 50));
  addError("guardianName", validateName(value("guardianName"), "Guardian name", 100));

  if (trimmed("dateOfBirth")) {
    if (!validDate(trimmed("dateOfBirth"))) {
      addError("dateOfBirth", "Enter a valid date of birth.");
    } else if (trimmed("dateOfBirth") >= localDateValue()) {
      addError("dateOfBirth", "Date of birth must be in the past.");
    }
  } else {
    addError("dateOfBirth", "Date of birth is required.");
  }

  addError("gender", genders.has(form.gender) ? "" : "Please select a valid gender.");

  const nationality = trimmed("nationality");
  if (
    nationality.length > 60 ||
    (nationality && !/^\p{L}[\p{L}\p{M}]*(?:[ '-]\p{L}[\p{L}\p{M}]*)*$/u.test(nationality))
  ) {
    addError("nationality", "Enter a valid nationality using letters and spaces.");
  }

  const email = normalizeEmail(value("email"));
  addError("email", emailError(email));

  const phone = value("phone");
  if (!phone) {
    addError("phone", "Phone number is required.");
  } else if (!/^(?:\+251|0)(?:9|7)\d{8}$/.test(phone)) {
    addError(
      "phone",
      "Enter a valid Ethiopian number: 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX, or +2517XXXXXXXX.",
    );
  }

  const address = trimmed("address");
  if (!address) {
    addError("address", "Home address is required.");
  } else if (address.length < 3) {
    addError("address", "Enter at least 3 characters.");
  } else if (address.length > 180) {
    addError("address", "Use no more than 180 characters.");
  }

  const city = trimmed("city");
  if (city.length > 80) addError("city", "Use no more than 80 characters.");

  if (form.region && !regions.has(form.region)) {
    addError("region", "Select a valid region.");
  }

  if (!Object.hasOwn(departmentsByCollege, form.college)) {
    addError("college", "Please select a valid college.");
  }
  if (!departmentsByCollege[form.college]?.includes(form.department)) {
    addError("department", "Please select a valid department.");
  }
  if (!academicYears.has(form.academicYear)) {
    addError("academicYear", "Please select a valid academic year.");
  }
  if (!semesters.has(form.semester)) {
    addError("semester", "Please select a valid semester.");
  }

  if (!trimmed("enrollmentDate")) {
    addError("enrollmentDate", "Enrollment date is required.");
  } else if (!validDate(trimmed("enrollmentDate"))) {
    addError("enrollmentDate", "Enter a valid enrollment date.");
  } else if (trimmed("enrollmentDate") > localDateValue()) {
    addError("enrollmentDate", "Enrollment date cannot be in the future.");
  } else if (
    validDate(trimmed("dateOfBirth")) &&
    trimmed("dateOfBirth") >= trimmed("enrollmentDate")
  ) {
    addError("dateOfBirth", "Date of birth must be before the enrollment date.");
  }

  const guardianPhone = value("guardianPhone");
  if (!guardianPhone) {
    addError("guardianPhone", "Guardian phone is required.");
  } else if (!/^(?:\+251|0)(?:9|7)\d{8}$/.test(guardianPhone)) {
    addError(
      "guardianPhone",
      "Enter a valid Ethiopian number: 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX, or +2517XXXXXXXX.",
    );
  }

  if (!form.terms) addError("terms", "Please accept the terms to continue.");
  if (photoError) addError("profilePhoto", photoError);

  return errors;
}

export const NATIONAL_ID_LENGTH_ERROR = faydaLengthError;
