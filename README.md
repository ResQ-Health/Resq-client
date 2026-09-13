# RESQ Client Web Application

A modern React + TypeScript + Vite application for the RESQ Healthcare platform.

For complete API integration documentation, endpoints registry, and React Query hook references, see [**CLIENT_API_DOCUMENTATION.md**](./CLIENT_API_DOCUMENTATION.md).

---

## Technical Stack & Architecture

- **Core Framework:** React 18, TypeScript, Vite
- **Styling:** TailwindCSS, Lucide Icons, Framer Motion
- **State Management & Caching:** `@tanstack/react-query`, React Context (`AuthContext`, `FilterContext`, `ProviderSearchContext`), `localStorage` persistence
- **HTTP Client:** Axios with request/response interceptors (`src/config/api.ts`)
- **Authentication:** JWT Bearer tokens, Firebase OAuth 2.0 (Google, Facebook, Apple), OTP verification
- **Form & Validation:** Custom TypeScript types and forms

---

## API Architecture Overview

The client application connects to the ResQ Healthcare Backend Server via a structured service layer:

- **`src/config/api.ts`**: Central Axios configuration with `baseURL` (`https://server-16pz.onrender.com` in production or proxy in dev), authorization header injection, global `401 Unauthorized` token handling, and `API_ENDPOINTS` object mapping.
- **`src/services/authService.ts`**: Authentication services (register, login, verify OTP, forgot/reset password, OAuth, profile fetch, account deletion).
- **`src/services/userService.ts`**: Patient profile management, avatar uploads, favorite providers toggling, and appointment history.
- **`src/services/providerService.ts`**: Provider dashboard analytics, slot management, appointment confirmation/rejection, service catalog management, support tickets, bank payout account verification, and multi-part profile updates.
- **`src/services/paymentService.ts`**: Payment method tokenization, saved card management, Paystack checkout initialization, and receipt email delivery.

---

## Environment Setup

Create a `.env` file in the root directory with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Important Security Notes:**
- Never commit `.env` files to version control (enforced via `.gitignore`)
- Obtain credentials from the [Firebase Console](https://console.firebase.google.com/)
- All environment variables must be prefixed with `VITE_`

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:** (See above)

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## Documentation Links

- [Client API Integration Manual (`CLIENT_API_DOCUMENTATION.md`)](./CLIENT_API_DOCUMENTATION.md)
- [Patient Settings API Guide (`PATIENT_SETTINGS_API_DOCS.md`)](./PATIENT_SETTINGS_API_DOCS.md)
- [Test Results Summary (`TEST_RESULTS_SUMMARY.md`)](./TEST_RESULTS_SUMMARY.md)
