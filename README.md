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

## Recent API Implementations & Changes

### 1. Dynamic Environment & API Routing
- **Local Dev vs Production:**
  - `VITE_DEV_API_TARGET`: Configurable development backend proxy target (`http://localhost:5001`).
  - `VITE_API_URL`: Production backend endpoint (`https://server-16pz.onrender.com`).
  - `VITE_APP_URL`: Client application URL (`http://localhost:5174` locally).
  - Vite dev server automatically proxies `/api` requests to `VITE_DEV_API_TARGET` in development.

### 2. Patient Appointment & Referral Data Integration
- **Endpoint:** `GET /api/v1/appointments/patient`
- **Hook:** `usePatientAppointments()` (`src/services/userService.ts`)
- **Key Enhancements:**
  - **Clinical Referrals:** Full extraction of `bookedByClinician`, `clinician` object (Doctor name, email, phone, clinician ID), and `notes`.
  - **Clinical Notes & Scans:** Displays diagnostic scan types, clinical instructions, and automatically flags urgency (`Priority: Urgent`).
  - **Patient Visit History:** Tracks `visitedBefore` (`Returning Patient` vs `First-Time Patient`) and `identificationNumber` (Hospital / National ID).
  - **Booking Target:** Differentiates `Self` (`Myself`) from third-party bookings (`Someone else`).

### 3. Appointment Payment Integration (Direct & Paystack)

#### Option 1: Direct Payment Confirmation
For direct card settlement, testing, or clinician-initiated payments:
- **Endpoint:** `PUT /api/v1/appointments/:appointmentId/confirm-payment`
- **Alias Endpoint:** `POST /api/v1/payments/confirm-appointment`
- **Hook:** `useConfirmAppointmentPayment()` (`src/services/providerService.ts`)
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>` (optional/public)
- **Request Body:**
  ```json
  {
    "paymentMethod": "Card Payment",
    "reference": "REF-PAY-1789419999",
    "amount": 32500
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Payment successfully confirmed! Appointment is now confirmed and paid for.",
    "data": {
      "appointment": {
        "id": "00bYJ5_vwx",
        "status": "confirmed",
        "isPaid": true,
        "payment": {
          "status": "completed",
          "amount": 32500,
          "method": "Card Payment",
          "paidAt": "2026-09-14T22:00:00.000Z"
        }
      }
    }
  }
  ```

#### Option 2: Paystack Checkout Initialization
For online gateway checkouts via Paystack popup/redirect:
- **Endpoint:** `POST /api/v1/payments/initialize`
- **Hook:** `useInitializePayment()` (`src/services/providerService.ts`)
- **Request Body:**
  ```json
  {
    "appointmentId": "00bYJ5_vwx",
    "amount": 32500,
    "email": "patient@example.com",
    "callback_url": "http://localhost:5174/booking-history"
  }
  ```
- **Callback & Return Handling:**
  - The payment gateway redirects to `${window.location.origin}/booking-history?reference=...&trxref=...`.
  - The booking page listens for return parameters, invalidates the `patientAppointments` cache, refetches latest records, displays a success toast, and clears query params from the browser history cleanly.

### 4. Dynamic Fee Calculation & Status Evaluation
- **Fee Extractor (`getAppointmentAmount`):** Reads exact fee dynamically from `payment.amount`, `amount`, `service.price`, `totalAmount`, or `formData.amount` without relying on hardcoded defaults.
- **Payment Status Resolver (`getPaymentInfo`):** Evaluates appointment state into four distinct statuses: `paid`, `pending`, `unpaid`, and `failed`.

### 5. Chronological Ordering (Latest Appointment First)
- **Default Sort Order:** Sorted by latest appointment descending (`date` with `desc`).
- **Timestamp Engine (`getAppointmentDateScore`):**
  - First evaluates booking creation timestamps (`createdAt`, `created_at`, `bookingDate`) to ensure newly booked appointments are always at the top.
  - Correctly evaluates scheduled appointment `date` + `start_time` (e.g. `10:30 AM`) so appointments are chronologically ordered.

---

## Documentation Links

- [Client API Integration Manual (`CLIENT_API_DOCUMENTATION.md`)](./CLIENT_API_DOCUMENTATION.md)
- [Patient Settings API Guide (`PATIENT_SETTINGS_API_DOCS.md`)](./PATIENT_SETTINGS_API_DOCS.md)
- [Test Results Summary (`TEST_RESULTS_SUMMARY.md`)](./TEST_RESULTS_SUMMARY.md)

