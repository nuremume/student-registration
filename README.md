# Student Registration Form (React)

A responsive, frontend-only student registration form built with React, Vite, JavaScript, plain CSS, and Lucide icons.

## Features

- Personal, contact, academic, and guardian details
- Semantic labels and common HTML form attributes
- Controlled inputs using `useState`
- Touched-field real-time and blur validation, accessible field-level messages, valid/invalid feedback, and first-invalid-field focus
- Unicode-aware name validation with letters, spaces, hyphens, and apostrophes
- Fayda ID validation for exactly 12-digit FIN or 16-digit FAN; pasted overlength values are rejected, not truncated
- Ethiopian phone validation for local `09`/`07` and international `+2519`/`+2517` formats
- Email structure, field-specific selection, address-length, and date validation
- Department-dependent course dropdown
- Optional profile photo preview (JPG, PNG, WebP; max 2 MB)
- Review-before-submit step and unique demo registration reference
- Printable confirmation and searchable, temporary demo student records
- Reset and record deletion with confirmation
- Responsive layout for desktop, tablet, and mobile
- No backend, server storage, database, or API connection

## Requirements

- Node.js 20.19+ or 22.12+ recommended for current Vite
- npm

Check your versions:

```bash
node --version
npm --version
```

## Run on Fedora / Linux

Extract the ZIP, open a terminal in the project folder, then run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

## Run tests

```bash
npm test
```

## Project structure

```text
student-registration/
├── index.html
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── validation.js
    └── validation.test.js
```

## Important notes

- This is a learning/demo project. Confirming a registration creates a record held in React memory for the current page only.
- Student information is not sent to a university or server and is not saved in localStorage or a database. Refreshing or closing the page clears demo records.
- Frontend validation improves usability but is not a substitute for server-side validation in a real system.
- Fayda ID checks validate format only; this project has no backend and cannot verify identity authenticity.
- The page loads Google Fonts from the internet; system fallback fonts are used if unavailable.

## Main form attributes demonstrated

`id`, `name`, `type`, `value`, `placeholder`, `required`, `minLength`, `maxLength`, `max`, `autoComplete`, `accept`, `checked`, and `disabled`.
