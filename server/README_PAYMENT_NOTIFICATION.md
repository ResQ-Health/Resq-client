# Payment Notification System

This document outlines the payment notification system for the ResQ healthcare platform, which sends email notifications to patients, providers, and administrators when payments are successfully processed.

## Overview

The payment notification system:

1. Sends detailed email notifications when a payment is successfully processed
2. Notifies all relevant parties: patients, providers, and administrators
3. Includes formatted payment and appointment details
4. Uses nodemailer for email delivery

## Implementation Details

### Notification Triggers

Notifications are sent in two scenarios:

1. When a payment is verified through the `/api/v1/payments/verify/:reference` endpoint
2. When a payment success event is received through the Paystack webhook

### Notification Recipients

Each payment notification is sent to:

1. **Patient** - The person who made the payment
2. **Provider** - The healthcare provider for the appointment
3. **Administrator** - The system administrator (configured via environment variable)

### Email Content

Each notification includes:

- **Header** - Customized based on recipient type
- **Greeting** - Personalized greeting
- **Main Message** - Context about the payment
- **Appointment Details** - Service, provider, patient, date, time, and amount
- **Payment Details** - Status, reference, and payment date
- **Footer** - Thank you message

### Email Templates

Different templates are used for each recipient type:

#### Patient Email

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

#### Provider Email

```
PAYMENT RECEIVED

Dear [Provider Name],

A payment of ₦15,000.00 has been received from [Patient Name] for the following appointment:

APPOINTMENT DETAILS
------------------
Service: Full Body Scan (scans)
Provider: Dr. John Doe
Patient: Jane Smith (jane.smith@example.com)
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

#### Admin Email

```
PAYMENT NOTIFICATION

Dear Admin,

A payment has been successfully processed for the following appointment:

APPOINTMENT DETAILS
------------------
Service: Full Body Scan (scans)
Provider: Dr. John Doe
Patient: Jane Smith (jane.smith@example.com)
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

## Configuration

### Environment Variables

The payment notification system requires the following environment variables:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
ADMIN_EMAIL=admin@example.com
```

### SMTP Configuration

The system uses Gmail SMTP by default, but can be configured to use any SMTP service by modifying the nodemailer transport configuration in `paymentController.js`.

## Benefits

1. **Immediate Confirmation** - Patients receive immediate confirmation of their payment
2. **Provider Awareness** - Providers are notified of paid appointments
3. **Administrative Oversight** - Administrators can monitor all payments
4. **Detailed Information** - All parties receive comprehensive appointment and payment details
5. **Professional Formatting** - Well-structured emails enhance the professional image of the platform 