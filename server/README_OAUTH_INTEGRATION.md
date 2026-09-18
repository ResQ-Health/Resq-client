# Social OAuth Login Integration Guide

This guide explains how to integrate social OAuth login (Google, Facebook, Apple) with the ResQ Health API for patient authentication.

## Overview

The OAuth implementation uses Firebase Authentication on the frontend and Firebase Admin SDK on the backend to verify tokens. This provides a secure, standardized way to authenticate users across different social providers.

## Backend API Endpoint

### POST `/api/v1/auth/oauth/login`

Authenticate a patient using social OAuth (Google, Facebook, or Apple).

#### Request Body

```json
{
  "idToken": "firebase-id-token-from-frontend",
  "provider": "google", // or "facebook" or "apple"
  "email": "user@example.com", // optional, will be extracted from token if not provided
  "name": "John Doe", // optional
  "photoURL": "https://example.com/photo.jpg", // optional
  "phoneNumber": "+1234567890" // optional
}
```

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user-id",
    "full_name": "John Doe",
    "email": "user@example.com",
    "phone_number": "+1234567890",
    "user_type": "Patient",
    "is_admin": false,
    "email_verified": true,
    "oauth_provider": "google",
    "profile_picture": {
      "url": "https://example.com/photo.jpg"
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "token": "jwt-token-here"
  }
}
```

#### Response (Error - 400/401/500)

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Frontend Integration

### Prerequisites

1. **Firebase SDK**: Install Firebase SDK in your frontend project
   ```bash
   npm install firebase
   # or
   yarn add firebase
   ```

2. **Firebase Configuration**: Use the Firebase config from your environment:
   ```javascript
   const firebaseConfig = {
     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
     authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
     storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.REACT_APP_FIREBASE_APP_ID
   };
   ```

3. **Enable OAuth Providers in Firebase Console**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Google, Facebook, and/or Apple sign-in
   - Configure each provider with the required credentials

### React/Next.js Example

```javascript
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider 
} from 'firebase/auth';
import axios from 'axios';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api/v1';

/**
 * Handle Google Sign In
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Send to backend
    const response = await axios.post(`${API_BASE_URL}/auth/oauth/login`, {
      idToken,
      provider: 'google',
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber
    });
    
    if (response.data.success) {
      // Store the JWT token
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      
      return {
        success: true,
        user: response.data.data
      };
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Google sign-in failed'
    };
  }
};

/**
 * Handle Facebook Sign In
 */
export const signInWithFacebook = async () => {
  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Send to backend
    const response = await axios.post(`${API_BASE_URL}/auth/oauth/login`, {
      idToken,
      provider: 'facebook',
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber
    });
    
    if (response.data.success) {
      // Store the JWT token
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      
      return {
        success: true,
        user: response.data.data
      };
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Facebook sign-in failed'
    };
  }
};

/**
 * Handle Apple Sign In
 */
export const signInWithApple = async () => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Send to backend
    const response = await axios.post(`${API_BASE_URL}/auth/oauth/login`, {
      idToken,
      provider: 'apple',
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber
    });
    
    if (response.data.success) {
      // Store the JWT token
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      
      return {
        success: true,
        user: response.data.data
      };
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Apple sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Apple sign-in failed'
    };
  }
};
```

### React Component Example

```jsx
import React, { useState } from 'react';
import { signInWithGoogle, signInWithFacebook, signInWithApple } from './auth';

const OAuthLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      // Redirect to dashboard or update app state
      window.location.href = '/dashboard';
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithFacebook();
    
    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithApple();
    
    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="oauth-login">
      {error && <div className="error">{error}</div>}
      
      <button 
        onClick={handleGoogleSignIn} 
        disabled={loading}
        className="btn-google"
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      
      <button 
        onClick={handleFacebookSignIn} 
        disabled={loading}
        className="btn-facebook"
      >
        {loading ? 'Signing in...' : 'Sign in with Facebook'}
      </button>
      
      <button 
        onClick={handleAppleSignIn} 
        disabled={loading}
        className="btn-apple"
      >
        {loading ? 'Signing in...' : 'Sign in with Apple'}
      </button>
    </div>
  );
};

export default OAuthLogin;
```

### React Native Example

For React Native, use `@react-native-firebase/auth`:

```javascript
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // From Firebase Console
});

export const signInWithGoogle = async () => {
  try {
    // Get user's ID token
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    
    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    
    // Sign-in the user with the credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    const user = userCredential.user;
    
    // Get Firebase ID token
    const firebaseIdToken = await user.getIdToken();
    
    // Send to backend
    const response = await axios.post(`${API_BASE_URL}/auth/oauth/login`, {
      idToken: firebaseIdToken,
      provider: 'google',
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber
    });
    
    if (response.data.success) {
      // Store token and user data
      await AsyncStorage.setItem('token', response.data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
      
      return {
        success: true,
        user: response.data.data
      };
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Google sign-in failed'
    };
  }
};
```

## How It Works

1. **Frontend**: User clicks "Sign in with Google/Facebook/Apple"
2. **Firebase SDK**: Handles the OAuth flow and returns a Firebase ID token
3. **Frontend**: Sends the Firebase ID token to your backend API
4. **Backend**: Verifies the token using Firebase Admin SDK
5. **Backend**: Creates or updates user account in database
6. **Backend**: Returns a JWT token for subsequent API requests
7. **Frontend**: Stores the JWT token and uses it for authenticated requests

## User Account Handling

- **New Users**: If a user signs in with OAuth for the first time, a new account is automatically created with:
  - Email verified (OAuth emails are pre-verified)
  - User type set to "Patient"
  - OAuth provider and ID stored
  - Profile picture from OAuth provider (if available)

- **Existing Users**: If a user with the same email already exists:
  - OAuth information is linked to the existing account
  - Profile picture and name are updated if provided
  - User can now use either password or OAuth to login

- **Account Linking**: If a user has both password and OAuth login, they can use either method to authenticate.

## Error Handling

Common errors and how to handle them:

1. **Invalid or expired token (401)**: 
   - Token may have expired, request a new one from Firebase
   - User may need to sign in again

2. **Provider mismatch (400)**:
   - The provider in the request doesn't match the token provider
   - Ensure you're using the correct provider name

3. **Email required (400)**:
   - Some OAuth providers don't provide email
   - Handle this case in your UI (request email separately)

4. **OAuth only for patients (403)**:
   - OAuth login is restricted to patients only
   - Providers and specialists must use regular login

## Security Considerations

1. **Token Verification**: Always verify tokens on the backend, never trust client-side tokens alone
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended for web)
4. **Token Expiration**: Handle token expiration gracefully
5. **CORS**: Configure CORS properly to allow only your frontend domain

## Testing

### Test the OAuth Endpoint

```bash
# Using curl (replace with actual Firebase ID token)
curl -X POST http://localhost:6000/api/v1/auth/oauth/login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "your-firebase-id-token",
    "provider": "google",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Test with Postman

1. Get a Firebase ID token from your frontend (check browser console)
2. Create a POST request to `/api/v1/auth/oauth/login`
3. Set Content-Type to `application/json`
4. Add the request body with `idToken` and `provider`
5. Send the request

## Troubleshooting

### "Firebase Admin not initialized"
- Check that `FIREBASE_CREDENTIAL` environment variable is set correctly
- Verify the Firebase service account JSON is valid

### "Invalid or expired token"
- Ensure the token is fresh (Firebase tokens expire after 1 hour)
- Check that Firebase is properly initialized on the frontend

### "Provider mismatch"
- Verify the provider name matches exactly: "google", "facebook", or "apple"
- Check that the Firebase token was issued by the correct provider

### User not created/updated
- Check database connection
- Verify user model schema includes OAuth fields
- Check server logs for errors

## Support

For issues or questions, please check:
- Firebase Authentication Documentation: https://firebase.google.com/docs/auth
- Backend API logs for detailed error messages
- Frontend browser console for client-side errors

