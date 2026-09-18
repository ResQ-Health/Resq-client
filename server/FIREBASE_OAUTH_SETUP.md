# Firebase OAuth Setup Status

## ✅ Configuration Verified

Your Firebase configuration has been verified and is ready for OAuth integration.

### Backend Configuration (Server)

**Status:** ✅ Configured and Initialized

- **Firebase Admin SDK**: Initialized successfully
- **Project ID**: `resq-health-africa`
- **Service Account**: Configured via `FIREBASE_CREDENTIAL` environment variable
- **OAuth Endpoint**: `/api/v1/auth/oauth/login` (Ready)

### Frontend Configuration (Client)

Use these values in your frontend `.env` file:

```env
# Firebase Client Configuration (for frontend)
REACT_APP_FIREBASE_API_KEY=AIzaSyApMd_5NJW1h8elnWFLB5FM-TYF1ycgkMw
REACT_APP_FIREBASE_AUTH_DOMAIN=resq-health-africa.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=resq-health-africa
REACT_APP_FIREBASE_STORAGE_BUCKET=resq-health-africa.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=653104696055
REACT_APP_FIREBASE_APP_ID=1:653104696055:web:58072df5159c77c1c9e1f2
REACT_APP_FIREBASE_MEASUREMENT_ID=G-2BFCNPZ395

# API Base URL
REACT_APP_API_URL=http://localhost:6000/api/v1
# For production, use: REACT_APP_API_URL=https://your-production-api.com/api/v1
```

## Next Steps

### 1. Enable OAuth Providers in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **resq-health-africa**
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the providers you want to support:

#### Google Sign-In
- Click on **Google**
- Toggle **Enable**
- Enter your project's support email
- Click **Save**

#### Facebook Sign-In
- Click on **Facebook**
- Toggle **Enable**
- Enter your **App ID** and **App Secret** from [Facebook Developers](https://developers.facebook.com/)
- Add your OAuth redirect URI: `https://resq-health-africa.firebaseapp.com/__/auth/handler`
- Click **Save**

#### Apple Sign-In
- Click on **Apple**
- Toggle **Enable**
- Configure with your Apple Developer account details
- Click **Save**

### 2. Frontend Integration

Copy the Firebase configuration code from `README_OAUTH_INTEGRATION.md` and use it in your frontend.

**Quick Start Example:**

```javascript
// firebase.js (in your frontend)
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 3. Test the OAuth Flow

1. **Start your backend server:**
   ```bash
   npm run dev
   ```

2. **Test the OAuth endpoint:**
   - Use the frontend to sign in with Google/Facebook/Apple
   - The Firebase ID token will be sent to `/api/v1/auth/oauth/login`
   - Check the response to verify user creation/login

3. **Verify in MongoDB:**
   - Check that user documents are created with `oauth_provider` and `oauth_metadata` fields
   - Verify that `email_verified` is set to `true` for OAuth users

## API Endpoint

**POST** `/api/v1/auth/oauth/login`

**Request Body:**
```json
{
  "idToken": "firebase-id-token-from-frontend",
  "provider": "google",
  "email": "user@example.com",
  "name": "John Doe",
  "photoURL": "https://...",
  "phoneNumber": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "oauth_provider": "google",
    "oauth_id": "oauth-user-id",
    "oauth_metadata": {
      "provider_user_id": "oauth-user-id",
      "provider_email": "user@example.com",
      "provider_name": "John Doe",
      "provider_photo": "https://...",
      "last_oauth_login": "2024-01-01T00:00:00.000Z",
      "oauth_account_created": "2024-01-01T00:00:00.000Z"
    },
    "email_verified": true,
    "token": "jwt-token-here"
  }
}
```

## Troubleshooting

### Firebase Admin Not Initialized
- **Error**: "Firebase Admin not properly configured"
- **Solution**: Check that `FIREBASE_CREDENTIAL` is set in your `.env` file
- **Verify**: Run `node -e "require('dotenv').config(); console.log(process.env.FIREBASE_CREDENTIAL ? 'Set' : 'Missing')"`

### Invalid Token Error
- **Error**: "Invalid or expired token"
- **Solution**: Ensure the Firebase ID token is fresh (tokens expire after 1 hour)
- **Check**: Verify Firebase is properly initialized on the frontend

### Provider Not Enabled
- **Error**: "Invalid provider"
- **Solution**: Enable the provider in Firebase Console → Authentication → Sign-in method

## Security Notes

1. ✅ Firebase Admin credentials are stored securely in environment variables
2. ✅ Token verification happens on the backend (never trust client-side tokens)
3. ✅ All OAuth data is stored in MongoDB with proper metadata
4. ✅ JWT tokens are generated for authenticated requests

## Support

For detailed integration instructions, see:
- `README_OAUTH_INTEGRATION.md` - Complete frontend integration guide
- Firebase Documentation: https://firebase.google.com/docs/auth

