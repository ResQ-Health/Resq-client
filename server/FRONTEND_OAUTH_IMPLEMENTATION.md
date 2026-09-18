# Frontend OAuth Implementation Guide

This guide shows you how to implement Google/Facebook/Apple login on your frontend using both **custom implementation** and **Firebase UI (prebuilt components)**.

## Option 1: Using Firebase UI (Easiest - Prebuilt Components) ⭐ RECOMMENDED

Firebase UI provides ready-made login buttons and screens. This is the fastest way to get OAuth working.

### Step 1: Install Dependencies

```bash
npm install firebase react-firebase-hooks
# or
yarn add firebase react-firebase-hooks
```

### Step 2: Create Firebase Configuration File

Create `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### Step 3: Create Login Component with Firebase UI

Create `src/components/OAuthLogin.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { StyledFirebaseAuth } from 'react-firebaseui';
import { auth } from '../config/firebase';
import { GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from 'firebase/auth';
import axios from 'axios';

const OAuthLogin = ({ onLoginSuccess, onLoginError }) => {
  const [loading, setLoading] = useState(false);

  // Configure Firebase UI
  const uiConfig = {
    signInFlow: 'popup', // or 'redirect'
    signInOptions: [
      GoogleAuthProvider.PROVIDER_ID,
      FacebookAuthProvider.PROVIDER_ID,
      {
        provider: OAuthProvider.PROVIDER_ID,
        providerName: 'apple.com',
        buttonColor: '#000000',
        iconUrl: 'https://www.apple.com/favicon.ico',
      }
    ],
    callbacks: {
      signInSuccessWithAuthResult: async (authResult, redirectUrl) => {
        // This function is called when user successfully signs in
        await handleOAuthLogin(authResult.user);
        return false; // Don't redirect automatically
      },
      signInFailure: (error) => {
        console.error('Sign-in error:', error);
        if (onLoginError) {
          onLoginError(error.message);
        }
        return Promise.resolve();
      }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
  };

  const handleOAuthLogin = async (user) => {
    setLoading(true);
    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      
      // Determine provider
      let provider = 'google';
      if (user.providerData && user.providerData.length > 0) {
        const providerId = user.providerData[0].providerId;
        if (providerId === 'facebook.com') provider = 'facebook';
        else if (providerId === 'apple.com') provider = 'apple';
        else if (providerId === 'google.com') provider = 'google';
      }

      // Send to your backend API
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api/v1';
      const response = await axios.post(`${API_BASE_URL}/auth/oauth/login`, {
        idToken,
        provider,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Call success callback
        if (onLoginSuccess) {
          onLoginSuccess(response.data.data);
        }
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      if (onLoginError) {
        onLoginError(error.response?.data?.message || error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oauth-login-container">
      {loading && <div className="loading">Signing in...</div>}
      <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
    </div>
  );
};

export default OAuthLogin;
```

### Step 4: Install Firebase UI Styles

Install Firebase UI CSS:

```bash
npm install firebaseui
# or
yarn add firebaseui
```

Import the CSS in your main `App.js` or `index.js`:

```javascript
import 'firebaseui/dist/firebaseui.css';
```

### Step 5: Use the Component

In your login page or component:

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OAuthLogin from '../components/OAuthLogin';

const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData);
    // Redirect to dashboard or home
    navigate('/dashboard');
  };

  const handleLoginError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <div className="login-page">
      <h1>Sign In</h1>
      {error && <div className="error-message">{error}</div>}
      <OAuthLogin 
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    </div>
  );
};

export default LoginPage;
```

---

## Option 2: Custom Implementation (More Control)

If you want custom-styled buttons instead of Firebase UI, use this approach.

### Step 1: Install Dependencies

```bash
npm install firebase axios
# or
yarn add firebase axios
```

### Step 2: Create Firebase Configuration

Same as Option 1, Step 2.

### Step 3: Create Custom OAuth Service

Create `src/services/authService.js`:

```javascript
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api/v1';

/**
 * Sign in with Google
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
      // Store token and user data
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
      error: error.response?.data?.message || error.message || 'Google sign-in failed'
    };
  }
};

/**
 * Sign in with Facebook
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
      error: error.response?.data?.message || error.message || 'Facebook sign-in failed'
    };
  }
};

/**
 * Sign in with Apple
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
      error: error.response?.data?.message || error.message || 'Apple sign-in failed'
    };
  }
};
```

### Step 4: Create Custom Login Component

Create `src/components/CustomOAuthLogin.jsx`:

```jsx
import React, { useState } from 'react';
import { signInWithGoogle, signInWithFacebook, signInWithApple } from '../services/authService';
import './OAuthLogin.css'; // Your custom styles

const CustomOAuthLogin = ({ onLoginSuccess, onLoginError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      setError(result.error);
      if (onLoginError) {
        onLoginError(result.error);
      }
    }
    
    setLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithFacebook();
    
    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      setError(result.error);
      if (onLoginError) {
        onLoginError(result.error);
      }
    }
    
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const result = await signInWithApple();
    
    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      setError(result.error);
      if (onLoginError) {
        onLoginError(result.error);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="oauth-login">
      {error && <div className="error-message">{error}</div>}
      
      <button 
        onClick={handleGoogleSignIn} 
        disabled={loading}
        className="btn-google"
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>
      
      <button 
        onClick={handleFacebookSignIn} 
        disabled={loading}
        className="btn-facebook"
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <svg className="facebook-icon" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
          </>
        )}
      </button>
      
      <button 
        onClick={handleAppleSignIn} 
        disabled={loading}
        className="btn-apple"
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <svg className="apple-icon" viewBox="0 0 24 24" fill="#000000">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Continue with Apple</span>
          </>
        )}
      </button>
    </div>
  );
};

export default CustomOAuthLogin;
```

### Step 5: Add Custom Styles

Create `src/components/OAuthLogin.css`:

```css
.oauth-login {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.oauth-login button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.oauth-login button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.oauth-login button svg {
  width: 20px;
  height: 20px;
}

.btn-google {
  background-color: #fff;
  color: #333;
  border: 1px solid #dadce0;
}

.btn-google:hover:not(:disabled) {
  background-color: #f8f9fa;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn-facebook {
  background-color: #1877F2;
  color: #fff;
}

.btn-facebook:hover:not(:disabled) {
  background-color: #166fe5;
}

.btn-apple {
  background-color: #000;
  color: #fff;
}

.btn-apple:hover:not(:disabled) {
  background-color: #333;
}

.error-message {
  padding: 12px;
  background-color: #fee;
  color: #c33;
  border-radius: 4px;
  margin-bottom: 16px;
}
```

### Step 6: Use the Component

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import CustomOAuthLogin from '../components/CustomOAuthLogin';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData);
    navigate('/dashboard');
  };

  const handleLoginError = (error) => {
    console.error('Login error:', error);
  };

  return (
    <div className="login-page">
      <h1>Sign In</h1>
      <CustomOAuthLogin 
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    </div>
  );
};

export default LoginPage;
```

---

## Environment Variables Setup

Create `.env` file in your frontend root:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyApMd_5NJW1h8elnWFLB5FM-TYF1ycgkMw
REACT_APP_FIREBASE_AUTH_DOMAIN=resq-health-africa.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=resq-health-africa
REACT_APP_FIREBASE_STORAGE_BUCKET=resq-health-africa.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=653104696055
REACT_APP_FIREBASE_APP_ID=1:653104696055:web:58072df5159c77c1c9e1f2

REACT_APP_API_URL=http://localhost:6000/api/v1
```

---

## Quick Start Checklist

- [ ] Install dependencies (`firebase`, `react-firebase-hooks` or `firebaseui`)
- [ ] Create Firebase config file
- [ ] Add environment variables to `.env`
- [ ] Enable OAuth providers in Firebase Console
- [ ] Choose Option 1 (Firebase UI) or Option 2 (Custom)
- [ ] Create login component
- [ ] Test the login flow

---

## Which Option Should You Choose?

**Option 1 (Firebase UI)** - Best if you want:
- ✅ Quick setup (5 minutes)
- ✅ Professional prebuilt UI
- ✅ Less code to maintain
- ✅ Consistent design

**Option 2 (Custom)** - Best if you want:
- ✅ Full control over styling
- ✅ Custom user experience
- ✅ Match your app's design system
- ✅ More flexibility

---

## Troubleshooting

### "Firebase: Error (auth/popup-closed-by-user)"
- User closed the popup window
- Handle gracefully in your error handler

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### "Network Error" when calling backend
- Check `REACT_APP_API_URL` is correct
- Ensure backend server is running
- Check CORS settings on backend

### Token not being sent
- Verify `getIdToken()` is being called
- Check token is included in request body

---

## Next Steps

1. Test the login flow
2. Handle authenticated routes
3. Add logout functionality
4. Store user data in context/state management
5. Add protected routes

For more details, see `README_OAUTH_INTEGRATION.md`

