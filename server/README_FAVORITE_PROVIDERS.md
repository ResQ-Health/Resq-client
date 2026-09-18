# Favorite Providers API Documentation

This document describes the API endpoints for managing favorite providers for patients in the ResQ healthcare platform.

## Overview

Patients can toggle healthcare providers in their favorites list (add if not present, remove if present) and view their favorite providers. This feature is restricted to patients only.

## Base URL
```
/api/v1/auth/favorites/providers
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Toggle Provider in Favorites

**Endpoint:** `POST /api/v1/auth/favorites/providers/toggle`

**Description:** Toggles a provider in the patient's favorites list. If the provider is not in favorites, it will be added. If it's already in favorites, it will be removed.

**Request Body:**
```json
{
  "provider_id": "wrjz4fT6KX"
}
```

**Request Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/favorites/providers/toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "provider_id": "wrjz4fT6KX"
  }'
```

**Success Response (200) - When Adding to Favorites:**
```json
{
  "success": true,
  "message": "Provider added to favorites successfully",
  "data": {
    "provider_id": "wrjz4fT6KX",
    "provider_name": "Dr. John Smith Medical Center",
    "action": "added",
    "is_favorite": true
  }
}
```

**Success Response (200) - When Removing from Favorites:**
```json
{
  "success": true,
  "message": "Provider removed from favorites successfully",
  "data": {
    "provider_id": "wrjz4fT6KX",
    "provider_name": "Dr. John Smith Medical Center",
    "action": "removed",
    "is_favorite": false
  }
}
```

**Error Responses:**

**400 - Provider ID Missing:**
```json
{
  "success": false,
  "message": "Provider ID is required"
}
```

**403 - Not a Patient:**
```json
{
  "success": false,
  "message": "Only patients can manage favorite providers"
}
```

**404 - Provider Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

### 2. Get Favorite Providers

**Endpoint:** `GET /api/v1/auth/favorites/providers`

**Description:** Retrieves all providers in the patient's favorites list with detailed information.

**Request Example:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/favorites/providers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "favorite_providers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "id": "abc123def4",
        "provider_name": "Dr. John Smith Medical Center",
        "work_email": "contact@drjohnsmith.com",
        "work_phone": "+1234567890",
        "address": {
          "street": "123 Medical St",
          "city": "New York",
          "state": "NY",
          "country": "USA",
          "postal_code": "10001"
        },
        "ratings": {
          "average": 4.8,
          "count": 150
        },
        "logo": "https://cloudinary.com/logo.jpg",
        "about": "Leading medical center specializing in cardiology and general medicine.",
        "services": [
          {
            "_id": "507f1f77bcf86cd799439012",
            "name": "General Consultation",
            "description": "Comprehensive health checkup",
            "price": 150
          },
          {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Cardiology Consultation",
            "description": "Heart health assessment",
            "price": 250
          }
        ]
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "id": "def456ghi7",
        "provider_name": "City Diagnostic Center",
        "work_email": "info@citydiagnostic.com",
        "work_phone": "+1987654321",
        "address": {
          "street": "456 Health Ave",
          "city": "New York",
          "state": "NY",
          "country": "USA",
          "postal_code": "10002"
        },
        "ratings": {
          "average": 4.6,
          "count": 89
        },
        "logo": "https://cloudinary.com/diagnostic-logo.jpg",
        "about": "State-of-the-art diagnostic services with advanced imaging technology.",
        "services": [
          {
            "_id": "507f1f77bcf86cd799439015",
            "name": "MRI Scan",
            "description": "Magnetic Resonance Imaging",
            "price": 800
          },
          {
            "_id": "507f1f77bcf86cd799439016",
            "name": "CT Scan",
            "description": "Computed Tomography Scan",
            "price": 600
          }
        ]
      }
    ],
    "count": 2
  }
}
```

**Error Responses:**

**403 - Not a Patient:**
```json
{
  "success": false,
  "message": "Only patients can view favorite providers"
}
```

## Data Model

### User Model Update
The User model has been updated to include a `favorite_providers` field:

```javascript
favorite_providers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
}]
```

## Business Rules

1. **Patient Only**: Only users with `user_type: 'Patient'` can manage favorite providers
2. **Toggle Behavior**: The same endpoint adds or removes providers based on current state
3. **Provider Validation**: The provider must exist in the database before being toggled
4. **Authentication Required**: All endpoints require valid JWT authentication
5. **Idempotent**: Multiple calls to toggle the same provider will alternate between add/remove

## Error Handling

All endpoints return consistent error responses with:
- `success`: boolean indicating operation success
- `message`: descriptive error message
- `data`: additional data when applicable

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors, duplicate favorites)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (not a patient)
- `404`: Not Found (user/provider not found)
- `500`: Internal Server Error

## Testing

You can test these endpoints using:
1. **Postman**: Import the requests from the provided examples
2. **cURL**: Use the command-line examples above
3. **Frontend Application**: Integrate with your React/Vue/Angular app

### Testing the Toggle Functionality

1. **First call** to `/toggle` with a provider_id will **add** it to favorites
2. **Second call** to `/toggle` with the same provider_id will **remove** it from favorites
3. **Third call** will **add** it again, and so on...

The response will always indicate the action taken (`added` or `removed`) and the current state (`is_favorite: true/false`).

## Notes

- The favorite providers list is populated with full provider details including services
- Provider IDs should be the custom `id` field values (e.g., "wrjz4fT6KX"), not MongoDB ObjectIds
- The toggle endpoint automatically handles add/remove logic based on current state
- All operations are atomic and include proper error handling
- The response includes both the action taken and the current favorite status
