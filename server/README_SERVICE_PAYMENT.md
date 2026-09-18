# ResQ Service Selection and Payment Integration

This document outlines the implementation of service selection and payment integration for the ResQ healthcare platform.

## Service Model

The Service model represents different healthcare services offered by providers:

- **Categories**:
  - Scans (₦15,000)
  - Tests (₦10,000)
  - Consultations (₦12,000)

- **Fields**:
  - `id`: Unique identifier
  - `category`: Service category (scans, tests, consultation)
  - `name`: Service name
  - `description`: Service description
  - `uses`: What the service is used for
  - `price`: Service price in Naira

## Pre-booking Form

When booking an appointment, patients must provide the following information:

- **Who is the appointment for**:
  - Myself
  - Someone else
- **Previous visit information**:
  - Yes
  - No
- **Additional information**:
  - Identification number (optional)
  - Comments (optional)

## Appointment Flow

1. **Service Selection**:
   - Patient selects a service category
   - Patient selects a specific service from that category
   - Patient selects a provider

2. **Date & Time Selection**:
   - Patient selects an available date from the calendar
   - Patient selects an available time slot

3. **Pre-booking Form**:
   - Patient fills out the pre-booking form
   - Patient submits the appointment request

4. **Provider Confirmation**:
   - Provider receives notification of pending appointment
   - Provider confirms or rejects the appointment

5. **Payment**:
   - Patient receives notification of confirmed appointment
   - Patient makes payment through Paystack
   - Appointment status is updated to paid

## Payment Integration (Paystack)

### Payment Initialization

```
POST /api/v1/payments/initialize
```

**Request Body**:
```json
{
  "appointmentId": "appointment_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "RESQ-appointment_id-timestamp"
  }
}
```

### Payment Verification

```
GET /api/v1/payments/verify/:reference
```

**Response**:
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "appointment_id": "appointment_id",
    "payment_status": "completed",
    "amount": 15000
  }
}
```

### Paystack Webhook

```
POST /api/v1/payments/webhook
```

This endpoint handles Paystack webhook events, particularly for successful payments.

## Service Management API

### Get All Services

```
GET /api/v1/services
```

### Get Services by Category

```
GET /api/v1/services/category/:category
```

### Get Service by ID

```
GET /api/v1/services/:serviceId
```

### Create a Service (Admin only)

```
POST /api/v1/services
```

**Request Body**:
```json
{
  "category": "scans",
  "name": "Full Body Scan",
  "description": "Comprehensive full body scan",
  "uses": "General health assessment",
  "price": 15000
}
```

### Update a Service (Admin only)

```
PUT /api/v1/services/:serviceId
```

### Delete a Service (Admin only)

```
DELETE /api/v1/services/:serviceId
```

## Environment Variables

Add the following environment variables:

```
PAYSTACK_SECRET_KEY=your_paystack_secret_key
FRONTEND_URL=your_frontend_url
``` 