# Provider Availability System

This document outlines the provider availability system for the ResQ application, where providers set their working hours by day of the week and time slots are generated dynamically.

## Overview

The availability system allows:
1. Providers to set their availability for specific days of the week (e.g., Monday to Friday, 9:00 AM - 5:00 PM)
2. Time slots are generated dynamically based on the provider's weekly schedule
3. Appointments can only be booked during a provider's working hours
4. The system prevents booking for past dates

## Weekly Schedule-Based Availability

Providers set their availability by day of the week, specifying:
- Which days they work (e.g., Monday to Friday, or specific days)
- Working hours for each day (start and end times)

Benefits:
- Intuitive setting of availability
- Consistent schedule that repeats weekly
- No need to manually generate time slots
- Schedule applies to all future dates automatically

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

### Dynamic Time Slot Generation

Instead of storing time slots in the database, the system:
1. Checks the provider's working hours for the requested day of the week
2. Dynamically generates 30-minute time slots within those working hours
3. Checks existing appointments to mark slots as booked or available
4. Returns only the available slots to the client

### API Endpoints

#### Setting Provider Availability

- `PUT /api/v1/providers/onboard/working-hours` - Set availability for each day of the week
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
          "day": "Tuesday",
          "isAvailable": true,
          "startTime": "10:00 AM",
          "endTime": "6:00 PM"
        },
        {
          "day": "Wednesday",
          "isAvailable": true,
          "startTime": "9:00 AM",
          "endTime": "5:00 PM"
        },
        {
          "day": "Thursday",
          "isAvailable": true,
          "startTime": "10:00 AM",
          "endTime": "6:00 PM"
        },
        {
          "day": "Friday",
          "isAvailable": true,
          "startTime": "9:00 AM",
          "endTime": "3:00 PM"
        },
        {
          "day": "Saturday",
          "isAvailable": false
        },
        {
          "day": "Sunday",
          "isAvailable": false
        }
      ]
    }
    ```

#### Viewing Available Time Slots

- `GET /api/v1/appointments/available-slots` - Get available time slots for a specific date
  - Parameters: `providerId`, `date` (YYYY-MM-DD format)
  - Returns dynamically generated slots based on the provider's working hours for that day of the week

#### Viewing Available Dates for Appointment

- `GET /api/v1/appointments/available-dates` - Get available dates for a provider
  - Parameters: `providerId`, `month` (optional), `year` (optional)
  - Returns a calendar view showing which days the provider works

#### Booking an Appointment

- `POST /api/v1/appointments/book` - Book an appointment
  - Request body:
    ```json
    {
      "providerId": "provider123",
      "serviceId": "service789",
      "date": "2024-05-20",
      "start_time": "10:00 AM",
      "end_time": "10:30 AM",
      "formData": {
        "forWhom": "Self",
        "visitedBefore": true,
        "identificationNumber": "12345",
        "comments": "Additional notes"
      },
      "notes": "Any special requirements"
    }
    ```

## Appointment Booking Flow

1. Patient views the provider's calendar to see available dates
2. Patient selects a date that the provider works on
3. System shows available time slots for that date based on the provider's working hours
4. Patient selects a time slot and books the appointment
5. System validates that:
   - The selected date is not in the past
   - The provider works on that day of the week
   - The requested time is within the provider's working hours
   - The time slot is not already booked
6. Appointment is created and notifications are sent

## Benefits of the New System

1. **Simplified Provider Experience**: Providers only need to set their weekly schedule once
2. **Automatic Future Availability**: Schedule automatically applies to all future dates
3. **No Database Bloat**: No need to store millions of time slot records
4. **Dynamic Generation**: Time slots are generated on-demand when needed
5. **Efficient Booking**: Direct validation against the provider's working hours
6. **Reduced Maintenance**: No need to periodically generate new time slots 