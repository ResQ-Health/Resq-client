# Provider Onboarding and Appointment Booking System

This document outlines the implementation of the provider onboarding flow and appointment booking system for the ResQ application.

## Overview

The system enables:
1. Providers to onboard by completing their profile and setting working hours
2. Auto-generation of available time slots based on providers' working hours
3. Patients to view available slots and book appointments
4. Notifications to be sent via Firebase Cloud Messaging and Email

## Database Schema

The implementation adds the following MongoDB models:

### 1. Provider Model (Updated)
- Added `working_hours` array to store availability
- Added `profile_complete` flag
- Added `fcm_token` for Firebase notifications

### 2. TimeSlot Model
- Stores available time slots for providers
- Generated based on working hours
- Fields include: provider_id, date, start_time, end_time, is_available

### 3. Appointment Model
- Stores booked appointments
- Links patients and providers via time slots
- Fields include: patient_id, provider_id, time_slot_id, status

## API Endpoints

### Provider Profile
- `GET /api/v1/providers/profile/me` - Get full provider profile (logged-in provider)
- `PUT /api/v1/providers/profile/me` - Update full provider profile (text fields + optional media uploads)

### Provider Support Tickets
- `POST /api/v1/providers/me/support/tickets` - Create support ticket
- `GET /api/v1/providers/me/support/tickets?page=&limit=&status=` - List provider tickets
- `GET /api/v1/providers/me/support/tickets/:ticketId` - View a ticket (details + messages thread)
- `POST /api/v1/providers/me/support/tickets/:ticketId/messages` - Add message / reply to a ticket

### Provider Onboarding
- `POST /api/v1/providers/onboard/profile` - Update provider profile details
- `PUT /api/v1/providers/onboard/working-hours` - Set provider working hours
- `POST /api/v1/providers/onboard/complete` - Confirm onboarding completion

### Provider Transactions
- `GET /api/v1/providers/me/transactions` - List provider transactions (paid appointments) + revenue summary grouped by service

### Provider Reports
- `POST /api/v1/providers/:providerId/reports` - Patient reports a provider (only allowed if patient has booked that provider)
- `GET /api/v1/providers/me/reports` - Provider views reports made against them

### Provider Reviews
- `GET /api/v1/providers/me/reviews` - Provider views all reviews/ratings made about them + rating summary

### Provider Media & Social Links
- `PUT /api/v1/providers/me/banner-image` - Upload/update banner image (form-data key: `banner_image`)
- `PUT /api/v1/providers/me/logo` - Upload/update logo image (form-data key: `logo`)
- `GET /api/v1/providers/me/gallery` - List gallery images
- `POST /api/v1/providers/me/gallery` - Add gallery images (form-data key: `gallery`, up to 10 files)
- `DELETE /api/v1/providers/me/gallery` - Remove a gallery image (JSON body: `{ "url": "..." }`)
- `PUT /api/v1/providers/me/social-links` - Update social links (JSON body: `{ "website": "...", "instagram": "...", "facebook": "..." }`)

### Provider Location (Address)
- `PUT /api/v1/providers/me/address` - Update provider address/location (JSON body: `{ "street": "...", "city": "...", "state": "...", "country": "Nigeria", "postal_code": "..." }`)

### Provider Description
- `PUT /api/v1/providers/me/about` - Update provider description/about (JSON body: `{ "about": "..." }`)

### Location Lists (for dropdowns)
- `GET /api/v1/locations/countries` - List supported countries (currently Nigeria)
- `GET /api/v1/locations/states?country=Nigeria` - List states for a country (Nigeria + FCT)

### Time Slot Management
- `POST /api/v1/providers/generate-slots` - Generate time slots based on working hours
- `GET /api/v1/providers/slots` - Get provider's time slots

### Appointment Booking
- `GET /api/v1/appointments/available-slots` - View available slots for a provider
- `POST /api/v1/appointments/book` - Book an appointment
- `GET /api/v1/appointments/patient` - Get patient's appointments
- `GET /api/v1/appointments/provider` - Get provider's appointments
- `PUT /api/v1/appointments/:appointmentId/cancel` - Cancel an appointment

## Time Slot Generation

Time slots are generated based on the provider's working hours:
1. Provider sets working hours for each day of the week
2. System generates slots (e.g., 30-minute intervals) for the next 30 days
3. Slots are stored in the TimeSlot collection and marked as available

The system includes:
- On-demand generation through API endpoint
- Scheduled daily generation via cron job

### Running the Scheduler
```bash
npm run scheduler
```

### Manually Generate Slots
```bash
npm run generate-slots
```

## Notification System

When appointments are booked or cancelled, notifications are sent via:
1. Firebase Cloud Messaging - Push notifications to mobile devices
2. Email - Using Gmail SMTP

## Firebase Setup

To enable Firebase notifications:
1. Create a Firebase project and get service account credentials
2. Set the `FIREBASE_CREDENTIAL` environment variable with the JSON credentials
3. Ensure users/providers have FCM tokens stored in their documents

## Email Configuration

For email notifications:
1. Set up Gmail SMTP credentials in the environment variables
2. Use `EMAIL_USER` and `EMAIL_PASSWORD` (app password for Gmail)

## Environment Variables

Required environment variables:
```
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Firebase Admin
FIREBASE_CREDENTIAL={"type":"service_account",...}

# Scheduler Settings
RUN_ON_STARTUP=true
```

## Sample Usage Flow

1. Provider completes profile via `/api/v1/providers/onboard/profile`
2. Provider sets working hours via `/api/v1/providers/onboard/working-hours`
3. Provider confirms onboarding via `/api/v1/providers/onboard/complete`
4. System generates time slots (automatically or via API)
4. Patient checks available slots via `/api/v1/appointments/available-slots`
5. Patient books appointment via `/api/v1/appointments/book`
6. System sends notifications to both patient and provider
7. Both can view appointments via the respective endpoints
8. Either can cancel the appointment if needed 