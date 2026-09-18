# Comprehensive Notification System

This document outlines the comprehensive notification system for the ResQ healthcare platform, which sends email notifications for various events in the appointment and payment lifecycle.

## Overview

The notification system sends emails for the following events:

1. **Appointment Booking** - When a patient books a new appointment
2. **Appointment Confirmation** - When a provider confirms an appointment
3. **Appointment Rejection** - When a provider rejects an appointment
4. **Appointment Cancellation** - When an appointment is cancelled by either party
5. **Payment Success** - When a payment is successfully processed
6. **Payment Failure** - When a payment attempt fails

## Implementation Details

### Appointment Booking Notifications

When a patient books an appointment:
- The provider receives a notification to review and confirm/reject the appointment
- The patient receives a booking confirmation with appointment details and next steps

### Appointment Status Change Notifications

When an appointment status changes:
- Both patient and provider receive notifications about the status change
- Notifications include all relevant appointment details

### Payment Success Notifications

When a payment is successfully processed:
- The patient receives a payment confirmation email
- The provider receives a notification that payment has been received
- The administrator receives a notification for record-keeping

### Payment Failure Notifications

When a payment fails:
- The patient receives a detailed notification explaining the failure
- The notification includes troubleshooting steps and how to retry

## Email Templates

### Appointment Booking Confirmation

```
APPOINTMENT BOOKING CONFIRMATION

Dear [Patient Name],

Thank you for booking an appointment with ResQ Healthcare. Your appointment has been received and is awaiting confirmation from the provider.

APPOINTMENT DETAILS
------------------
Service: Full Body Scan (scans)
Provider: Dr. John Doe
Date: Monday, May 20, 2024
Time: 10:00 AM - 10:30 AM
Amount: ₦15,000.00
Status: Awaiting Provider Confirmation

BOOKING INFORMATION
-------------------
Appointment ID: abc123def456
Booking Date: 5/15/2024
For: Self
Comments: First-time visit

NEXT STEPS
-----------
1. The provider will review your appointment request
2. Once confirmed, you will receive a confirmation email
3. You will need to make payment to secure your appointment
4. After payment, your appointment will be fully confirmed

Thank you for choosing ResQ Healthcare Services.
If you have any questions, please contact our support team.
```

### Payment Success Notification

```
PAYMENT CONFIRMATION

Dear [Patient Name],

Your payment of ₦15,000.00 for the following appointment has been successfully processed:

APPOINTMENT DETAILS
------------------
Service: Full Body Scan (scans)
Provider: Dr. John Doe
Date: Monday, May 20, 2024
Time: 10:00 AM - 10:30 AM
Amount: ₦15,000.00

PAYMENT DETAILS
---------------
Payment Status: Completed
Reference: RESQ-appointment123-1621234567
Payment Date: 5/20/2024, 9:45:30 AM

Thank you for using ResQ Healthcare Services.
```

### Payment Failure Notification

```
PAYMENT FAILED

Dear [Patient Name],

We regret to inform you that your payment of ₦15,000.00 for the following appointment could not be processed:

APPOINTMENT DETAILS
------------------
Service: Full Body Scan (scans)
Provider: Dr. John Doe
Date: Monday, May 20, 2024
Time: 10:00 AM - 10:30 AM
Amount: ₦15,000.00

PAYMENT FAILURE DETAILS
----------------------
Status: Failed
Reason: Insufficient funds
Reference: RESQ-appointment123-1621234567
Time: 5/20/2024, 9:45:30 AM

NEXT STEPS
-----------
1. Please check that your card details are correct
2. Ensure you have sufficient funds in your account
3. Try again by logging into your account and selecting the appointment
4. If the problem persists, please contact your bank or our support team

Thank you for using ResQ Healthcare Services.
```

## Configuration

### Environment Variables

The notification system requires the following environment variables:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
ADMIN_EMAIL=admin@example.com
```

## Benefits

1. **Improved User Experience** - Patients and providers are kept informed at every step
2. **Reduced Support Inquiries** - Clear notifications reduce the need for users to contact support
3. **Increased Transparency** - All parties have visibility into the appointment and payment process
4. **Professional Communication** - Well-structured emails enhance the professional image of the platform
5. **Reduced No-Shows** - Reminders and confirmations help ensure patients attend their appointments 