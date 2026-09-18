# Simplified Booking System

This document outlines the simplified booking system for the ResQ application, where date validation is handled on the frontend instead of the backend.

## Overview

The simplified booking system allows:
1. Providers to set their availability for specific days of the week
2. Time slots are automatically generated based on the provider's schedule
3. Patients can book appointments by entering a date directly, without requiring a calendar component
4. Frontend handles validation for past dates, ensuring users can't book appointments for past days

## Implementation Details

### Time Slot Schema

The TimeSlot model has been simplified to allow all dates, with validation handled on the frontend:

```javascript
const timeSlotSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    provider_id: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    is_available: {
        type: Boolean,
        default: true,
        index: true
    }
    // ...other fields
});
```

### API Endpoints

#### Booking an Appointment

- `POST /api/appointments/book` - Book an appointment
  - Request body:
    ```json
    {
      "providerId": "provider123",
      "timeSlotId": "timeslot456",
      "serviceId": "service789",
      "formData": {
        "forWhom": "Self",
        "visitedBefore": true,
        "identificationNumber": "12345",
        "comments": "Additional notes"
      },
      "notes": "Any special requirements"
    }
    ```
  - Frontend should validate that the date is not in the past before submitting

#### Getting Available Time Slots

- `GET /api/appointments/available-slots` - Get available time slots for a specific date
  - Parameters: `providerId`, `date` (YYYY-MM-DD format)
  - Frontend should validate the date is not in the past before making the request

#### Getting Available Dates

- `GET /api/appointments/available-dates` - Get available dates for a provider
  - Parameters: `providerId`, `month` (optional), `year` (optional)
  - Returns all days in the month, including past dates
  - Frontend should handle filtering/disabling of past dates

## Frontend Validation Requirements

To properly implement this simplified system, the frontend should:

1. Validate that selected dates are not in the past
2. Display appropriate error messages when a user attempts to select a past date
3. Disable or visually indicate past dates in any date selection UI
4. Prevent submission of appointment requests for past dates

## Benefits of Frontend Validation

1. More flexible UI implementation
2. Immediate feedback to users without server roundtrips
3. Reduced server load
4. Consistent user experience across different client applications

## Implementation Notes

- The backend no longer rejects requests for past dates
- All date validation logic should be implemented in the frontend
- The backend will still return data for past dates, which the frontend should filter appropriately 