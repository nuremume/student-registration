import test from "node:test";
import assert from "node:assert/strict";
import {
  localDateValue,
  normalizeEthiopianPhone,
  normalizeEmail,
  normalizePersonName,
  validateForm,
} from "./validation.js";

const validForm = {
  nationalId: "123456789012",
  firstName: "Nure",
  lastName: "Mume Yusuf",
  dateOfBirth: "2000-01-15",
  gender: "Female",
  nationality: "Ethiopian",
  email: "nure@example.com",
  phone: "+251912345678",
  address: "Bole, Addis Ababa",
  region: "Addis Ababa",
  city: "Addis Ababa",
  college: "College of Computing and Informatics",
  department: "Software Engineering",
  academicYear: "Year 1",
  semester: "Semester 1",
  enrollmentDate: localDateValue(new Date(new Date().getFullYear() - 1, 8, 1)),
  guardianName: "Abdi-Omar",
  guardianPhone: "0912345678",
  terms: true,
};

test("accepts a complete registration with valid details", () => {
  assert.deepEqual(validateForm(validForm), {});
});

test("accepts the documented English and Ethiopic name examples", () => {
  for (const name of ["Nure", "Mume Yusuf", "Abdi-Omar", "O'Connor", "ኑር", "ሙመ ዩሱፍ"]) {
    const errors = validateForm({
      ...validForm,
      firstName: name,
      lastName: name,
      guardianName: name,
    });

    assert.equal(errors.firstName, undefined, `${name} should be accepted as a first name`);
    assert.equal(errors.lastName, undefined, `${name} should be accepted as a last name`);
    assert.equal(errors.guardianName, undefined, `${name} should be accepted as a guardian name`);
  }
});

test("rejects numeric, special-character, and whitespace-only names", () => {
  for (const name of ["Nure123", "Yusuf@", "123456", "@#$%", "   "]) {
    const errors = validateForm({ ...validForm, firstName: name });
    assert.ok(errors.firstName, `${JSON.stringify(name)} should be rejected`);
  }
});

test("trims leading and trailing whitespace from names and email", () => {
  assert.equal(normalizePersonName("  Mume Yusuf  "), "Mume Yusuf");
  assert.equal(normalizeEmail("  nure@example.com  "), "nure@example.com");
});

test("accepts the two exact Fayda ID formats", () => {
  for (const nationalId of ["123456789012", "1234567890123456"]) {
    assert.equal(validateForm({ ...validForm, nationalId }).nationalId, undefined);
  }
});

test("rejects all Fayda ID lengths except 12 and 16 digits", () => {
  const invalidIds = [
    "12345678901",
    "1234567890123",
    "12345678901234",
    "123456789012345",
    "12345678901234567",
  ];

  for (const nationalId of invalidIds) {
    assert.equal(
      validateForm({ ...validForm, nationalId }).nationalId,
      "Please enter a valid Fayda FIN (12 digits) or FAN (16 digits).",
      `${nationalId.length}-digit IDs should be rejected`,
    );
  }
});

test("rejects non-digit Fayda IDs without altering the value", () => {
  for (const nationalId of ["ABC123456789", "12345@789012", "1234 56789012"]) {
    assert.equal(
      validateForm({ ...validForm, nationalId }).nationalId,
      "National ID must contain numeric digits only (0–9).",
    );
  }
});

test("reports required National ID separately from malformed IDs", () => {
  assert.equal(
    validateForm({ ...validForm, nationalId: "" }).nationalId,
    "National ID is required.",
  );
});

test("clears the Fayda format error after the user corrects the value", () => {
  const invalidErrors = validateForm({ ...validForm, nationalId: "1234567890123" });
  const correctedErrors = validateForm({ ...validForm, nationalId: "123456789012" });

  assert.ok(invalidErrors.nationalId);
  assert.equal(correctedErrors.nationalId, undefined);
});

test("accepts local and international Ethiopian mobile phone formats", () => {
  for (const phone of ["0912345678", "0712345678", "+251912345678", "+251712345678"]) {
    const errors = validateForm({ ...validForm, phone, guardianPhone: phone });
    assert.equal(errors.phone, undefined, `${phone} should be accepted`);
    assert.equal(errors.guardianPhone, undefined, `${phone} should be accepted`);
  }
});

test("rejects phone numbers with invalid prefixes, lengths, or characters", () => {
  for (const phone of ["0812345678", "091234567", "+251812345678", "+251 912345678", "09123456789"]) {
    assert.ok(validateForm({ ...validForm, phone }).phone, `${phone} should be rejected`);
  }
});

test("normalizes local Ethiopian phone numbers for stored records", () => {
  assert.equal(normalizeEthiopianPhone("0912345678"), "+251912345678");
  assert.equal(normalizeEthiopianPhone("+251912345678"), "+251912345678");
});

test("rejects malformed email addresses and accepts trimmed valid email", () => {
  for (const email of ["@example.com", "user@", "user@example", "user..name@example.com", "user name@example.com"]) {
    assert.equal(validateForm({ ...validForm, email }).email, "Enter a valid email address.");
  }
  assert.equal(validateForm({ ...validForm, email: "  user@example.com " }).email, undefined);
});

test("rejects missing required fields and accepts optional address details", () => {
  const errors = validateForm({
    ...validForm,
    nationalId: "",
    firstName: "",
    gender: "",
    address: "",
    college: "",
    region: "",
    city: "",
    terms: false,
  });

  assert.equal(errors.nationalId, "National ID is required.");
  assert.equal(errors.firstName, "First name is required.");
  assert.ok(errors.gender);
  assert.equal(errors.address, "Home address is required.");
  assert.ok(errors.college);
  assert.ok(errors.terms);
  assert.equal(errors.region, undefined);
  assert.equal(errors.city, undefined);
});

test("rejects impossible and future dates", () => {
  const errors = validateForm({
    ...validForm,
    dateOfBirth: "2025-02-29",
    enrollmentDate: "2999-09-01",
  });

  assert.equal(errors.dateOfBirth, "Enter a valid date of birth.");
  assert.equal(errors.enrollmentDate, "Enrollment date cannot be in the future.");
});

test("preserves cross-field date and optional photo validation", () => {
  const errors = validateForm({
    ...validForm,
    dateOfBirth: validForm.enrollmentDate,
  }, "Choose a JPG, PNG, or WebP image.");

  assert.equal(errors.dateOfBirth, "Date of birth must be before the enrollment date.");
  assert.equal(errors.profilePhoto, "Choose a JPG, PNG, or WebP image.");
});

test("checks field-specific academic and region choices", () => {
  const errors = validateForm({
    ...validForm,
    department: "Made-up department",
    academicYear: "Year 9",
    semester: "Semester 4",
    region: "Made-up region",
  });

  assert.ok(errors.department);
  assert.ok(errors.academicYear);
  assert.ok(errors.semester);
  assert.ok(errors.region);
});
