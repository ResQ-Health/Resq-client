# ResQ Client Web Application - Complete API Integration Journal & Reference

This document serves as the authoritative, end-to-end API documentation for the **ResQ Client Frontend Web Application** (`Resq-client`). It details how the client application interacts with the backend server, including Axios configuration, request/response interceptors, React Query hooks, TypeScript interfaces, local caching strategies, and UI page consumption.

---

## Table of Contents
1. [Client API Architecture & HTTP Client](#1-client-api-architecture--http-client)
2. [Global State & Authentication Context](#2-global-state--authentication-context)
3. [Central API Endpoint Registry (`API_ENDPOINTS`)](#3-central-api-endpoint-registry-api_endpoints)
4. [Services & React Query Hooks Reference](#4-services--react-query-hooks-reference)
   - [4.1 Authentication Service (`authService.ts`)](#41-authentication-service-authservicets)
   - [4.2 Patient & User Profile Service (`userService.ts`)](#42-patient--user-profile-service-userservicets)
   - [4.3 Provider Management Service (`providerService.ts`)](#43-provider-management-service-providerservicets)
   - [4.4 Payment Methods Service (`paymentService.ts`)](#44-payment-methods-service-paymentservicets)
5. [UI Component & Page Integration Matrix](#5-ui-component--page-integration-matrix)
6. [Error Handling & Cache Management Strategies](#6-error-handling--cache-management-strategies)

---

## 1. Client API Architecture & HTTP Client

### Base Configuration (`src/config/api.ts`)
The application uses **Axios** as its primary HTTP client.

```typescript
export const API_BASE_URL = import.meta.env.DEV 
  ? '' // Proxy handled by Vite dev server
  : 'https://server-16pz.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10s request timeout
});
```

### Request Interceptor
- Automatically retrieves `authToken` from `localStorage`.
- Injects `Authorization: Bearer <token>` into the request headers.
- Redacts sensitive auth tokens in development console logs.

### Response Interceptor
- Intercepts `401 Unauthorized` responses.
- Automatically clears `authToken` and redirects user to login (`/`), **except** when executing authentication endpoints (`/auth/login`, `/auth/register`, `/auth/provider/login`, `/providers/register`) or public appointment booking (`/appointments/book`).

---

## 2. Global State & Authentication Context

### AuthContext (`src/contexts/AuthContext.tsx`)
Manages global user session state and `localStorage` persistence.

- **State Variables:**
  - `user`: Currently authenticated user object (Patient or Provider).
  - `token`: Active JWT authorization token string.
  - `isAuthenticated`: Boolean (`!!token && !!user`).
  - `loading`: Application initialization state.
- **Methods:**
  - `login(token, user)`: Sets token and user state, normalizes onboarding flags (`is_onboarding_complete`), and stores in `localStorage`.
  - `logout()`: Clears React Query cache via `queryClient.clear()` and wipes user tokens, draft bookings, and cached profiles from `localStorage`.
  - `updateUser(userData)`: Merges partial profile updates into active user state and `localStorage`.

---

## 3. Central API Endpoint Registry (`API_ENDPOINTS`)

All endpoints used in the frontend are centrally mapped in `src/config/api.ts`:

### Shared / Common Endpoints (`API_ENDPOINTS.COMMON`)
- `AUTH.VERIFY_OTP`: `/api/v1/auth/verify-otp`
- `AUTH.RESEND_OTP`: `/api/v1/auth/resend-otp`
- `AUTH.FORGOT_PASSWORD`: `/api/v1/auth/forgot-password`
- `AUTH.RESET_PASSWORD`: `/api/v1/auth/reset-password`
- `AUTH.CHANGE_PASSWORD`: `/api/v1/auth/change-password`
- `AUTH.LOGOUT`: `/api/v1/auth/logout`
- `AUTH.ME`: `/api/v1/auth/me`
- `AUTH.OAUTH_LOGIN`: `/api/v1/auth/oauth/login`
- `LOCATIONS.COUNTRIES`: `/api/v1/locations/countries`
- `LOCATIONS.STATES`: `/api/v1/locations/states`

### Patient Endpoints (`API_ENDPOINTS.PATIENT`)
- `AUTH.REGISTER`: `/api/v1/auth/register`
- `AUTH.LOGIN`: `/api/v1/auth/login`
- `APPOINTMENTS.GET_ALL`: `/api/v1/appointments/patient`
- `APPOINTMENTS.BOOK`: `/api/v1/appointments/book`
- `APPOINTMENTS.DELETE(id)`: `/api/v1/appointments/${id}`
- `PROVIDERS.GET_ALL`: `/api/v1/providers/all`
- `PROVIDERS.REPORTS.CREATE(providerId)`: `/api/v1/providers/${providerId}/reports`
- `PAYMENTS.INITIALIZE`: `/api/v1/payments/initialize`
- `PAYMENTS.RECEIPT(id)`: `/api/v1/payments/receipt/${id}`
- `PAYMENTS.SEND_RECEIPT`: `/api/v1/payments/receipt/send`
- `PAYMENTS.METHODS.GET_ALL`: `/api/v1/payments/methods`
- `PAYMENTS.METHODS.INITIALIZE`: `/api/v1/payments/methods/initialize`
- `PAYMENTS.METHODS.VERIFY`: `/api/v1/payments/methods/verify`
- `REVIEWS.CREATE`: `/api/v1/reviews`
- `REVIEWS.LIKE(id)`: `/api/v1/reviews/${id}/like`
- `REVIEWS.SAVE(id)`: `/api/v1/reviews/${id}/save`
- `FAVORITES.TOGGLE`: `/api/v1/auth/favorites/providers/toggle`
- `FAVORITES.STATUS(id)`: `/api/v1/auth/favorites/providers/${id}/status`

### Provider Endpoints (`API_ENDPOINTS.PROVIDER`)
- `AUTH.REGISTER`: `/api/v1/providers/register`
- `AUTH.LOGIN`: `/api/v1/auth/provider/login`
- `DASHBOARD.STATS`: `/api/v1/providers/me/dashboard-stats`
- `PROFILE.ME`: `/api/v1/providers/profile/me`
- `PROFILE.PROFILE_PICTURE`: `/api/v1/providers/me/profile-picture`
- `PROFILE.WORKING_HOURS`: `/api/v1/providers/me/working-hours`
- `PROFILE.NOTIFICATION_SETTINGS`: `/api/v1/providers/me/notification-settings`
- `PROFILE.COMPLETE_ONBOARDING`: `/api/v1/providers/onboard/complete`
- `PROFILE.AUTO_CONFIRM`: `/api/v1/providers/me/auto-confirm`
- `ADDRESS.UPDATE`: `/api/v1/providers/me/address`
- `REQUEST_TO_BOOK`: `/api/v1/providers/me/request-to-book`
- `APPOINTMENTS.GET_ALL`: `/api/v1/providers/appointments`
- `APPOINTMENTS.GET_PENDING`: `/api/v1/providers/appointments/pending`
- `APPOINTMENTS.UPDATE_STATUS(id)`: `/api/v1/appointments/${id}/confirm`
- `APPOINTMENTS.ACCEPT_ALL`: `/api/v1/providers/appointments/pending/accept-all`
- `APPOINTMENTS.REJECT_ALL`: `/api/v1/providers/appointments/pending/reject-all`
- `PATIENTS.GET_ALL`: `/api/v1/providers/patients`
- `PATIENTS.CREATE`: `/api/v1/providers/patients`
- `SERVICES.GET_ALL`: `/api/v1/providers/services`
- `SERVICES.CREATE`: `/api/v1/providers/services`
- `SERVICES.UPDATE(id)`: `/api/v1/providers/services/${id}`
- `SERVICES.DELETE(id)`: `/api/v1/providers/services/${id}`
- `PAYMENTS.GET_BANKS`: `/api/v1/providers/banks`
- `PAYMENTS.VERIFY_ACCOUNT`: `/api/v1/providers/bank-account/verify`
- `PAYMENTS.SAVE_ACCOUNT`: `/api/v1/providers/bank-account`
- `PAYMENTS.TRANSACTIONS`: `/api/v1/providers/me/transactions`
- `REPORTS.GET_ALL`: `/api/v1/providers/me/reports`
- `REVIEWS.GET_ALL`: `/api/v1/providers/me/reviews`
- `SUPPORT.TICKETS`: `/api/v1/providers/me/support/tickets`
- `SUPPORT.TICKET(ticketId)`: `/api/v1/providers/me/support/tickets/${ticketId}`
- `SUPPORT.MESSAGES(ticketId)`: `/api/v1/providers/me/support/tickets/${ticketId}/messages`

---

## 4. Services & React Query Hooks Reference

---

### 4.1 Authentication Service (`authService.ts`)

#### `registerUser(data: RegisterRequest)`
- **Hook:** `useRegister()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/register`
- **Payload:** `{ full_name, email, password, phone_number, user_type: "Patient" | "Provider" }`
- **Side Effects:** Stores token in `localStorage`, invalidates `['user']` query, triggers toast notification.

#### `loginUser(data: LoginRequest)`
- **Hook:** `useLogin()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/login`
- **Payload:** `{ email, password }`
- **Side Effects:** Stores token & user data in `localStorage`, invalidates `['user']` query.

#### `verifyOTP(data: VerifyOTPRequest)`
- **Hook:** `useVerifyOTP()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/verify-otp`
- **Payload:** `{ email, otp }`

#### `resendOTP(data: ResendOTPRequest)`
- **Hook:** `useResendOTP()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/resend-otp`
- **Payload:** `{ email }`

#### `forgotPassword(data: ForgotPasswordRequest)`
- **Hook:** `useForgotPassword()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/forgot-password`
- **Payload:** `{ email }`

#### `resetPassword(data: ResetPasswordRequest)`
- **Hook:** `useResetPassword()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/reset-password`
- **Payload:** `{ token, newPassword }`

#### `changePassword(data: ChangePasswordRequest)`
- **Hook:** `useChangePassword()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/change-password`
- **Payload:** `{ oldPassword?, newPassword }`

#### `oauthLogin(data: OAuthLoginRequest)`
- **Hook:** `useOAuthLogin()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/oauth/login`
- **Payload:** `{ idToken, provider: "google" | "facebook" | "apple", email?, name?, photoURL?, phoneNumber? }`

#### `getUserProfile()`
- **Hook:** `useGetUserProfile()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/auth/me` or `/api/v1/providers/profile/me` depending on user type stored in `localStorage`.
- **Query Key:** `['userProfile']` (stale time: 5 minutes).

#### `deleteAccount()`
- **Hook:** `useDeleteAccount()`
- **HTTP Method:** `DELETE`
- **Endpoint:** `/api/v1/auth/me`
- **Side Effects:** Wipes `localStorage` and redirects to `/`.

---

### 4.2 Patient & User Profile Service (`userService.ts`)

#### `getPatientProfile()`
- **Hook:** `usePatientProfile()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/auth/me`
- **Cache Strategy:** Reads from `localStorage.getItem('patientProfile')` for immediate load; fetches network update if cache absent.
- **Query Key:** `['patientProfile']`

#### `updatePatientProfile(data: PatientProfileRequest)`
- **Hook:** `useUpdatePatientProfile()`
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/v1/auth/me`
- **Payload:** `{ personal_details, contact_details, location_details, metadata }`
- **Side Effects:** Performs optimistic updates on React Query cache and `localStorage`. Restores previous snapshot on network failure.

#### `uploadProfilePicture(file: File)`
- **Hook:** `useUploadProfilePicture()`
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/v1/auth/me`
- **Header:** `Content-Type: multipart/form-data`
- **Form Data Field:** `profile_picture`

#### `toggleFavoriteProvider(providerId: string)`
- **Hook:** `useToggleFavoriteProvider()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/auth/favorites/providers/toggle`
- **Payload:** `{ provider_id: providerId }`
- **Side Effects:** Invalidates `['favoriteStatus']`, `['patientProfile']`, `['favorites']`.

#### `checkFavoriteStatus(providerId: string)`
- **Hook:** `useFavoriteStatus(providerId)`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/auth/favorites/providers/${providerId}/status`

#### `getPatientAppointments()`
- **Hook:** `usePatientAppointments()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/appointments/patient`
- **Query Key:** `['patientAppointments']`

#### `deleteAppointment(appointmentId: string)`
- **Hook:** `useDeleteAppointment()`
- **HTTP Method:** `DELETE`
- **Endpoint:** `/api/v1/appointments/${appointmentId}`

---

### 4.3 Provider Management Service (`providerService.ts`)

#### `fetchProviderDashboardStats()`
- **Hook:** `useProviderDashboardStats()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/providers/me/dashboard-stats`
- **Query Key:** `['providerDashboardStats']`

#### `fetchAllProviders()`
- **Hook:** `useAllProviders()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/providers/all`
- **Query Key:** `['allProviders']`

#### `fetchProviderAvailability(providerId: string, date?: string)`
- **Hook:** `useProviderAvailability(providerId, date)`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/appointments/available-slots?providerId=${providerId}&date=${date}`
- **Query Key:** `['providerAvailability', providerId, date]`

#### `bookAppointment(payload: BookAppointmentRequest)`
- **Hook:** `useBookAppointment()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/appointments/book`
- **Payload:** `{ providerId, serviceId, appointmentDate, startTime, endTime, formData, notes }`

#### `initializePayment(payload: InitializePaymentRequest)`
- **Hook:** `useInitializePayment()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/payments/initialize`
- **Payload:** `{ appointmentId, amount?, email?, callback_url }`
- **Returns:** `{ authorization_url, reference, access_code }`

#### `confirmAppointmentPayment(payload: ConfirmAppointmentPaymentRequest)`
- **Hook:** `useConfirmAppointmentPayment()`
- **HTTP Method:** `PUT` (or `POST` for `/payments/confirm-appointment` alias)
- **Endpoint:** `/api/v1/appointments/${appointmentId}/confirm-payment`
- **Payload:** `{ appointmentId, paymentMethod, reference, amount }`
- **Cache Invalidation:** Invalidates `['patientAppointments']` query cache

#### `fetchPaymentReceipt(appointmentId: string)`
- **Hook:** `usePaymentReceipt(appointmentId)`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/payments/receipt/${appointmentId}`

#### `sendReceiptEmail(payload: SendReceiptRequest)`
- **Function:** `sendReceiptEmail(payload)`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/payments/receipt/send`

#### `fetchProviderAppointments(page = 1, limit = 100)`
- **Hook:** `useProviderAppointments(page, limit)`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/providers/appointments?page=${page}&limit=${limit}`

#### `updateAppointmentStatus(id: string, action: 'confirm' | 'reject')`
- **Hook:** `useUpdateAppointmentStatus()`
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/v1/appointments/${id}/confirm`

#### `fetchPendingAppointments()`
- **Hook:** `usePendingAppointments()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/providers/appointments/pending`

#### `bulkAcceptAppointments()` / `bulkRejectAppointments()`
- **Hooks:** `useBulkAcceptAppointments()`, `useBulkRejectAppointments()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/providers/appointments/pending/accept-all` / `reject-all`

#### `updateProviderFullProfile(formData: FormData)`
- **Hook:** `useUpdateProviderFullProfile()`
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/v1/providers/profile/me`
- **Header:** `Content-Type: multipart/form-data`
- **Form Data Fields:** `profile_picture`, `banner_image`, `logo`, `gallery`, `provider_name`, `about`, `address`, `social_links`, `accreditations`, `policy`.

#### Provider Support Tickets
- `fetchProviderSupportTickets` -> `GET /api/v1/providers/me/support/tickets` (`useProviderSupportTickets`)
- `fetchProviderSupportTicket` -> `GET /api/v1/providers/me/support/tickets/:ticketId` (`useProviderSupportTicket`)
- `createProviderSupportTicket` -> `POST /api/v1/providers/me/support/tickets` (`useCreateProviderSupportTicket`)
- `replyProviderSupportTicket` -> `POST /api/v1/providers/me/support/tickets/:ticketId/messages` (`useReplyProviderSupportTicket`)

#### Provider Patients & Catalog
- `fetchProviderPatients` -> `GET /api/v1/providers/patients`
- `addPatientManually` -> `POST /api/v1/providers/patients`
- `fetchProviderServices` -> `GET /api/v1/providers/services`
- `createProviderService` -> `POST /api/v1/providers/services`
- `updateProviderService` -> `PUT /api/v1/providers/services/:id`
- `deleteProviderService` -> `DELETE /api/v1/providers/services/:id`

#### Provider Payout Bank Accounts
- `fetchBanks` -> `GET /api/v1/providers/banks`
- `verifyBankAccount` -> `POST /api/v1/providers/bank-account/verify`
- `saveBankAccount` -> `PUT /api/v1/providers/bank-account`

---

### 4.4 Payment Methods Service (`paymentService.ts`)

#### `getPaymentMethods()`
- **Hook:** `usePaymentMethods()`
- **HTTP Method:** `GET`
- **Endpoint:** `/api/v1/payments/methods`
- **Query Key:** `['paymentMethods']` (stale time: 5 minutes).

#### `initializePaymentMethod(data: InitializePaymentMethodRequest)`
- **Hook:** `useInitializePaymentMethod()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/payments/methods/initialize`
- **Payload:** `{ payment_provider: "paystack" }`

#### `verifyPaymentMethod(data: VerifyPaymentMethodRequest)`
- **Hook:** `useVerifyPaymentMethod()`
- **HTTP Method:** `POST`
- **Endpoint:** `/api/v1/payments/methods/verify`
- **Payload:** `{ reference }`

---

## 5. UI Component & Page Integration Matrix

| UI Page / Component | Primary API Hooks & Services | Handled Actions & Features |
| :--- | :--- | :--- |
| `LoginPage.tsx` | `useLogin()`, `useOAuthLogin()` | Email/Password login, Google OAuth authentication, session storage initialization. |
| `RegisterPage.tsx` | `useRegister()`, `useOAuthLogin()` | Patient/Provider registration, triggering email verification OTP. |
| `PatientSettingsPage.tsx` | `usePatientProfile()`, `useUpdatePatientProfile()`, `useUploadProfilePicture()`, `usePaymentMethods()`, `useDeleteAccount()` | Profile update, avatar compression, notification settings, card tokenization setup, account deletion. |
| `BookingHistoryPage.tsx` | `usePatientAppointments()`, `useDeleteAppointment()`, `usePaymentReceipt()`, `sendReceiptEmail()` | Viewing appointment history, status filtering, downloading PDF receipts, emailing receipts. |
| `ProviderDashboard.tsx` | `useProviderDashboardStats()`, `useProviderAppointments()`, `usePendingAppointments()` | Real-time analytics, revenue metrics, accepting/rejecting appointment requests. |
| `ProviderCalendarPage.tsx` | `useProviderAppointments()`, `useUpdateAppointmentStatus()` | Calendar schedule display, slot management, status state updates. |
| `ProviderPatientsPage.tsx` | `fetchProviderPatients()`, `addPatientManually()` | Patient directory management, walk-in patient entry. |
| `SupportPage.tsx` | `useProviderSupportTickets()`, `useCreateProviderSupportTicket()`, `useReplyProviderSupportTicket()` | Helpdesk ticket creation with attachments, message thread replies. |
| `ProviderSettingsPage.tsx` | `useUpdateProviderFullProfile()`, `verifyBankAccount()`, `saveBankAccount()`, `useUpdateProviderRequestToBook()` | Multi-part clinic profile update, logo/banner uploads, bank account verification, request-to-book toggles. |

---

## 6. Error Handling & Cache Management Strategies

1. **React Query Optimistic Updates:**
   - Functions like `useUpdatePatientProfile` snapshot existing cache via `queryClient.getQueryData`, apply optimistic updates to the UI, and revert back upon network errors.
2. **Local Storage Synchronization:**
   - Profile data and authentication state are mirrored to `localStorage` (`authToken`, `user`, `patientProfile`). This allows instant UI rendering before background network revalidation completes.
3. **Global Toast Alerts:**
   - Errors and success states are reported via `react-hot-toast` with custom fallback messages for network timeouts (`ECONNABORTED`) or offline status (`ERR_NETWORK`).
