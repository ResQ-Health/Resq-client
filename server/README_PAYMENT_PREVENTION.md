# Multiple Payment Prevention System

This document outlines the multiple payment prevention system for the ResQ healthcare platform, which prevents users from making duplicate payments for the same appointment.

## Overview

The multiple payment prevention system:

1. Prevents users from initiating multiple payments for the same appointment
2. Checks both payment status and appointment status before allowing payment
3. Handles duplicate webhook events gracefully
4. Automatically updates appointment status after successful payment

## Implementation Details

### Payment Initialization Prevention

When a user attempts to initialize a payment, the system checks:

1. If the appointment already has a completed payment
2. If the appointment status is appropriate for payment (only 'pending' or 'confirmed' appointments can be paid)
3. If there's already a payment in progress (initiated within the last 15 minutes)

### Payment Verification Prevention

When verifying a payment, the system checks:

1. If the payment reference has already been processed for any appointment
2. If the specific appointment already has a completed payment

### Webhook Duplicate Prevention

When receiving a webhook event from Paystack, the system checks:

1. If the payment reference has already been processed
2. If the appointment already has a completed payment

### Appointment Status Updates

After a successful payment:

1. If the appointment was in 'pending' status, it's automatically updated to 'confirmed'
2. The payment details are recorded with the appointment

## Code Examples

### Payment Initialization Check

```javascript
// Check if appointment is already paid
if (appointment.payment && appointment.payment.status === 'completed') {
    return res.status(400).json({
        success: false,
        message: 'Payment has already been completed for this appointment'
    });
}

// Check if appointment status is appropriate for payment
if (appointment.status !== 'confirmed' && appointment.status !== 'pending') {
    return res.status(400).json({
        success: false,
        message: `Cannot process payment for an appointment with status: ${appointment.status}`
    });
}

// Check if there's already a payment in progress
if (appointment.payment && appointment.payment.paystackReference && appointment.payment.status === 'pending') {
    // Check when the last payment attempt was made
    const lastPaymentAttempt = appointment.payment.updatedAt || appointment.updated_at;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // If payment was initiated less than 15 minutes ago, prevent a new attempt
    if (lastPaymentAttempt > fifteenMinutesAgo) {
        return res.status(400).json({
            success: false,
            message: 'A payment is already in progress for this appointment. Please wait or check your email for confirmation.'
        });
    }
}
```

### Payment Verification Check

```javascript
// Check if this reference has already been processed
const existingPayment = await Appointment.findOne({
    'payment.paystackReference': reference,
    'payment.status': 'completed'
});

if (existingPayment) {
    return res.status(400).json({
        success: false,
        message: 'This payment has already been processed',
        data: {
            appointment_id: existingPayment.id,
            payment_status: 'completed',
            amount: existingPayment.payment.amount
        }
    });
}
```

### Appointment Status Update

```javascript
// Helper function to update appointment status after successful payment
async function updateAppointmentAfterPayment(appointment) {
    // If appointment was in 'pending' status, update it to 'confirmed' after payment
    if (appointment.status === 'pending') {
        appointment.status = 'confirmed';
        console.log(`Appointment ${appointment.id} status updated from 'pending' to 'confirmed' after payment`);
    }
    return appointment;
}
```

## Benefits

1. **Prevents Double Charges** - Users cannot be charged multiple times for the same appointment
2. **Maintains Data Consistency** - Prevents duplicate payment records in the database
3. **Improves User Experience** - Provides clear error messages when attempting duplicate payments
4. **Handles Edge Cases** - Manages webhook events that might be sent multiple times
5. **Automatic Status Updates** - Streamlines the appointment workflow by updating status after payment 