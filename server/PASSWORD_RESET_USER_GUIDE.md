# Password Reset - User Guide

## What Happens After You Receive the Email

### Step 1: Check Your Email

You'll receive an email with the subject: **"Password Reset Request - ResQ Healthcare"**

The email contains:
- A **"Reset Password"** button
- A reset link you can copy and paste
- Information that the link expires in 1 hour

### Step 2: Click the Reset Link

**Option A: Click the Button**
- Click the green **"Reset Password"** button in the email

**Option B: Copy the Link**
- Copy the full link from the email
- Paste it into your browser's address bar
- Press Enter

The link will look like:
```
https://resq-client.vercel.app/reset-password?token=KTr__Ysbe32ArkV3GzOlC8XpM3Ozz67L
```

### Step 3: You'll Be Redirected to the Reset Password Page

Your frontend should have a page at `/reset-password` that:
- Extracts the token from the URL
- Shows a form to enter your new password
- Allows you to confirm your new password

### Step 4: Enter Your New Password

On the reset password page, you'll need to:
1. Enter your **new password** (minimum 6 characters)
2. **Confirm your new password** (enter it again)
3. Click **"Reset Password"** button

### Step 5: Password is Reset

After successfully resetting:
- You'll see a success message
- You'll be redirected to the login page
- You can now login with your **new password**

---

## Frontend Implementation Required

Your frontend needs to implement the reset password page. Here's what needs to be done:

### 1. Create Reset Password Page

Create a page at `/reset-password` that:
- Reads the `token` from URL query parameters
- Shows a form with password and confirm password fields
- Calls the reset password API

### 2. Example Implementation

Here's a React component example:

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
    // Get token from URL
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('No reset token found. Please use the link from your email.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!token) {
      setError('Reset token is missing');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api/v1';
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password-success">
        <h2>✅ Password Reset Successful!</h2>
        <p>Your password has been reset successfully.</p>
        <p>Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <h2>Reset Your Password</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={6}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !token}
          className="reset-button"
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>

      {!token && (
        <p className="warning">
          ⚠️ No reset token found. Please use the link from your email.
        </p>
      )}
    </div>
  );
};

export default ResetPassword;
```

### 3. Add Route

Add the route to your router:

```jsx
import ResetPassword from './pages/ResetPassword';

// In your router
<Route path="/reset-password" element={<ResetPassword />} />
```

---

## API Endpoint Used

**POST** `/api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "token-from-email-url",
  "newPassword": "yourNewPassword123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

---

## Common Issues & Solutions

### Issue: "Invalid or expired reset token"
**Solution:** 
- The token may have expired (tokens expire after 1 hour)
- The token may have already been used
- Request a new password reset

### Issue: "No reset token found"
**Solution:**
- Make sure you're using the full link from the email
- Don't modify the token in the URL
- Copy and paste the entire link

### Issue: "Password must be at least 6 characters"
**Solution:**
- Enter a password with at least 6 characters
- Make sure both password fields match

### Issue: Link doesn't work
**Solution:**
- Check if the link has expired (1 hour limit)
- Make sure you're using the link from the most recent email
- Request a new password reset if needed

---

## Security Notes

- ✅ Reset tokens expire after 1 hour
- ✅ Each token can only be used once
- ✅ After resetting, old tokens are invalidated
- ✅ Passwords are securely hashed before storage

---

## After Password Reset

Once your password is reset:
1. Go to the login page
2. Enter your email address
3. Enter your **new password**
4. Click "Login"

You're all set! 🎉

