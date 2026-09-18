# Provider Calendar System for Appointment Booking

This document describes the calendar-based system for managing provider availability and appointment booking in the ResQ application.

## Overview

The calendar system allows:
1. Providers to set their availability for specific days of the week (e.g., Monday to Friday, or just Monday-Wednesday-Friday)
2. Time slots are automatically generated based on the provider's calendar availability
3. Patients can view a provider's available dates through a calendar interface
4. Booking is only allowed for present and future dates, not past dates

## Calendar-Based Availability

Providers can set their availability by day of the week, specifying:
- Which days they work (e.g., Monday to Friday, or Monday-Wednesday-Friday)
- Working hours for each day (start and end times)

Benefits:
- More intuitive setting of availability
- Consistent schedule that repeats weekly
- No need to manually set availability for each date

## Implementation Details

### Provider Working Hours Schema

The Provider model includes a working_hours array that stores availability for each day of the week:

```javascript
const workingHoursSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: String,
        required: function () { return this.isAvailable; }
    },
    endTime: {
        type: String,
        required: function () { return this.isAvailable; }
    }
}, { _id: false });
```

### Time Slot Validation

Time slots have validation to prevent creation for past dates:

```javascript
date: {
    type: Date,
    required: true,
    index: true,
    validate: {
        validator: function(value) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return value >= today;
        },
        message: 'Time slots can only be created for present or future dates'
    }
}
```

### API Endpoints

#### Setting Provider Availability

- `PUT /api/providers/onboard/working-hours` - Set availability for each day of the week
  - Request body:
    ```json
    {
      "working_hours": [
        {
          "day": "Monday",
          "isAvailable": true,
          "startTime": "9:00 AM",
          "endTime": "5:00 PM"
        },
        {
          "day": "Wednesday",
          "isAvailable": true,
          "startTime": "10:00 AM",
          "endTime": "4:00 PM"
        },
        {
          "day": "Friday",
          "isAvailable": true,
          "startTime": "9:00 AM",
          "endTime": "3:00 PM"
        }
      ]
    }
    ```

#### Viewing Provider Calendar

- `GET /api/providers/calendar` - Get provider's calendar view with availability by day
  - Parameters: `month` (optional), `year` (optional)
  - Returns a calendar with all days in the month, indicating which days the provider works

#### Viewing Available Dates for Appointment

- `GET /api/appointments/available-dates` - Get available dates for a provider
  - Parameters: `providerId`, `month` (optional), `year` (optional)
  - Returns a calendar view showing which days have available slots

#### Getting Time Slots for a Specific Date

- `GET /api/appointments/available-slots` - Get available time slots for a specific date
  - Parameters: `providerId`, `date` (YYYY-MM-DD format)
  - Returns slots only if the provider works on the specified day of the week

## Appointment Booking Flow

1. Patient views the provider's calendar to see available dates
2. Patient selects a date that the provider works on
3. System shows available time slots for that date
4. Patient selects a time slot and books the appointment
5. System validates that the selected date is not in the past
6. Appointment is created and notifications are sent

## Time Slot Generation

When a provider updates their working hours, the system:
1. Deletes any existing future time slots
2. Generates new time slots based on the updated working hours
3. Only generates slots for days the provider has marked as available
4. Only generates slots for present and future dates, not past dates

## Additional Features

- Calendar view shows both the provider's working days and actual available slots
- Days in the past are filtered out from all views
- Working hours are clearly displayed for each day
- Both providers and patients can see a month-based calendar view 