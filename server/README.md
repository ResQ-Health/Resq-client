# ResQ Healthcare API - Complete Server & Data Architecture Reference Journal

Welcome to the ultimate technical reference journal for the **ResQ Healthcare Backend Server**. This document provides an exhaustive, production-grade manual covering:
1. **API Endpoints Directory** (Request/Response schemas, headers, authentication levels, parameters, status codes).
2. **Database Models & Schemas Reference Directory** (All Mongoose models, data types, sub-documents, validations, indexes, virtuals, and hooks).

---

## Table of Contents
1. [System & Architecture Overview](#system--architecture-overview)
2. [Global Headers & Authentication](#global-headers--authentication)
3. [Standard API Response Formats](#standard-api-response-formats)
4. [Database Models & Schemas Reference Directory](#database-models--schemas-reference-directory)
   - [Model 1: User (`User.js`)](#model-1-user-userjs)
   - [Model 2: Provider (`Provider.js`)](#model-2-provider-providerjs)
   - [Model 3: Appointment (`Appointment.js`)](#model-3-appointment-appointmentjs)
   - [Model 4: Service (`Service.js`)](#model-4-service-servicejs)
   - [Model 5: Review (`Review.js`)](#model-5-review-reviewjs)
   - [Model 6: SupportTicket (`SupportTicket.js`)](#model-6-supportticket-supportticketjs)
   - [Model 7: PendingRegistration (`PendingRegistration.js`)](#model-7-pendingregistration-pendingregistrationjs)
   - [Model 8: OTP (`OTP.js`)](#model-8-otp-otpjs)
   - [Model 9: PasswordResetToken (`PasswordResetToken.js`)](#model-9-passwordresettoken-passwordresettokenjs)
   - [Model 10: TimeSlot (`TimeSlot.js`)](#model-10-timeslot-timeslotjs)
   - [Model 11: ProviderReport (`ProviderReport.js`)](#model-11-providerreport-providerreportjs)
5. [API Endpoints Directory](#api-endpoints-directory)
   - [1. System & Health Check Endpoints](#1-system--health-check-endpoints)
   - [2. Authentication & Patient User Management](#2-authentication--patient-user-management)
   - [3. Provider \& Clinician Management](#3-provider--clinician-management)
   - [4. Provider Administrator Routes](#4-provider-administrator-routes)
   - [5. Clinician Booking on Behalf of Patient](#5-appointment--calendar-management)
   - [5. Appointment & Calendar Management](#5-appointment--calendar-management)
   - [6. Healthcare Services Catalog](#6-healthcare-services-catalog)
   - [7. Payment & Paystack Gateway Integration](#7-payment--paystack-gateway-integration)
   - [8. Provider Ratings & Review System](#8-provider-ratings--review-system)
   - [9. Promotional Offers & Email Marketing](#9-promotional-offers--email-marketing)
   - [10. Location & Geographic Data](#10-location--geographic-data)
6. [Environment Variables Reference](#environment-variables-reference)

---

## System & Architecture Overview

- **Base URL:** `http://localhost:3000/api/v1` (Default local port `3000`)
- **Technology Stack:** Node.js, Express.js, MongoDB (Mongoose ODM), Redis Caching, Paystack Payment Gateway, Firebase Admin SDK (Push Notifications), Nodemailer (Email Delivery), Multer & Cloudinary (File Uploads & Image Compression), Zod (Data Validation).

---

## Global Headers & Authentication

### Authentication Types:
- **Public:** No authentication required.
- **Protected (Bearer Token):** Requires JWT token passed in header.
- **Patient Only:** Requires JWT token of user with `user_type: "Patient"`.
- **Provider Only:** Requires JWT token of user with `user_type: "Clinician"` or `"DiagnosticProvider"`.
- **Clinician Only:** Requires JWT token of user with `user_type: "Clinician"` (or admin). Used for clinical booking flows.
- **Admin Only:** Requires JWT token of user with `is_admin: true`.
- **Optional Auth:** Attaches user context to `req.user` if valid token is provided; otherwise runs as guest.

### Header Specification:
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```
*Note: The server also supports `x-access-token: <YOUR_JWT_TOKEN>` as a fallback authorization header.*

---

## Standard API Response Formats

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (`400 Bad Request` / `401 Unauthorized` / `403 Forbidden` / `404 Not Found` / `500 Server Error`)
```json
{
  "success": false,
  "message": "Error description message",
  "errors": [ ... ]
}
```

---

## Database Models & Schemas Reference Directory

---

### Model 1: User (`User.js`)
- **Collection Name:** `users`
- **Description:** Stores account profiles for Patients, Clinicians, Diagnostic Providers, and Admins. Supports native credentials, bcrypt password hashing, and OAuth 2.0 social logins.

#### Main Schema Fields
| Field Name | Data Type | Required | Default | Validation / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique, Primary Key | Unique 10-char custom string identifier. |
| `full_name` | String | Yes | None | Trimmed | User's full name. |
| `email` | String | Yes | None | Unique, Lowercase, Trimmed | Primary contact email address. |
| `phone_number` | String | No | None | Trimmed, Unique (Patients only) | Primary phone number. |
| `user_type` | String | Yes | None | Enum: `['Patient', 'Clinician', 'DiagnosticProvider']` | Role of the user account. |
| `is_admin` | Boolean | No | `false` | None | Indicates if user has platform admin rights. |
| `email_verified` | Boolean | No | `false` | None | Set to `true` after verifying OTP. |
| `password` | String | No | None | Min length 6 | Bcrypt hashed password (optional for OAuth users). |
| `oauth_provider` | String | No | `null` | Enum: `['google', 'facebook', 'apple']` | Social login provider. |
| `oauth_id` | String | No | `null` | Sparse index | External provider user ID. |
| `oauth_metadata` | Object | No | `{}` | Sub-object | Stores provider user details, photo URL, last login date. |
| `profile_picture` | Object | No | `{ url: '' }` | Sub-object | Cloudinary image URL object. |
| `personal_details` | Object | No | `{}` | Sub-object | `first_name`, `last_name`, `date_of_birth`, `gender`. |
| `contact_details` | Object | No | `{}` | Sub-object | `email_address`, `phone_number`. |
| `location_details` | Object | No | `{}` | Sub-object | `address`, `city`, `state`. |
| `metadata` | Object | No | `{}` | Sub-object | Emergency contact, next of kin, notification toggles. |
| `payment_methods` | Array | No | `[]` | Sub-document array | Saved tokenized Paystack card authorizations. |
| `favorite_providers` | Array | No | `[]` | ObjectIds referencing `Provider` | List of favorited provider IDs. |
| `reviews` | Array | No | `[]` | Sub-document array | Log of reviews submitted by this user. |
| `created_at` / `updated_at` | Date | Auto | `Date.now` | Timestamps | Document creation & modification times. |

#### Sub-Documents & Embedded Schemas
1. **`oauth_metadata`**:
   - `provider_user_id`: String
   - `provider_email`: String
   - `provider_name`: String
   - `provider_photo`: String
   - `last_oauth_login`: Date
   - `oauth_account_created`: Date
2. **`metadata.emergency_contact` & `metadata.next_of_kin`**:
   - `first_name`: String, `last_name`: String, `phone_number`: String, `relationship_to_you`: String
3. **`payment_methods` (Saved Cards)**:
   - `id`: String (required), `type`: String (`card`), `provider`: String (`paystack`), `last4`: String, `brand`: String, `expiry_month`: Number, `expiry_year`: Number, `authorization_code`: String, `bank`: String, `account_name`: String, `is_default`: Boolean.

#### Indexes & Middleware Hooks
- **Indexes:**
  - `{ phone_number: 1 }` (Partial unique index for `user_type: "Patient"`).
  - `{ user_type: 1, email: 1 }` (Compound index for authentication lookups).
- **Hooks:**
  - `pre('save')`: Hashes `password` using `bcrypt.genSalt(10)` if modified and not already hashed.
- **Instance Methods:**
  - `matchPassword(enteredPassword)`: Compares candidate password against hashed password.

---

### Model 2: Provider (`Provider.js`)
- **Collection Name:** `providers`
- **Description:** Healthcare provider clinic/specialist profile containing operating hours, bank settlement account, administrative authorization, gallery images, auto-confirm settings, and review metrics.

#### Main Schema Fields
| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique, Primary Key | Custom provider identifier. |
| `user_id` | String | Yes | None | Unique | User ID of provider owner/account holder. |
| `provider_name` | String | Yes | None | Trimmed | Practice/clinic/provider commercial name. |
| `work_email` | String | Yes | None | Lowercase, Trimmed | Professional email address. |
| `work_phone` | String | Yes | None | Trimmed | Official contact phone number. |
| `services` | Array | No | `[]` | String IDs | Array of Service IDs offered by this provider. |
| `address` | Object | No | `{}` | Sub-object | `street`, `city`, `state`, `country`, `postal_code`. |
| `working_hours` | Array | No | `[]` | `workingHoursSchema` | Weekly availability timetable per day. |
| `administrativedetails` | Object | No | None | `administrativeDetailsSchema` | License info, admin user credentials, permission level. |
| `bank_details` | Object | No | `{}` | `bankDetailsSchema` | Verified bank account details for Paystack payouts. |
| `profile_complete` | Boolean | No | `false` | None | Indicates if provider completed onboarding. |
| `fcm_token` | String | No | `""` | None | Firebase FCM token for mobile push notifications. |
| `notification_settings`| Object | No | `{}` | `notificationSettingsSchema` | Toggles for email, push, and SMS alerts. |
| `about` | String | No | None | Trimmed | Clinic bio, overview, and specialization. |
| `banner_image_url` | String | No | None | Trimmed | Hero banner image URL. |
| `logo_image_url` | String | No | `""` | Trimmed | Clinic logo image URL. |
| `gallery_image_urls` | Array | No | `[]` | Array of Strings | Cloudinary gallery photo URLs. |
| `social_links` | Object | No | `{}` | Sub-object | `website`, `facebook`, `instagram`, `twitter`. |
| `accreditations` | Array | No | `[]` | Sub-object array | `name`, `issuing_body`, `year`. |
| `policy` | String | No | `""` | Trimmed | Clinic cancellation & booking policies. |
| `auto_confirm_appointments` | Boolean | No | `true` | None | Auto-confirms new bookings when enabled. |
| `request_to_book` | Boolean | No | `false` | None | Requires manual approval if true. |
| `ratings` | Object | No | `{ average: 0, count: 0 }` | Sub-object | Aggregate rating average and total review count. |
| `reviews` | Array | No | `[]` | Sub-document array | Array of user reviews and comments. |

#### Sub-Schemas
1. **`workingHoursSchema`**:
   - `day`: Enum `['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']`
   - `isAvailable`: Boolean (default `false`), `startTime`: String (`"09:00"`), `endTime`: String (`"17:00"`).
2. **`administrativeDetailsSchema`**:
   - `fullname`: String, `email`: String, `phone`: String, `permissionLevel`: Enum `['Admin', 'Staff']` (default `'Staff'`), `password`: String (hashed), `image`: String.
3. **`bankDetailsSchema`**:
   - `bank_name`: String, `account_number`: String, `account_name`: String, `bank_code`: String, `is_verified`: Boolean (default `false`).

---

### Model 3: Appointment (`Appointment.js`)
- **Collection Name:** `appointments`
- **Description:** Stores appointment booking records, patient questionnaire data, time slots, payment transaction references, and status states.

#### Main Schema Fields
| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique, Primary Key | Unique appointment ID. |
| `patient_id` | String | Yes | None | Index | ID of patient who booked appointment. |
| `provider_id` | String | Yes | None | Index | ID of provider fulfilling appointment. |
| `time_slot_id` | String | No | None | Index | Associated time slot ID (if applicable). |
| `service_id` | String | No | None | Index | ID of service booked. |
| `formData` | Object | No | None | `formDataSchema` | Patient questionnaire responses. |
| `payment` | Object | No | `{}` | `paymentSchema` | Embedded Paystack payment status & reference. |
| `appointment_date` | Date | Yes | None | Index | Scheduled appointment date. |
| `start_time` | String | Yes | None | Format `HH:mm` | Appointment start time. |
| `end_time` | String | Yes | None | Format `HH:mm` | Appointment end time. |
| `status` | String | No | `'pending'` | Enum: `['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'rejected']` | Booking lifecycle status. |
| `review` | Object | No | None | Sub-object | `rating` (1-5), `comment`, `reviewDate`. |
| `notes` | String | No | None | Trimmed | General notes or special instructions. |

#### Sub-Schemas & Virtuals
1. **`formDataSchema`**:
   - `forWhom`: Enum `['Self', 'Other']` (required)
   - `visitedBefore`: Boolean (required)
   - `communicationPreference`: Enum `['Booker', 'Patient', 'Both']` (default `'Booker'`)
   - `identificationNumber`, `comments`, `patientName`, `patientEmail`, `patientPhone`, `patientAddress`, `patientGender`, `patientDOB`.
2. **`paymentSchema`**:
   - `status`: Enum `['pending', 'completed', 'failed']` (default `'pending'`)
   - `method`: String, `paystackReference`: String, `amount`: Number, `paidAt`: Date.
3. **Compound Indexes**:
   - `{ patient_id: 1, appointment_date: 1 }`
   - `{ provider_id: 1, appointment_date: 1 }`
   - `{ service_id: 1, status: 1 }`
   - `{ provider_id: 1, start_time: 1, end_time: 1, appointment_date: 1 }`
4. **Virtual Populate Fields**:
   - `patient`: Populates `User` model matching `patient_id`.
   - `service`: Populates `Service` model matching `service_id`.

---

### Model 4: Service (`Service.js`)
- **Collection Name:** `services`
- **Description:** Catalog of medical services, scans, diagnostic tests, and consultations.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique, Primary Key | Unique service identifier. |
| `provider_id` | String | Yes | None | Index | ID of provider offering service. |
| `category` | String | Yes | None | Enum: `['scans', 'tests', 'consultation']`, Index | Category of medical service. |
| `name` | String | Yes | None | Unique, Trimmed | Display name of service. |
| `description` | String | Yes | None | Trimmed | Full description of service procedures. |
| `uses` | String | No | None | Trimmed | Medical applications / indications. |
| `price` | Number | Yes | None | Min `0` | Cost of service in NGN. |
| `duration` | Number | No | `0` | Min `0` | Estimated duration in minutes. |
| `metadata` | Mixed | No | `{}` | Mixed Object | Custom metadata properties. |

- **Indexes:** `{ category: 1, name: 1 }`

---

### Model 5: Review (`Review.js`)
- **Collection Name:** `reviews`
- **Description:** Patient ratings, feedback comments, likes, and saved reviews.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique | Unique review ID. |
| `patient_id` | String | Yes | None | Index | ID of patient writing review. |
| `provider_id` | String | Yes | None | Index | ID of provider being reviewed. |
| `rating` | Number | Yes | None | Min `1`, Max `5` | Star rating score. |
| `comment` | String | No | `""` | Trimmed | Feedback text body. |
| `likes` | Array | No | `[]` | Array of patient IDs | Patients who liked this review. |
| `saved_by` | Array | No | `[]` | Array of patient IDs | Patients who saved/bookmarked this review. |

---

### Model 6: SupportTicket (`SupportTicket.js`)
- **Collection Name:** `supporttickets`
- **Description:** Provider helpdesk support tickets and message thread conversations.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique | Ticket unique ID. |
| `provider_id` | String | Yes | None | Index | ID of provider opening ticket. |
| `provider_user_id` | String | Yes | None | Index | Provider user ID. |
| `category` | String | No | `'Other'` | Enum: `['Payments', 'Appointments', 'Profile & verification', 'Services', 'Technical issue', 'Other']` | Issue category. |
| `subject` | String | Yes | None | Maxlength `200` | Ticket title. |
| `status` | String | No | `'open'` | Enum: `['open', 'in_progress', 'resolved', 'closed']` | Support resolution status. |
| `messages` | Array | No | `[]` | Array of `ticketMessageSchema` | Thread of messages between provider and support. |

- **`ticketMessageSchema`**: `id`: String (`nanoid`), `sender_role`: Enum `['provider', 'support']`, `sender_id`: String, `message`: String (max 5000 chars), `attachments`: Array of URL strings, `created_at`: Date.
- **Indexes:** `{ provider_id: 1, updated_at: -1 }`, `{ provider_id: 1, status: 1, updated_at: -1 }`.

---

### Model 7: PendingRegistration (`PendingRegistration.js`)
- **Collection Name:** `pendingregistrations`
- **Description:** Temporary staging store holding user registration data prior to OTP email verification.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique | Pending record ID. |
| `email` | String | Yes | None | Unique, Lowercase | User email. |
| `full_name` | String | Yes | None | Trimmed | User full name. |
| `password` | String | Yes | None | Plain/pre-hashed | Registration password. |
| `phone_number` | String | No | `""` | Trimmed | Phone number. |
| `user_type` | String | Yes | None | Enum: `['Patient', 'Clinician', 'DiagnosticProvider']` | Account type. |
| `is_admin` | Boolean | No | `false` | None | Admin flag. |
| `metadata` | Mixed | No | `{}` | Mixed | Additional signup metadata. |
| `provider_name` | String | No | None | Trimmed | Provider company name (if diagnostic). |
| `work_email` / `work_phone` | String | No | None | Trimmed | Provider contact details. |
| `createdAt` | Date | Auto | `Date.now` | **TTL Index: 3600s (1 hour)** | Automatically deleted after 1 hour if not verified. |

---

### Model 8: OTP (`OTP.js`)
- **Collection Name:** `otps`
- **Description:** Stores 6-digit One Time Passwords for email verification and auth challenges.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | String | No | None | String ID | Target user ID (optional). |
| `pending_registration_id` | String | No | None | String ID | Associated pending registration ID. |
| `email` | String | Yes | None | Lowercase, Trimmed | Recipient email. |
| `otp` | String | Yes | None | 6-digit string | The generated OTP code. |
| `createdAt` | Date | Auto | `Date.now` | **TTL Index: 3600s (1 hour)** | Automatically expires after 1 hour. |

---

### Model 9: PasswordResetToken (`PasswordResetToken.js`)
- **Collection Name:** `passwordresettokens`
- **Description:** Secure tokens generated for password reset links.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | String | Yes | None | Index | Target user ID. |
| `email` | String | Yes | None | Lowercase, Index | User email address. |
| `token` | String | Yes | `nanoid(32)` | Unique | 32-character secure token string. |
| `used` | Boolean | No | `false` | None | True if token was already redeemed. |
| `createdAt` | Date | Auto | `Date.now` | **TTL Index: 3600s (1 hour)** | Automatically expires after 1 hour. |

---

### Model 10: TimeSlot (`TimeSlot.js`)
- **Collection Name:** `timeslots`
- **Description:** Concrete provider time slot instances generated for specific calendar days.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique | Slot ID. |
| `provider_id` | String | Yes | None | Index | Provider ID. |
| `date` | Date | Yes | None | Index | Slot calendar date. |
| `start_time` | String | Yes | None | Format `HH:mm` | Start time. |
| `end_time` | String | Yes | None | Format `HH:mm` | End time. |
| `is_available` | Boolean | No | `true` | Index | Availability flag (`false` once booked). |

- **Compound Index:** `{ provider_id: 1, date: 1, is_available: 1 }`

---

### Model 11: ProviderReport (`ProviderReport.js`)
- **Collection Name:** `providerreports`
- **Description:** Incident reports filed by patients against healthcare providers.

| Field Name | Data Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | String | Yes | `nanoid(10)` | Unique | Report ID. |
| `provider_id` | String | Yes | None | Index | ID of reported provider. |
| `patient_id` | String | Yes | None | Index | ID of reporting patient. |
| `category` | String | No | `'Other'` | Enum: `['Service quality', 'Fraud/Scam', 'Abuse/Harassment', 'No show', 'Other']` | Category of report. |
| `message` | String | Yes | None | Trimmed, Max 2000 chars | Report details text. |
| `anonymous` | Boolean | No | `false` | None | Hides patient identity if true. |
| `status` | String | No | `'open'` | Enum: `['open', 'reviewing', 'resolved']`, Index | Investigation status. |

- **Compound Indexes:** `{ provider_id: 1, created_at: -1 }`, `{ provider_id: 1, status: 1, created_at: -1 }`, `{ patient_id: 1, provider_id: 1, created_at: -1 }`.

---

## API Endpoints Directory

---

### 1. System & Health Check Endpoints

#### `GET /`
- **Access Level:** Public
- **Description:** Server welcome endpoint and API documentation index.
- **Request Parameters:** None
- **Success Response (200 OK):**
```json
{
  "message": "Welcome to the Simple Node.js API",
  "documentation": "/api-docs",
  "version": "1.0.0",
  "environment": "development"
}
```

#### `GET /api/test`
- **Access Level:** Public
- **Description:** General health check endpoint.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "API is working correctly",
  "timestamp": "2026-09-13T17:30:00.000Z"
}
```

---

### 2. Authentication & Patient User Management
*Base Path: `/api/v1/auth`*

#### `GET /api/v1/auth/test`
- **Access Level:** Public
- **Description:** Test endpoint for authentication routes.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Auth routes working"
}
```

#### `POST /api/v1/auth/register`
- **Access Level:** Public
- **Description:** Register a new user account (Patient, Clinician, or DiagnosticProvider). Generates an OTP for email verification.
- **Headers:** `Content-Type: application/json`
- **Request Body Schema:**
```json
{
  "full_name": "John Doe",
  "email": "patient@example.com",
  "password": "password123",
  "phone_number": "+2348012345678",
  "user_type": "Patient",
  "metadata": {
    "preferences": {
      "notifications": true
    }
  }
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. Verification code sent to email.",
  "data": {
    "id": "usr_987654321",
    "full_name": "John Doe",
    "email": "patient@example.com",
    "phone_number": "+2348012345678",
    "user_type": "Patient",
    "email_verified": false,
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

#### `POST /api/v1/auth/login`
- **Access Level:** Public
- **Description:** Authenticate user credentials and return JWT token.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "password123"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "usr_987654321",
    "full_name": "John Doe",
    "email": "patient@example.com",
    "user_type": "Patient",
    "email_verified": true,
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

#### `POST /api/v1/auth/provider/login`
- **Access Level:** Public
- **Description:** Specific login route for Provider accounts (`Clinician` / `DiagnosticProvider`).
- **Request Body:** `{ "email": "provider@clinic.com", "password": "securepassword" }`

#### `POST /api/v1/auth/oauth/login`
- **Access Level:** Public
- **Description:** Authenticate or auto-register user using Social OAuth (Google, Facebook, Apple) ID token.
- **Request Body:**
```json
{
  "idToken": "firebase_or_google_id_token_string",
  "provider": "google",
  "email": "user@gmail.com",
  "name": "Jane Doe",
  "photoURL": "https://lh3.googleusercontent.com/a/...",
  "phoneNumber": "+2348000000000"
}
```

#### `POST /api/v1/auth/verify-otp`
- **Access Level:** Public
- **Description:** Verify 6-digit OTP sent to user's email address.
- **Request Body:** `{ "email": "patient@example.com", "otp": "123456" }`

#### `POST /api/v1/auth/resend-otp`
- **Access Level:** Public
- **Description:** Resend a new OTP verification code to user email.

#### `POST /api/v1/auth/forgot-password`
- **Access Level:** Public
- **Description:** Trigger password reset email containing reset token or OTP.

#### `POST /api/v1/auth/reset-password`
- **Access Level:** Public
- **Description:** Reset account password using token/OTP received via email.
- **Request Body:** `{ "token": "reset_token_string", "newPassword": "newPassword123" }`

#### `POST /api/v1/auth/change-password`
- **Access Level:** Patient Only
- **Description:** Change password for currently logged-in patient.
- **Request Body:** `{ "currentPassword": "oldPassword123", "newPassword": "newPassword123" }`

#### `GET /api/v1/auth/` or `GET /api/v1/auth/me`
- **Access Level:** Patient Only
- **Description:** Fetch logged-in user profile, onboarding completion status, and list of favorite provider IDs.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_987654321",
    "full_name": "John Doe",
    "email": "patient@example.com",
    "phone_number": "+2348012345678",
    "user_type": "Patient",
    "profile_picture": "https://res.cloudinary.com/...",
    "favorite_providers": ["prov_123"],
    "onboarding_status": {
      "completed": true,
      "missing_sections": []
    }
  }
}
```

#### `PUT /api/v1/auth/me`
- **Access Level:** Patient Only
- **Description:** Update user profile details and optionally upload avatar (`profile_picture`).
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data` or `application/json`

#### `DELETE /api/v1/auth/me`
- **Access Level:** Patient Only
- **Description:** Delete authenticated user account.

#### `PUT /api/v1/auth/assign-admin` & `PUT /api/v1/auth/remove-admin`
- **Access Level:** Admin Only
- **Description:** Grant or revoke administrator privileges for a user ID.

#### `GET /api/v1/auth/users`
- **Access Level:** Admin Only
- **Description:** List all registered users in database.

#### `POST /api/v1/auth/favorites/providers/toggle`
- **Access Level:** Patient Only
- **Description:** Toggle (add/remove) a provider in patient's favorite list.
- **Request Body:** `{ "providerId": "prov_123" }`

#### `GET /api/v1/auth/favorites/providers`
- **Access Level:** Patient Only
- **Description:** Retrieve full profile objects of all providers favorited by patient.

#### `GET /api/v1/auth/favorites/providers/:providerId/status`
- **Access Level:** Patient Only
- **Description:** Check if a specific provider is in patient's favorite list.

#### `POST /api/v1/auth/logout`
- **Access Level:** Protected
- **Description:** Invalidate user token / logout.

---

### 3. Provider \& Clinician Management
*Base Path: `/api/v1/providers`*

#### `GET /api/v1/providers/all`
- **Access Level:** Public (Supports Optional Auth)
- **Description:** Query and list all registered healthcare providers with search and filtering.
- **Query Parameters:** `search`, `category`, `service_id`, `city`, `state`, `rating`, `sort`.

#### `POST /api/v1/providers/:providerId/reports`
- **Access Level:** Patient Only
- **Description:** Submit a report against a provider for misconduct, fraudulent charges, or service issues.
- **Request Body:** `{ "reason": "Unprofessional behavior", "details": "Provider was absent." }`

#### `POST /api/v1/providers/register`
- **Access Level:** Public
- **Description:** Direct registration route for Diagnostic Providers.

#### `GET /api/v1/providers/profile/me`
- **Access Level:** Provider Only
- **Description:** Get complete provider profile including onboarding status, media gallery, operating schedule, and services.

#### `PUT /api/v1/providers/profile/me`
- **Access Level:** Provider Only
- **Description:** Comprehensive update of provider profile metadata, social links, logo, banner, and gallery images.
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

#### `POST /api/v1/providers/me/support/tickets`
- **Access Level:** Provider Only
- **Description:** Create a provider support ticket with file attachments.

#### `GET /api/v1/providers/me/support/tickets` & `GET /api/v1/providers/me/support/tickets/:ticketId`
- **Access Level:** Provider Only
- **Description:** List provider support tickets and read conversation message threads.

#### `POST /api/v1/providers/me/support/tickets/:ticketId/messages`
- **Access Level:** Provider Only
- **Description:** Reply to an open support ticket.

#### `GET /api/v1/providers/me/transactions`
- **Access Level:** Provider Only
- **Description:** Fetch transaction history, appointment earnings, platform fee deductions, and payout status.

#### `GET /api/v1/providers/me/dashboard-stats`
- **Access Level:** Provider Only
- **Description:** Retrieve provider analytics (Total Appointments, Pending Requests, Completed Sessions, Total Revenue, Unique Patients Count).

#### `GET /api/v1/providers/me/working-hours` & `PUT /api/v1/providers/me/working-hours`
- **Access Level:** Provider Only
- **Description:** Read or set operating schedule per weekday (Monday - Sunday) with opening/closing time ranges and slot durations.

#### `POST /api/v1/providers/bank-account/verify`
- **Access Level:** Provider Only
- **Description:** Verify bank account number with Paystack Bank Resolution API.
- **Request Body:** `{ "account_number": "0123456789", "bank_code": "058" }`

#### `PUT /api/v1/providers/bank-account`
- **Access Level:** Provider Only
- **Description:** Save verified bank details for payout settlements.

---

### 4. Provider Administrator Routes
*Base Path: `/api/v1/providers/admin`*

#### `POST /api/v1/providers/admin/register`
- **Access Level:** Public
- **Description:** Register an administrative user for a specific provider account.
- **Request Body:** `{ "providerId": "prov_123", "fullname": "Admin Jane", "email": "admin@clinic.com", "phone": "+2348022223333", "password": "adminpassword123", "permissionLevel": "superadmin" }`

#### `POST /api/v1/providers/admin/login`
- **Access Level:** Public
- **Description:** Login for provider administrator.

---

### 5. Appointment \& Calendar Management
*Base Path: `/api/v1/appointments`*

#### Quick Route Reference

| Full Route | Method | Middleware | Controller |
| :--- | :--- | :--- | :--- |
| `/api/v1/appointments/available-dates` | `GET` | `protect` | `getAvailableDates` |
| `/api/v1/appointments/available-slots` | `GET` | `protect` | `getAvailableSlots` |
| `/api/v1/appointments/services` | `GET` | Public | `getAllServices` |
| `/api/v1/appointments/book` | `POST` | `optionalAuth` | `bookAppointment` |
| `/api/v1/appointments/clinician/book` | `POST` | `protect` + `clinicianOnly` | `bookAppointmentByClinician` |
| `/api/v1/appointments/clinician-book` | `POST` | `protect` + `clinicianOnly` | `bookAppointmentByClinician` _(alias)_ |
| `/api/v1/appointments/clinician` | `GET` | `protect` + `clinicianOnly` | `getClinicianAppointments` |
| `/api/v1/appointments/patient` | `GET` | `protect` + `patientOnly` | `getPatientAppointments` |
| `/api/v1/appointments/provider` | `GET` | `protect` + `providerOnly` | `getProviderAppointments` |
| `/api/v1/appointments/:appointmentId/confirm` | `PUT` | `protect` + `providerOnly` | `confirmAppointment` |
| `/api/v1/appointments/:appointmentId/auto-confirm` | `PUT` | Public (system) | `autoConfirmAppointment` |
| `/api/v1/appointments/:appointmentId/cancel` | `PUT` | `protect` + `patientOrClinician` | `cancelAppointment` |
| `/api/v1/appointments/:appointmentId` | `DELETE` | `protect` + `patientOrClinician` | `deleteAppointment` |

---

#### `GET /api/v1/appointments/available-dates`
- **Access Level:** Protected
- **Description:** Fetch dates containing available time slots for a specified provider.

#### `GET /api/v1/appointments/available-slots`
- **Access Level:** Protected
- **Description:** Fetch open time slots for a provider on a specific date.

#### `POST /api/v1/appointments/book`
- **Access Level:** Optional Auth (Guest \& Registered Patients / Clinicians)
- **Description:** Book an appointment with a healthcare provider. When called by a logged-in `Clinician`, the request must include a `patientId` or `patientEmail` to book on behalf of a patient. The appointment is saved under the patient's account and appears on the patient's dashboard automatically.
- **Request Body:**
```json
{
  "providerId": "prov_123",
  "serviceId": "srv_789",
  "date": "2026-10-15",
  "start_time": "9:00 AM",
  "end_time": "9:30 AM",
  "patientId": "usr_patient_abc",
  "formData": {
    "forWhom": "Other",
    "visitedBefore": false,
    "patientName": "John Doe",
    "patientEmail": "patient@example.com",
    "patientPhone": "+2348012345678",
    "comments": "Referred by clinic.",
    "communicationPreference": "Both"
  },
  "notes": "Clinician referral"
}
```

---

#### `POST /api/v1/appointments/clinician/book` _(Clinician Only)_
#### `POST /api/v1/appointments/clinician-book` _(Alias)_
- **Access Level:** Clinician Only (`protect` + `clinicianOnly`)
- **Description:** Dedicated endpoint for a clinician to book an appointment **on behalf of a patient**. Resolves the patient by `patientId` or `patientEmail`. If no patient account exists for the given email, a new patient account is automatically created. The appointment is stored under the patient's ID and **immediately visible on the patient's appointment dashboard** (`GET /api/v1/appointments/patient`). A booking confirmation email is sent to the patient and a pending notification is sent to the provider — all in the background without blocking the response.
- **Headers:** `Authorization: Bearer <CLINICIAN_JWT>`
- **Request Body:**
```json
{
  "providerId": "prov_123",
  "serviceId": "srv_789",
  "date": "2026-10-15",
  "start_time": "9:00 AM",
  "end_time": "9:30 AM",
  "patientId": "usr_patient_abc",
  "patientEmail": "patient@example.com",
  "patientName": "Jane Patient",
  "patientPhone": "+2348000000000",
  "patientAddress": "12 Main Street, Lagos",
  "patientGender": "Female",
  "patientDOB": "1990-05-20",
  "notes": "Referred for ultrasound scan.",
  "formData": {
    "visitedBefore": false,
    "communicationPreference": "Both",
    "comments": "Patient has no prior records at this facility."
  }
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Appointment successfully booked for patient by clinician",
  "data": {
    "appointment": { "id": "apt_xyz", "status": "pending", "..." : "..." },
    "patient": { "id": "usr_patient_abc", "name": "Jane Patient", "email": "patient@example.com" },
    "clinician": { "id": "usr_clin_123", "name": "Dr. Smith", "email": "dr.smith@clinic.com" },
    "provider": { "id": "prov_123", "name": "ResQ Diagnostics" },
    "service": { "id": "srv_789", "name": "Ultrasound Scan", "price": 25000 }
  }
}
```

> **Patient Visibility:** The booked appointment appears immediately under `GET /api/v1/appointments/patient` for the patient. The `formData.bookedByClinician: true` flag and `formData.clinicianName` field are stored so the frontend can display a *"Booked by your clinician"* label.

> **Notifications fired (background, non-blocking):**
> - 📧 **Patient** receives a booking confirmation email via `sendBookingConfirmationToPatient`.
> - 🔔 **Provider** receives a new pending appointment notification via `sendPendingAppointmentNotification`.

---

#### `GET /api/v1/appointments/clinician`
- **Access Level:** Clinician Only
- **Description:** Fetch all appointments the clinician has booked (for any patient). Returns patient details, provider name, service info, and appointment status.

---

#### `GET /api/v1/appointments/patient`
- **Access Level:** Patient Only
- **Description:** Fetch all appointments for the logged-in patient — including those booked by a clinician on their behalf. Appointments booked by a clinician include `formData.bookedByClinician: true` and `formData.clinicianName`.

#### `GET /api/v1/appointments/provider`
- **Access Level:** Provider Only
- **Description:** Fetch appointment history for the logged-in provider.

#### `PUT /api/v1/appointments/:appointmentId/confirm`
- **Access Level:** Provider Only
- **Description:** Accept or reject a pending appointment.

#### `PUT /api/v1/appointments/:appointmentId/cancel`
- **Access Level:** Patient Only or Clinician
- **Description:** Cancel a booked appointment.

#### `DELETE /api/v1/appointments/:appointmentId`
- **Access Level:** Patient Only or Clinician
- **Description:** Soft-delete an appointment record (sets `is_deleted: true`).

---

### 6. Healthcare Services Catalog
*Base Path: `/api/v1/services`*

#### `GET /api/v1/services`
- **Access Level:** Public
- **Description:** Get all available services in platform catalog.

#### `GET /api/v1/services/category/:category`
- **Access Level:** Public
- **Description:** Filter services by category (`scans`, `tests`, `consultation`).

#### `GET /api/v1/services/provider/:providerId`
- **Access Level:** Public
- **Description:** Retrieve all services offered by a specific healthcare provider.

#### `POST /api/v1/services`
- **Access Level:** Provider Only
- **Description:** Create a new service entry.
- **Request Body:** `{ "category": "scans", "name": "Chest X-Ray", "description": "High resolution chest scan", "price": 12000, "duration": 30 }`

---

### 7. Payment & Paystack Gateway Integration
*Base Path: `/api/v1/payments`*

#### `POST /api/v1/payments/initialize`
- **Access Level:** Public / Patient
- **Description:** Initialize Paystack transaction for an appointment. Includes duplicate payment prevention.
- **Request Body:** `{ "appointmentId": "apt_102030", "callback_url": "http://localhost:3000/payment-complete" }`

#### `GET /api/v1/payments/verify/:reference`
- **Access Level:** Patient Only
- **Description:** Verify Paystack payment reference status and mark appointment as paid.

#### `POST /api/v1/payments/webhook`
- **Access Level:** Public (Paystack Signature Verified)
- **Description:** Webhook listener for `charge.success` events.

#### `GET /api/v1/payments/receipt/:appointmentId`
- **Access Level:** Public / Patient
- **Description:** Generate and download PDF payment receipt for an appointment.

#### `POST /api/v1/payments/receipt/send`
- **Access Level:** Public / Patient
- **Description:** Email payment receipt PDF to patient.

---

### 8. Provider Ratings & Review System
*Base Path: `/api/v1/reviews`*

#### `POST /api/v1/reviews`
- **Access Level:** Patient Only
- **Description:** Create a rating and review for a healthcare provider. Updates provider aggregate ratings.
- **Request Body:** `{ "provider_id": "prov_123", "rating": 5, "comment": "Excellent service." }`

#### `GET /api/v1/reviews/provider/:providerId`
- **Access Level:** Public
- **Description:** List all public reviews left for a provider.

#### `POST /api/v1/reviews/:reviewId/like` & `POST /api/v1/reviews/:reviewId/save`
- **Access Level:** Patient Only
- **Description:** Toggle like/unlike or save/bookmark on a review.

---

### 9. Promotional Offers & Email Marketing
*Base Path: `/api/v1/offers`*

#### `POST /api/v1/offers/exclusive`
- **Access Level:** Public
- **Description:** Subscribe user email to receive exclusive discount offers and health promos.

---

### 10. Location & Geographic Data
*Base Path: `/api/v1/locations`*

#### `GET /api/v1/locations/countries`
- **Access Level:** Public
- **Description:** Fetch list of supported countries (`[{ name: "Nigeria", code: "NG" }]`).

#### `GET /api/v1/locations/states`
- **Access Level:** Public
- **Description:** Fetch states and LGAs for a country (`?country=Nigeria` or `?country_code=NG`).

---

## Environment Variables Reference

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Server Port | `3000` |
| `NODE_ENV` | Application Environment Mode | `development` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb://localhost:27017/resq-healthcare` |
| `JWT_SECRET` | Secret key used for signing JWT tokens | `your_jwt_secret_key_here` |
| `EMAIL_USER` | SMTP Email Sender Address | `resqhealthcare@gmail.com` |
| `EMAIL_PASSWORD` | SMTP App Password | `xxxx xxxx xxxx xxxx` |
| `PAYSTACK_SECRET_KEY` | Paystack API Secret Key | `sk_test_xxxxxxxxxxxxxxxx` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Storage Name | `resq-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `1234567890` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `secret_key` |
| `FIREBASE_CREDENTIAL` | Firebase Service Account JSON String | `{ "type": "service_account", ... }` |