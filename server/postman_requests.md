# Postman Requests for Testing the API

## 1. Welcome Endpoint

**Request:**
- Method: GET
- URL: http://localhost:3000/
- Headers: None required

## 2. API Test Endpoint

**Request:**
- Method: GET
- URL: http://localhost:3000/api/test
- Headers: None required

## 3. Auth Test Endpoint

**Request:**
- Method: GET
- URL: http://localhost:3000/api/auth/test
- Headers: None required

## 4. Register User

**Request:**
- Method: POST
- URL: http://localhost:3000/api/auth/register
- Headers: 
  - Content-Type: application/json
- Body (raw JSON):
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone_number": "+1234567890",
  "user_type": "Patient",
  "metadata": {
    "preferences": {
      "notifications": true,
      "theme": "light"
    }
  }
}
```

**Example response:**
```json
{
  "success": true,
  "data": {
    "id": "user_1682365428972",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "user_type": "Patient",
    "email_verified": false,
    "created_at": "2023-04-24T16:23:48.972Z",
    "token": "mock-token-user_1682365428972-1682365428972"
  }
}
```

## 5. Register Specialist User

**Request:**
- Method: POST
- URL: http://localhost:3000/api/auth/register
- Headers: 
  - Content-Type: application/json
- Body (raw JSON):
```json
{
  "full_name": "Dr. Jane Smith",
  "email": "drsmith@example.com",
  "password": "password123",
  "phone_number": "+9876543210",
  "user_type": "Specialist",
  "metadata": {
    "specialization": "Cardiologist",
    "experience": "15 years",
    "hospital": "City Hospital"
  }
}
```

## 6. Register Diagnostic Provider

**Request:**
- Method: POST
- URL: http://localhost:3000/api/auth/register
- Headers: 
  - Content-Type: application/json
- Body (raw JSON):
```json
{
  "full_name": "MedLab Diagnostics",
  "email": "info@medlab.example.com",
  "password": "password123",
  "phone_number": "+5551234567",
  "user_type": "DiagnosticProvider",
  "metadata": {
    "services": ["X-Ray", "MRI", "Blood Work", "CT Scan"],
    "location": {
      "address": "123 Med Street",
      "city": "New York",
      "state": "NY",
      "zipcode": "10001"
    }
  }
}
```

## 7. Login User

**Request:**
- Method: POST
- URL: http://localhost:3000/api/auth/login
- Headers:
  - Content-Type: application/json
- Body (raw JSON):
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Example response:**
```json
{
  "success": true,
  "data": {
    "id": "user_1682365428972",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "user_type": "Patient",
    "email_verified": false,
    "created_at": "2023-04-24T16:23:48.972Z",
    "token": "mock-token-user_1682365428972-1682365429000"
  }
}
```

## 8. Get User Profile

**Request:**
- Method: GET
- URL: http://localhost:3000/api/auth/me
- Headers:
  - Authorization: Bearer {{token}}

*Note: Replace {{token}} with the actual token received from the register or login response.*

**Example response:**
```json
{
  "success": true,
  "data": {
    "id": "user_1682365428972",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "user_type": "Patient",
    "email_verified": false,
    "created_at": "2023-04-24T16:23:48.972Z",
    "updated_at": "2023-04-24T16:23:48.972Z",
    "metadata": {
      "preferences": {
        "notifications": true,
        "theme": "light"
      }
    }
  },
  "source": "mock"
}
```

## Services

### Get All Services
```
GET {{baseUrl}}/services
```

### Get Services by Category
```
GET {{baseUrl}}/services/category/scans
GET {{baseUrl}}/services/category/tests
GET {{baseUrl}}/services/category/consultation
```

### Get Service by ID
```
GET {{baseUrl}}/services/:serviceId
```

### Create Service (Admin only)
```
POST {{baseUrl}}/services
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
  "category": "scans",
  "name": "Full Body Scan",
  "description": "Comprehensive full body scan",
  "uses": "General health assessment",
  "price": 15000
}
```

### Update Service (Admin only)
```
PUT {{baseUrl}}/services/:serviceId
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
  "price": 18000
}
```

### Delete Service (Admin only)
```
DELETE {{baseUrl}}/services/:serviceId
Authorization: Bearer {{adminToken}}
```

## Payments

### Initialize Payment
```
POST {{baseUrl}}/payments/initialize
Content-Type: application/json
Authorization: Bearer {{patientToken}}

{
  "appointmentId": "appointment_id"
}
```

### Verify Payment
```
GET {{baseUrl}}/payments/verify/:reference
Authorization: Bearer {{patientToken}}
```

## Appointments (Updated)

### Book Appointment (with service and form data)
```
POST {{baseUrl}}/appointments/book
Content-Type: application/json
Authorization: Bearer {{patientToken}}

{
  "providerId": "provider_id",
  "timeSlotId": "time_slot_id",
  "serviceId": "service_id",
  "formData": {
    "forWhom": "myself",
    "visitedBefore": "no",
    "identificationNumber": "ID12345",
    "comments": "I have been experiencing headaches"
  },
  "notes": "First time visit"
}
```

## Testing Flow:

1. Start with the Welcome endpoint to make sure the server is running
2. Test the API test endpoint and Auth test endpoint
3. Register three different types of users (Patient, Specialist, DiagnosticProvider)
4. Try to login with the credentials of one of the registered users
5. Use the token to access the protected profile endpoint

Since we've implemented a mock controller that works without MongoDB and Redis, all these endpoints should work even if those services aren't running on your machine. 