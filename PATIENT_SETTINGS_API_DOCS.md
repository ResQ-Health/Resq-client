# Patient Settings Page - API Documentation

This document outlines the API endpoints required to fully implement the features on the Patient Settings page (`/patient/settings`).

## 1. User Profile & Preferences
**Endpoint**: `GET /api/v1/auth/me`
**Purpose**: Fetch user details, verification status, and persisted notification settings.

### Response Body
```json
{
  "success": true,
  "data": {
    "id": "user_12345",
    "email": "patient@example.com",
    "full_name": "John Doe",
    "email_verified": true,
    "personal_details": { ... },
    "contact_details": { ... },
    "location_details": { ... }
  },
  "metadata": {
    "notification_settings": {
      "email": true,
      "push": false,
      "sms": true
    }
  }
}
```

---

## 2. Update Notification Settings
**Endpoint**: `PUT /api/v1/auth/me`
**Purpose**: Update the user's notification preferences. These are stored in the `metadata` field of the user profile.

### Request Body
```json
{
  "metadata": {
    "notification_settings": {
      "email": true,
      "push": true,
      "sms": false
    }
  }
}
```

### Response Body
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ... },
  "metadata": {
    "notification_settings": {
      "email": true,
      "push": true,
      "sms": false
    }
  }
}
```

---

## 3. Account Security - Password Reset
**Endpoint**: `POST /api/v1/auth/forgot-password`
**Purpose**: Trigger a password reset flow since the user cannot change their password directly without the old password (and social login users may not have one).

### Request Body
```json
{
  "email": "patient@example.com"
}
```

### Response Body
```json
{
  "success": true,
  "message": "Password reset link sent to your email."
}
```

---

## 4. Payment Methods (Saved Cards)
**Note**: These endpoints handle the "Payment Setup" modal features.

### A. Get Saved Payment Methods
**Endpoint**: `GET /api/v1/payments/methods`
**Purpose**: List saved cards for the user.

#### Response Body
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_123",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiry_month": 12,
      "expiry_year": 2025
    }
  ]
}
```

### B. Add Payment Method (Initialize)
**Endpoint**: `POST /api/v1/payments/methods/initialize`
**Purpose**: Initialize a transaction (e.g., charge a small amount or just tokenize) to save a card.

#### Request Body
```json
{
  "payment_provider": "paystack" // or "flutterwave"
}
```

#### Response Body
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "..."
  }
}
```

### C. Verify & Save Card
**Endpoint**: `POST /api/v1/payments/methods/verify`
**Purpose**: Confirm the transaction and save the tokenized card.

#### Request Body
```json
{
  "reference": "ref_12345"
}
```

#### Response Body
```json
{
  "success": true,
  "message": "Payment method added successfully",
  "data": {
    "id": "pm_456",
    "last4": "1234",
    "brand": "mastercard"
  }
}
```

---

## 5. Close Account
**Endpoint**: `DELETE /api/v1/auth/me`
**Purpose**: Permanently delete the user's account.

### Request Body
*None* (Auth token in header)

### Response Body
```json
{
  "success": true,
  "message": "Account deleted successfully."
}
```

