# Quick Start: OAuth Login in 5 Minutes ⚡

## Fastest Way: Using Firebase UI (Prebuilt Components)

### 1. Install Dependencies

```bash
npm install firebase react-firebase-hooks firebaseui
```

### 2. Create Firebase Config

Create `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyApMd_5NJW1h8elnWFLB5FM-TYF1ycgkMw",
  authDomain: "resq-health-africa.firebaseapp.com",
  projectId: "resq-health-africa",
  storageBucket: "resq-health-africa.firebasestorage.app",
  messagingSenderId: "653104696055",
  appId: "1:653104696055:web:58072df5159c77c1c9e1f2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 3. Create Login Component

Create `src/components/Login.jsx`:

```jsx
import React, { useState } from 'react';
import { StyledFirebaseAuth } from 'react-firebaseui';
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import 'firebaseui/dist/firebaseui.css';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const uiConfig = {
    signInFlow: 'popup',
    signInOptions: [
      GoogleAuthProvider.PROVIDER_ID,
      FacebookAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      signInSuccessWithAuthResult: async (authResult) => {
        const user = authResult.user;
        setLoading(true);
        
        try {
          const idToken = await user.getIdToken();
          const provider = user.providerData[0]?.providerId === 'google.com' ? 'google' : 'facebook';
          
          const response = await axios.post('http://localhost:6000/api/v1/auth/oauth/login', {
            idToken,
            provider,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL
          });
          
          if (response.data.success) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data));
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error('Login error:', error);
          alert('Login failed: ' + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
        
        return false;
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Sign In</h1>
      {loading && <p>Signing in...</p>}
      <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
    </div>
  );
};

export default Login;
```

### 4. Use It

```jsx
import Login from './components/Login';

function App() {
  return <Login />;
}
```

### 5. Enable Providers in Firebase Console

1. Go to https://console.firebase.google.com/
2. Select project: **resq-health-africa**
3. Authentication → Sign-in method
4. Enable **Google** and **Facebook**
5. Save

**Done!** 🎉 You now have OAuth login working.

---

## Even Simpler: Just Google Button

If you only want Google login, here's the minimal code:

```jsx
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './config/firebase';
import axios from 'axios';

const GoogleLoginButton = () => {
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const response = await axios.post('http://localhost:6000/api/v1/auth/oauth/login', {
        idToken,
        provider: 'google',
        email: result.user.email,
        name: result.user.displayName
      });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
};
```

That's it! One button, one function, done. ✅

