# Forgot Password API Documentation

This document describes the password reset functionality for patients.

## Overview

The forgot password flow consists of two endpoints:
1. **Request Password Reset** - Sends a password reset email with a token
2. **Reset Password** - Resets the password using the token from the email

## API Endpoints

### 1. Request Password Reset

**POST** `/api/v1/auth/forgot-password`

Request a password reset link to be sent to the user's email.

#### Request Body

```json
{
  "email": "patient@example.com"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### Error Responses

**400 Bad Request** - Invalid email format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [...]
}
```

**400 Bad Request** - OAuth-only account
```json
{
  "success": false,
  "message": "This account uses social login. Please sign in with your social provider."
}
```

**500 Internal Server Error** - Email sending failed
```json
{
  "success": false,
  "message": "Failed to send password reset email. Please try again later."
}
```

#### Security Features

- **Email Enumeration Prevention**: Always returns success message even if user doesn't exist
- **Patient-Only**: Only patients can reset passwords (providers/specialists cannot use this endpoint)
- **OAuth Protection**: OAuth-only accounts cannot reset passwords (they don't have passwords)
- **Token Expiration**: Reset tokens expire after 1 hour
- **One-Time Use**: Each token can only be used once

---

### 2. Reset Password

**POST** `/api/v1/auth/reset-password`

Reset the password using the token from the email.

#### Request Body

```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

#### Error Responses

**400 Bad Request** - Missing fields
```json
{
  "success": false,
  "message": "Token and new password are required."
}
```

**400 Bad Request** - Password too short
```json
{
  "success": false,
  "message": "Password must be at least 6 characters long."
}
```

**400 Bad Request** - Invalid or expired token
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new password reset."
}
```

**400 Bad Request** - Token already used
```json
{
  "success": false,
  "message": "This reset token has already been used. Please request a new password reset."
}
```

**403 Forbidden** - Non-patient user
```json
{
  "success": false,
  "message": "Password reset is only available for patients."
}
```

---

## Frontend Integration Example

### Step 1: Forgot Password Form

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(
        'http://localhost:6000/api/v1/auth/forgot-password',
        { email }
      );

      if (response.data.success) {
        setMessage(response.data.message);
        setEmail('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ForgotPassword;
```

### Step 2: Reset Password Form

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL query parameter
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setError('Reset token is missing');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:6000/api/v1/auth/reset-password',
        {
          token,
          newPassword
        }
      );

      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <h2>Password Reset Successful!</h2>
        <p>Your password has been reset. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New Password"
          required
          minLength={6}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          required
          minLength={6}
        />
        <button type="submit" disabled={loading || !token}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!token && (
        <p style={{ color: 'orange' }}>
          No reset token found. Please use the link from your email.
        </p>
      )}
    </div>
  );
};

export default ResetPassword;
```

---

## Email Template

The password reset email includes:
- A clickable "Reset Password" button
- A reset link that expires in 1 hour
- Security notice if the user didn't request the reset
- Professional branding

The reset link format:
```
http://localhost:3000/reset-password?token=<reset-token>
```

In production, this will use your `FRONTEND_URL` environment variable.

---

## Security Considerations

1. **Token Expiration**: Tokens expire after 1 hour
2. **One-Time Use**: Each token can only be used once
3. **Email Enumeration Prevention**: Always returns success message
4. **Patient-Only**: Only patients can use this feature
5. **OAuth Protection**: OAuth accounts cannot reset passwords
6. **Password Hashing**: Passwords are automatically hashed using bcrypt
7. **Token Cleanup**: Old tokens are automatically deleted after use

---

## Testing

### Test Forgot Password Request

```bash
curl -X POST http://localhost:6000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "patient@example.com"}'
```

### Test Reset Password

```bash
curl -X POST http://localhost:6000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "newPassword": "newPassword123"
  }'
```

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
FRONTEND_URL=http://localhost:3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## Error Handling

The API handles various error scenarios:
- Invalid email format
- User not found (returns success for security)
- Email already verified
- OAuth-only accounts
- Expired tokens
- Used tokens
- Email sending failures
- Invalid passwords

All errors return appropriate HTTP status codes and descriptive messages.

---

## Notes

- Reset tokens are stored in MongoDB with automatic expiration (1 hour)
- Tokens are marked as "used" after successful password reset
- All old tokens for a user are deleted when a new one is created
- The password reset email uses the same email configuration as OTP emails

