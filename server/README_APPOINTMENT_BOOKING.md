# Appointment Booking API Documentation

## Overview
The appointment booking system allows users to book appointments for themselves or others with healthcare providers. All appointments start with a "pending" status and require payment confirmation.

## Endpoint
```
POST {{base_url}}/api/v1/appointments/book
```

## Authentication
- **Required**: Bearer token in Authorization header
- **Role**: Patient only (`patientOnly` middleware)

## Request Body

### Required Fields
```json
{
  "providerId": "string",           // Provider ID (required)
  "serviceId": "string",            // Service ID (required)
  "date": "string",                 // Date in YYYY-MM-DD format (required)
  "start_time": "string",           // Start time in "HH:MM AM/PM" format (required)
  "end_time": "string",             // End time in "HH:MM AM/PM" format (required)
  "formData": {                     // Form data object (required)
    "forWhom": "string",            // "Self" or "Other" (required)
    "visitedBefore": "boolean"      // Whether patient visited before (required)
  }
}
```

### Optional Fields
```json
{
  "notes": "string",                // Optional appointment notes
  "formData": {
    "identificationNumber": "string",     // Patient ID number
    "comments": "string",                 // Additional comments
    "communicationPreference": "string",  // "Booker", "Patient", or "Both"
    
    // Required when forWhom is "Other"
    "patientName": "string",             // Full name of the patient
    "patientEmail": "string",            // Patient's email address
    "patientPhone": "string",            // Patient's phone number
    "patientAddress": "string",          // Patient's address
    "patientGender": "string",           // Patient's gender
    "patientDOB": "string"               // Patient's date of birth (YYYY-MM-DD)
  }
}
```

## Communication Preferences

The `communicationPreference` field accepts three values:

- **"Booker"**: Only the person who made the booking receives notifications
- **"Patient"**: Only the patient receives notifications
- **"Both"**: Both the booker and patient receive notifications

## Example Requests

### Booking for Self
```json
{
  "providerId": "wrjz4fT6KX",
  "serviceId": "UkFH7ckwgi",
  "date": "2025-10-15",
  "start_time": "10:00 AM",
  "end_time": "10:30 AM",
  "notes": "Regular checkup",
  "formData": {
    "forWhom": "Self",
    "visitedBefore": true,
    "identificationNumber": "ID12345678",
    "comments": "Annual checkup",
    "communicationPreference": "Booker"
  }
}
```

### Booking for Others
```json
{
  "providerId": "wrjz4fT6KX",
  "serviceId": "UkFH7ckwgi",
  "date": "2025-10-15",
  "start_time": "10:00 AM",
  "end_time": "10:30 AM",
  "notes": "First consultation for knee pain",
  "formData": {
    "forWhom": "Other",
    "visitedBefore": false,
    "identificationNumber": "ID12345678",
    "comments": "Patient has difficulty walking",
    "communicationPreference": "Both",
    "patientName": "Joseph Okeke",
    "patientEmail": "joseph.okeke@example.com",
    "patientPhone": "07000469491",
    "patientAddress": "178 Kofo Abayomi Street, Victoria Island, Lagos",
    "patientGender": "Male",
    "patientDOB": "1985-08-12"
  }
}
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Appointment request submitted. Please complete payment to confirm your appointment.",
  "data": {
    "appointment": {
      "id": "a6GcY9IlVa",
      "provider_name": "ABC Diagnostics",
      "patient_name": "Joseph Okeke",
      "service": {
        "id": "UkFH7ckwgi",
        "name": "Urinalysis",
        "category": "tests",
        "price": 3000
      },
      "date": "2025-10-15",
      "start_time": "10:00 AM",
      "end_time": "10:30 AM",
      "status": "pending",
      "payment": {
        "status": "pending",
        "amount": 3000,
        "payment_link": "/api/v1/payments/initialize/a6GcY9IlVa"
      },
      "formData": {
        "forWhom": "Other",
        "communicationPreference": "Both",
        "patientEmail": "joseph.okeke@example.com",
        "patientPhone": "07000469491",
        "patientAddress": "178 Kofo Abayomi Street, Victoria Island, Lagos",
        "comments": "Patient has difficulty walking"
      },
      "timezone": "WAT"
    }
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Provider ID, service ID, date, start time, and end time are required"
}
```

#### Communication Preference Error (400)
```json
{
  "success": false,
  "message": "communicationPreference must be one of: \"Booker\", \"Patient\", or \"Both\""
}
```

#### Time Slot Conflict (400)
```json
{
  "success": false,
  "message": "This time slot is already booked. Please choose another time."
}
```

#### Provider Not Working (400)
```json
{
  "success": false,
  "message": "ABC Diagnostics does not work on Sundays."
}
```

## Data Validation

### Date Format
- **Format**: YYYY-MM-DD
- **Example**: "2025-10-15"
- **Validation**: Must be a valid date and not in the past

### Time Format
- **Format**: "HH:MM AM/PM"
- **Examples**: "10:00 AM", "2:30 PM", "11:45 PM"
- **Validation**: Must be within provider's working hours

### forWhom Field
- **Values**: "Self" or "Other"
- **When "Other"**: All patient details must be provided
- **When "Self"**: Patient details are taken from authenticated user

### Communication Preference
- **Values**: "Booker", "Patient", or "Both"
- **Default**: "Booker" if not specified

## Payment Flow

1. **Booking Created**: Appointment is created with "pending" status
2. **Payment Required**: User must complete payment to confirm appointment
3. **Payment Link**: Use the `payment_link` from response to initialize payment
4. **Confirmation**: After successful payment, appointment status changes to "confirmed"

## Timezone Information

- **Timezone**: WAT (West Africa Time)
- **Format**: All times are displayed in WAT
- **Date Format**: YYYY-MM-DD for consistency

## Error Handling

The API provides detailed error messages for:
- Missing required fields
- Invalid date/time formats
- Past date bookings
- Time slot conflicts
- Provider availability issues
- Invalid communication preferences
- Service/provider not found

## Notes

- All appointments start as "pending" and require payment confirmation
- Time slots are validated against provider working hours
- Past dates and times are automatically rejected
- A 15-minute buffer prevents last-minute bookings
- Duplicate bookings are prevented through time slot validation
- Providers can enable auto-approval for faster processing (see [README_AUTO_APPROVE.md](./README_AUTO_APPROVE.md))
