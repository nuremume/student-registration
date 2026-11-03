import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  ACADEMIC_YEARS,
  DEPARTMENTS_BY_COLLEGE,
  ETHIOPIAN_REGIONS,
  GENDERS,
  SEMESTERS,
  VALIDATION_ORDER,
  localDateValue,
  normalizeEmail,
  normalizeEthiopianPhone,
  normalizePersonName,
  validateForm,
} from "./validation.js";

const initialForm = {
  nationalId: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  nationality: "Ethiopian",
  email: "",
  phone: "",
  address: "",
  region: "",
  city: "",
  college: "",
  department: "",
  academicYear: "",
  semester: "",
  enrollmentDate: localDateValue(),
  guardianName: "",
  guardianPhone: "",
  terms: false,
};

function enhanceControls(children, descriptionIds, error, valid, onBlur) {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (typeof child.type === "string" && ["input", "select", "textarea"].includes(child.type)) {
      return cloneElement(child, {
        "aria-invalid": error ? "true" : valid ? "false" : undefined,
        "aria-describedby": descriptionIds || undefined,
        onBlur,
      });
    }
    if (child.props.children) {
      return cloneElement(child, {
        children: enhanceControls(child.props.children, descriptionIds, error, valid, onBlur),
      });
    }
    return child;
  });
}

function Field({
  label,
  name,
  required = false,
  hint,
  error,
  valid = false,
  onBlur,
  children,
  className = "",
}) {
  const hintId = hint ? `${name}-hint` : "";
  const errorId = error ? `${name}-error` : "";
  const descriptionIds = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <div className={`field ${valid ? "field-valid" : ""} ${className}`}>
      <label htmlFor={name}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {enhanceControls(children, descriptionIds, error, valid, onBlur)}
      {hint && <small id={hintId} className="hint">{hint}</small>}
      {error && <small id={errorId} className="error" role="status" aria-live="polite">{error}</small>}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="section-heading">
      <span className="section-icon"><Icon size={19} aria-hidden="true" /></span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function RegistrationDetails({ record, includeReference = false }) {
  const details = [
    ["Student name", record.fullName],
    ["Fayda ID", record.nationalId],
    ["Email", record.email],
    ["Phone", record.phone],
    ["Home address", [record.address, record.city, record.region].filter(Boolean).join(", ")],
    ["College", record.college],
    ["Department", record.department],
    ["Academic year", record.academicYear],
    ["Semester", record.semester],
    ["Enrollment date", record.enrollmentDate],
    ["Parent / guardian", record.guardianName],
    ["Guardian phone", record.guardianPhone],
  ];

  if (includeReference) details.unshift(["Demo reference", record.reference]);

  return (
    <dl className="summary-grid">
      {details.map(([label, value]) => (
        <div className="summary-item" key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}

function makeReference() {
  const randomPart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ETC-${new Date().getFullYear()}-${randomPart}`;
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [nationalIdPasteError, setNationalIdPasteError] = useState("");
  const [stage, setStage] = useState("form");
  const [submission, setSubmission] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteRecordsConfirm, setShowDeleteRecordsConfirm] = useState(false);
  const [attemptedReview, setAttemptedReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef(null);
  const submitLockRef = useRef(false);

  const departments = useMemo(
    () => DEPARTMENTS_BY_COLLEGE[form.college] || [],
    [form.college],
  );
  const today = localDateValue();
  const progressStep = stage === "form" ? 1 : stage === "review" ? 2 : 3;
  const progressLabel = stage === "records" ? "DEMO RECORDS" : `STEP ${progressStep} OF 3`;
  const progressWidth = stage === "records" ? "0%" : `${(progressStep / 3) * 100}%`;
  const filteredRecords = records.filter((record) => {
    const searchable = [
      record.reference,
      record.fullName,
      record.email,
      record.phone,
      record.college,
      record.department,
      record.academicYear,
      record.semester,
    ].join(" ").toLowerCase();
    return searchable.includes(recordSearch.trim().toLowerCase());
  });

  useEffect(() => {
    if (!photo?.preview) return undefined;
    return () => URL.revokeObjectURL(photo.preview);
  }, [photo]);

  function focusFirstInvalid(nextErrors) {
    const firstInvalid = VALIDATION_ORDER.find((key) => nextErrors[key]);
    if (!firstInvalid) return;

    requestAnimationFrame(() => {
      const field = document.getElementById(firstInvalid);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    const nextForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "college" ? { department: "" } : {}),
    };
    const nextPasteError = name === "nationalId" ? "" : nationalIdPasteError;
    if (name === "nationalId") setNationalIdPasteError("");
    setForm(nextForm);
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors(validateForm(nextForm, photoError, nextPasteError));
  }

  function handleNationalIdPaste(event) {
    const input = event.currentTarget;
    const pastedValue = event.clipboardData.getData("text");
    const start = input.selectionStart ?? form.nationalId.length;
    const end = input.selectionEnd ?? start;
    const resultingValue =
      form.nationalId.slice(0, start) + pastedValue + form.nationalId.slice(end);

    if (resultingValue.length <= 16) return;

    event.preventDefault();
    showNationalIdInputError(resultingValue);
  }

  function showNationalIdInputError(attemptedValue) {
    const message = validateForm({
      ...form,
      nationalId: attemptedValue,
    }).nationalId;
    setNationalIdPasteError(message);
    setTouched((current) => ({ ...current, nationalId: true }));
    setErrors(validateForm(form, photoError, message));
  }

  function handleNationalIdBeforeInput(event) {
    const inputEvent = event.nativeEvent;
    if (!inputEvent.inputType?.startsWith("insert") || !inputEvent.data) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? form.nationalId.length;
    const end = input.selectionEnd ?? start;
    const attemptedValue =
      form.nationalId.slice(0, start) + inputEvent.data + form.nationalId.slice(end);

    if (attemptedValue.length <= 16) return;
    event.preventDefault();
    showNationalIdInputError(attemptedValue);
  }

  function handleNationalIdKeyDown(event) {
    if (!/^[0-9]$/.test(event.key)) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? form.nationalId.length;
    const end = input.selectionEnd ?? start;
    const attemptedValue =
      form.nationalId.slice(0, start) + event.key + form.nationalId.slice(end);

    if (attemptedValue.length <= 16) return;
    event.preventDefault();
    showNationalIdInputError(attemptedValue);
  }

  function normalizeFieldOnBlur(name) {
    let normalizedValue = form[name];
    if (["firstName", "lastName", "guardianName"].includes(name)) {
      normalizedValue = normalizePersonName(normalizedValue);
    } else if (name === "email") {
      normalizedValue = normalizeEmail(normalizedValue);
    }

    const nextForm = normalizedValue === form[name]
      ? form
      : { ...form, [name]: normalizedValue };
    if (nextForm !== form) setForm(nextForm);
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors(validateForm(nextForm, photoError, nationalIdPasteError));
  }

  function fieldProps(name) {
    const shouldShowError = attemptedReview || touched[name];
    const error = shouldShowError ? errors[name] : "";
    const fieldValue = form[name];
    const hasValue = typeof fieldValue === "boolean"
      ? fieldValue
      : String(fieldValue ?? "").trim().length > 0;
    return {
      error,
      valid: shouldShowError && !error && hasValue,
      onBlur: () => normalizeFieldOnBlur(name),
    };
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    let message = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      message = "Choose a JPG, PNG, or WebP image.";
    } else if (file.size > 2 * 1024 * 1024) {
      message = "Image must be 2 MB or smaller.";
    }

    setPhotoError(message);
    if (message) {
      setPhoto(null);
      event.target.value = "";
    } else {
      setPhoto({ file, preview: URL.createObjectURL(file) });
    }
    if (attemptedReview) {
      setErrors(validateForm(form, message, nationalIdPasteError));
    } else {
      setErrors((current) => ({ ...current, profilePhoto: message }));
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
    setErrors((current) => ({ ...current, profilePhoto: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (stage !== "form") return;
    setAttemptedReview(true);
    const normalizedForm = {
      ...form,
      firstName: normalizePersonName(form.firstName),
      lastName: normalizePersonName(form.lastName),
      guardianName: normalizePersonName(form.guardianName),
      email: normalizeEmail(form.email),
    };
    setForm(normalizedForm);
    const nextErrors = validateForm(
      normalizedForm,
      photoError,
      nationalIdPasteError,
    );
    setErrors(nextErrors);
    setTouched(Object.fromEntries(VALIDATION_ORDER.map((key) => [key, true])));
    if (Object.keys(nextErrors).length) {
      focusFirstInvalid(nextErrors);
      return;
    }
    setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmRegistration() {
    if (submitLockRef.current || stage !== "review") return;
    const finalErrors = validateForm(form, photoError, nationalIdPasteError);
    if (Object.keys(finalErrors).length) {
      setErrors(finalErrors);
      setTouched(Object.fromEntries(VALIDATION_ORDER.map((key) => [key, true])));
      setAttemptedReview(true);
      setStage("form");
      focusFirstInvalid(finalErrors);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    const record = {
      reference: makeReference(),
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      nationalId: form.nationalId.trim(),
      email: form.email.trim(),
      phone: normalizeEthiopianPhone(form.phone),
      address: form.address.trim(),
      city: form.city.trim(),
      region: form.region,
      college: form.college,
      department: form.department,
      academicYear: form.academicYear,
      semester: form.semester,
      enrollmentDate: form.enrollmentDate,
      guardianName: form.guardianName.trim(),
      guardianPhone: normalizeEthiopianPhone(form.guardianPhone),
      createdAt: new Date().toISOString(),
    };
    setRecords((current) => [record, ...current]);
    setSubmission(record);
    setStage("confirmation");
    setIsSubmitting(false);
    submitLockRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...initialForm, enrollmentDate: localDateValue() });
    setErrors({});
    setTouched({});
    setPhoto(null);
    setPhotoError("");
    setNationalIdPasteError("");
    setAttemptedReview(false);
    setSubmission(null);
    setShowResetConfirm(false);
    setStage("form");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function startAnotherRegistration() {
    setStage("form");
    setShowResetConfirm(true);
  }

  function clearRecords() {
    setRecords([]);
    setShowDeleteRecordsConfirm(false);
  }

  const reviewRecord = submission || {
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    nationalId: form.nationalId,
    email: form.email,
    phone: form.phone,
    address: form.address,
    city: form.city,
    region: form.region,
    college: form.college,
    department: form.department,
    academicYear: form.academicYear,
    semester: form.semester,
    enrollmentDate: form.enrollmentDate,
    guardianName: form.guardianName,
    guardianPhone: form.guardianPhone,
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="EthioCampus registration home">
          <span className="brand-mark"><GraduationCap size={25} aria-hidden="true" /></span>
          <span><strong>EthioCampus</strong><small>STUDENT REGISTRATION</small></span>
        </a>
        <div className="topbar-right">
          <span className="ethiopia-label">ETHIOPIA <span aria-hidden="true">·</span> ኢትዮጵያ</span>
          <span className="topbar-divider" />
          <span className="help-label">University admissions</span>
        </div>
      </header>

      <main id="top" className="main-layout">
        <aside className="intro-panel">
          <div className="eyebrow"><Sparkles size={14} aria-hidden="true" /> ETHIOPIAN HIGHER EDUCATION</div>
          <h1>Your future starts here.</h1>
          <p className="intro-copy">Welcome to your student registration portal. Share your details and choose the academic program that will shape your next chapter.</p>
          <div className="progress-card">
            <div className="progress-top">
              <span>{stage === "records" ? "Student records" : "Student registration"}</span>
              <span className="step-label">{progressLabel}</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Registration progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stage === "records" ? 0 : Math.round((progressStep / 3) * 100)}
            >
              <span style={{ width: progressWidth }} />
            </div>
            <p>{stage === "records" ? "Search the demo registrations in this tab." : "Personal · contact · academic information"}</p>
          </div>
          <div className="benefit-list">
            <div><span className="benefit-icon"><ShieldCheck size={18} aria-hidden="true" /></span><span><strong>Made for Ethiopian students</strong><small>Local regions and +251 phone number examples.</small></span></div>
            <div><span className="benefit-icon"><ClipboardList size={18} aria-hidden="true" /></span><span><strong>Clear, guided registration</strong><small>Review your information before creating a demo record.</small></span></div>
            <div><span className="benefit-icon"><CheckCircle2 size={18} aria-hidden="true" /></span><span><strong>Your information stays private</strong><small>This frontend demo does not send data to a university or server.</small></span></div>
          </div>
          <div className="side-note"><span className="note-star" aria-hidden="true">✦</span><p><strong>ማስታወሻ · Please note</strong><br />Fields marked with an asterisk (*) are required.</p></div>
          <div className="registration-tools">
            <button type="button" className="records-link" onClick={() => setStage("records")}>
              <ClipboardList size={16} aria-hidden="true" />
              Demo records <span className="records-count">{records.length}</span>
            </button>
            {stage !== "form" && (
              <button type="button" className="records-link" onClick={() => setStage("form")}>
                <RotateCcw size={15} aria-hidden="true" /> Back to registration
              </button>
            )}
          </div>
        </aside>

        <section className="form-panel" aria-label="Student registration">
          <div className="form-header">
            <div>
              <div className="form-kicker">ETHIOPIAN UNIVERSITY ADMISSIONS</div>
              <h2 id={stage === "records" ? "records-title" : undefined}>
                {stage === "review" ? "Review your details" :
                  stage === "confirmation" ? "Registration confirmation" :
                    stage === "records" ? "Demo student records" : "Student registration"}
              </h2>
              <p>የተማሪ ምዝገባ <span aria-hidden="true">·</span> {stage === "records" ? "Search registrations created in this tab." : "Frontend demonstration only."}</p>
            </div>
            <div className="header-badge"><GraduationCap size={23} aria-hidden="true" /></div>
          </div>

          {stage === "form" && (
            <form onSubmit={handleSubmit} noValidate>
              <section className="form-section">
                <SectionHeading icon={UserRound} title="Personal information" subtitle="Tell us a little about yourself." />
                <div className="fields-grid">
                  <Field
                    label="Fayda ID number"
                    name="nationalId"
                    required
                    {...fieldProps("nationalId")}
                    hint={`${form.nationalId.length}/${form.nationalId.length > 12 ? 16 : 12} digits · FIN: 12 digits; FAN: 16 digits. Digits 0–9 only; format is checked, not authenticity.`}
                  >
                    <input
                      id="nationalId"
                      name="nationalId"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="12-digit FIN or 16-digit FAN"
                      value={form.nationalId}
                      onChange={updateField}
                      onPaste={handleNationalIdPaste}
                      onBeforeInput={handleNationalIdBeforeInput}
                      onKeyDown={handleNationalIdKeyDown}
                      maxLength={16}
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                  </Field>
                  <Field label="Nationality" name="nationality" {...fieldProps("nationality")} hint="Optional. Use letters and spaces.">
                    <input id="nationality" name="nationality" type="text" placeholder="e.g. Ethiopian" value={form.nationality} onChange={updateField} maxLength={60} autoComplete="country-name" />
                  </Field>
                  <Field label="First name" name="firstName" required {...fieldProps("firstName")} hint="Letters, spaces, hyphens, and apostrophes are accepted.">
                    <input id="firstName" name="firstName" type="text" placeholder="Enter first name" value={form.firstName} onChange={updateField} minLength={2} maxLength={50} autoComplete="given-name" required />
                  </Field>
                  <Field label="Last name" name="lastName" required {...fieldProps("lastName")} hint="Letters, spaces, hyphens, and apostrophes are accepted.">
                    <input id="lastName" name="lastName" type="text" placeholder="Enter last name" value={form.lastName} onChange={updateField} minLength={2} maxLength={50} autoComplete="family-name" required />
                  </Field>
                  <Field label="Date of birth" name="dateOfBirth" required {...fieldProps("dateOfBirth")}>
                    <input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateField} max={today} autoComplete="bday" required />
                  </Field>
                  <Field label="Gender" name="gender" required {...fieldProps("gender")}>
                    <select id="gender" name="gender" value={form.gender} onChange={updateField} required>
                      <option value="">Select gender</option>
                      {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="form-section">
                <SectionHeading icon={Mail} title="Contact information" subtitle="How can the university reach you?" />
                <div className="fields-grid">
                  <Field label="Email address" name="email" required {...fieldProps("email")}>
                    <div className="input-with-icon"><Mail size={17} aria-hidden="true" /><input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={updateField} autoComplete="email" maxLength={100} required /></div>
                  </Field>
                  <Field label="Phone number" name="phone" required {...fieldProps("phone")} hint="Use 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX, or +2517XXXXXXXX.">
                    <div className="input-with-icon"><Phone size={17} aria-hidden="true" /><input id="phone" name="phone" type="tel" inputMode="tel" placeholder="0912345678 or +251912345678" value={form.phone} onChange={updateField} autoComplete="tel" maxLength={13} required /></div>
                  </Field>
                  <Field label="Home address" name="address" required {...fieldProps("address")} hint={`${form.address.length}/180 characters`} className="full-width">
                    <textarea id="address" name="address" rows="2" placeholder="Street, neighborhood, or local area" value={form.address} onChange={updateField} maxLength={180} autoComplete="street-address" required />
                  </Field>
                  <Field label="City / town" name="city" {...fieldProps("city")}>
                    <div className="input-with-icon"><MapPin size={17} aria-hidden="true" /><input id="city" name="city" type="text" placeholder="e.g. Addis Ababa" value={form.city} onChange={updateField} maxLength={80} autoComplete="address-level2" /></div>
                  </Field>
                  <Field label="Region / city administration" name="region" {...fieldProps("region")}>
                    <select id="region" name="region" value={form.region} onChange={updateField}>
                      <option value="">Select region (optional)</option>
                      {ETHIOPIAN_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="form-section">
                <SectionHeading icon={BookOpen} title="Academic information" subtitle="Select your college and department." />
                <div className="fields-grid">
                  <Field label="College" name="college" required {...fieldProps("college")}>
                    <select id="college" name="college" value={form.college} onChange={updateField} required>
                      <option value="">Select college</option>
                      {Object.keys(DEPARTMENTS_BY_COLLEGE).map((college) => <option key={college} value={college}>{college}</option>)}
                    </select>
                  </Field>
                  <Field label="Department" name="department" required {...fieldProps("department")}>
                    <select id="department" name="department" value={form.department} onChange={updateField} disabled={!form.college} required>
                      <option value="">{form.college ? "Select department" : "Choose college first"}</option>
                      {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                    </select>
                  </Field>
                  <Field label="Academic year" name="academicYear" required {...fieldProps("academicYear")}>
                    <select id="academicYear" name="academicYear" value={form.academicYear} onChange={updateField} required>
                      <option value="">Select academic year</option>
                      {ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </Field>
                  <Field label="Semester" name="semester" required {...fieldProps("semester")}>
                    <select id="semester" name="semester" value={form.semester} onChange={updateField} required>
                      <option value="">Select semester</option>
                      {SEMESTERS.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                    </select>
                  </Field>
                  <Field label="Enrollment date" name="enrollmentDate" required {...fieldProps("enrollmentDate")}>
                    <div className="input-with-icon"><CalendarDays size={17} aria-hidden="true" /><input id="enrollmentDate" name="enrollmentDate" type="date" value={form.enrollmentDate} onChange={updateField} max={today} required /></div>
                  </Field>
                </div>
              </section>

              <section className="form-section">
                <SectionHeading icon={Phone} title="Parent / guardian" subtitle="Provide an emergency contact person." />
                <div className="fields-grid">
                  <Field label="Guardian full name" name="guardianName" required {...fieldProps("guardianName")} hint="Letters, spaces, hyphens, and apostrophes are accepted.">
                    <input id="guardianName" name="guardianName" type="text" placeholder="Enter guardian's full name" value={form.guardianName} onChange={updateField} minLength={2} maxLength={100} required />
                  </Field>
                  <Field label="Guardian phone number" name="guardianPhone" required {...fieldProps("guardianPhone")} hint="Use 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX, or +2517XXXXXXXX.">
                    <input id="guardianPhone" name="guardianPhone" type="tel" inputMode="tel" placeholder="0912345678 or +251912345678" value={form.guardianPhone} onChange={updateField} maxLength={13} required />
                  </Field>
                </div>
              </section>

              <section className="form-section photo-section">
                <SectionHeading icon={Upload} title="Profile photo" subtitle="Optional. Add a clear recent photo." />
                <div className="upload-row">
                  <div className="avatar-preview">{photo ? <img src={photo.preview} alt="Selected profile preview" /> : <UserRound size={30} aria-hidden="true" />}</div>
                  <div className="upload-info">
                    <strong>{photo ? photo.file.name : "Upload your photo"}</strong>
                    <small>JPG, PNG or WebP · Maximum 2 MB</small>
                    <input
                      className="visually-hidden"
                      id="profilePhoto"
                      name="profilePhoto"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhoto}
                      ref={photoInputRef}
                      aria-invalid={errors.profilePhoto ? "true" : undefined}
                      aria-describedby={errors.profilePhoto ? "profilePhoto-error" : undefined}
                    />
                    <label className="upload-button" htmlFor="profilePhoto"><Upload size={15} aria-hidden="true" /> Choose file</label>
                    {errors.profilePhoto && <small id="profilePhoto-error" className="error" role="alert">{errors.profilePhoto}</small>}
                  </div>
                  {photo && <button type="button" className="remove-photo" onClick={removePhoto} aria-label="Remove profile photo"><X size={17} /></button>}
                </div>
              </section>

              <div className={`terms-row ${fieldProps("terms").error ? "terms-error" : ""}`}>
                <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={updateField} onBlur={() => normalizeFieldOnBlur("terms")} required aria-invalid={fieldProps("terms").error ? "true" : fieldProps("terms").valid ? "false" : undefined} aria-describedby={fieldProps("terms").error ? "terms-error" : undefined} />
                <label htmlFor="terms">I confirm that the information provided is accurate and agree to the registration terms.</label>
              </div>
              {fieldProps("terms").error && <small id="terms-error" className="error terms-message" role="status" aria-live="polite">{fieldProps("terms").error}</small>}

              <div className="form-actions">
                <button type="button" className="button button-outline" onClick={() => setShowResetConfirm(true)}><RotateCcw size={17} aria-hidden="true" /> Reset form</button>
                <button type="submit" className="button button-primary">Submit registration <span aria-hidden="true">→</span></button>
              </div>
            </form>
          )}

          {stage === "review" && (
            <div className="stage-content" aria-labelledby="review-title">
              <div className="stage-message">
                <CheckCircle2 size={21} aria-hidden="true" />
                <p id="review-title">Please check these details before creating your frontend demo registration.</p>
              </div>
              <RegistrationDetails record={reviewRecord} />
              <p className="demo-disclaimer">Confirming creates a temporary demo record in this browser tab only. Nothing is sent to a university or server.</p>
              <div className="form-actions stage-actions">
                <button type="button" className="button button-outline" onClick={() => setStage("form")}><RotateCcw size={16} aria-hidden="true" /> Edit details</button>
                <button type="button" className="button button-primary" onClick={confirmRegistration} disabled={isSubmitting}>
                  {isSubmitting ? "Creating demo record…" : "Confirm demo registration"}
                </button>
              </div>
            </div>
          )}

          {stage === "confirmation" && submission && (
            <div className="stage-content confirmation-content" aria-labelledby="confirmation-title">
              <div className="confirmation-mark"><CheckCircle2 size={32} aria-hidden="true" /></div>
              <h3 id="confirmation-title">Demo registration created</h3>
              <p className="confirmation-intro">Your details passed validation and are available in the demo records for this browser tab.</p>
              <RegistrationDetails record={submission} includeReference />
              <p className="demo-disclaimer">This is not a university submission. Your demo record is held in temporary page memory and disappears when this page is refreshed or closed.</p>
              <div className="form-actions stage-actions confirmation-actions">
                <button type="button" className="button button-outline" onClick={() => setStage("form")}><RotateCcw size={16} aria-hidden="true" /> Edit details</button>
                <button type="button" className="button button-outline" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print confirmation</button>
                <button type="button" className="button button-primary" onClick={startAnotherRegistration}>Register another student</button>
              </div>
            </div>
          )}

          {stage === "records" && (
            <div className="stage-content records-content" aria-labelledby="records-title">
              <div className="records-toolbar">
                <label htmlFor="record-search">Search by name, reference, email, or program</label>
                <div className="input-with-icon">
                  <Search size={17} aria-hidden="true" />
                  <input id="record-search" type="search" value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="Search demo records" />
                </div>
                {records.length > 0 && (
                  <button type="button" className="button button-outline clear-records-button" onClick={() => setShowDeleteRecordsConfirm(true)}>
                    <Trash2 size={16} aria-hidden="true" /> Clear demo records
                  </button>
                )}
              </div>
              {filteredRecords.length ? (
                <div className="record-list">
                  {filteredRecords.map((record) => (
                    <article className="record-card" key={record.reference}>
                      <div className="record-card-heading">
                        <div>
                          <h3>{record.fullName}</h3>
                          <p>{record.reference}</p>
                        </div>
                        <span className="record-badge">DEMO</span>
                      </div>
                      <RegistrationDetails record={record} />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <ClipboardList size={26} aria-hidden="true" />
                  <h3>{records.length ? "No matching records" : "No demo records yet"}</h3>
                  <p>{records.length ? "Try another name, reference number, email, or program." : "Complete a registration to see its temporary demo record here."}</p>
                  {records.length === 0 && <button type="button" className="button button-primary" onClick={() => setStage("form")}>Start registration</button>}
                </div>
              )}
            </div>
          )}

          {showResetConfirm && (
            <div className="confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
              <div>
                <strong id="reset-title">Clear all form fields?</strong>
                <p id="reset-description">This will remove the information you entered.</p>
              </div>
              <button type="button" className="button button-quiet" onClick={() => setShowResetConfirm(false)}>Keep editing</button>
              <button type="button" className="button button-primary" onClick={resetForm}>Clear form</button>
            </div>
          )}
          {showDeleteRecordsConfirm && (
            <div className="confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-records-title">
              <div>
                <strong id="delete-records-title">Delete all demo records?</strong>
                <p>This only clears temporary records held in this tab.</p>
              </div>
              <button type="button" className="button button-quiet" onClick={() => setShowDeleteRecordsConfirm(false)}>Keep records</button>
              <button type="button" className="button button-primary" onClick={clearRecords}>Delete records</button>
            </div>
          )}

          <p className="privacy-note"><ShieldCheck size={14} aria-hidden="true" /> Demo only: details stay in temporary page memory, are not sent to a server, and disappear when this page is refreshed.</p>
        </section>
      </main>
      <footer className="footer"><span>© {new Date().getFullYear()} EthioCampus Student Portal</span><span>Built for Ethiopian students · Frontend demo</span></footer>
    </div>
  );
}
