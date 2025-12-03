# Firebase Security Rules

This directory contains Firebase Security Rules for your RESQ healthcare platform. These rules ensure that only authorized users can access and modify data in your Firebase services.

## 📁 Files

- **`firestore.rules`** - Security rules for Cloud Firestore database
- **`storage.rules`** - Security rules for Firebase Storage
- **`realtime-database.rules.json`** - Security rules for Realtime Database (if used)

## 🚀 How to Deploy

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in your project** (if not already done):
```bash
firebase init
```
Select:
- Firestore
- Storage
- Realtime Database (if needed)

4. **Deploy Firestore Rules**:
```bash
firebase deploy --only firestore:rules
```

5. **Deploy Storage Rules**:
```bash
firebase deploy --only storage
```

6. **Deploy Realtime Database Rules** (if used):
```bash
firebase deploy --only database
```

### Option 2: Using Firebase Console

#### Firestore Rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `resq-health-africa`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules`
5. Paste into the rules editor
6. Click **Publish**

#### Storage Rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `resq-health-africa`
3. Navigate to **Storage** → **Rules** tab
4. Copy the contents of `storage.rules`
5. Paste into the rules editor
6. Click **Publish**

#### Realtime Database Rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `resq-health-africa`
3. Navigate to **Realtime Database** → **Rules** tab
4. Copy the contents of `realtime-database.rules.json`
5. Paste into the rules editor
6. Click **Publish**

## 🔒 Security Features

### Firestore Rules
- ✅ Users can only read/update their own profile
- ✅ Patients can create and manage their own appointments
- ✅ Providers can read patient profiles (for booking)
- ✅ Patients can create reviews for providers
- ✅ Secure messaging between users
- ✅ Prevents unauthorized data access

### Storage Rules
- ✅ Profile pictures: Users can only upload their own
- ✅ File size limits: 5MB for images, 10MB for documents
- ✅ File type validation: Only allowed image/document formats
- ✅ Patient documents: Only accessible by the patient
- ✅ Provider documents: Publicly readable for verification

### Realtime Database Rules
- ✅ User presence tracking
- ✅ Secure notifications
- ✅ Appointment access control
- ✅ Chat message security

## 🧪 Testing Rules

### Using Firebase Emulator Suite

1. **Start the emulator**:
```bash
firebase emulators:start
```

2. **Test rules** using the Firebase Console or your application

### Using Firebase Rules Unit Testing

Create test files in `firebase-security-rules/tests/`:

```javascript
// Example test
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

// Test that users can only read their own data
```

## 📝 Customization

### Adjusting File Size Limits

In `storage.rules`, modify the size limits:
```javascript
request.resource.size < 5 * 1024 * 1024  // 5MB
request.resource.size < 10 * 1024 * 1024 // 10MB
```

### Adding Admin Role

To add admin access, update the helper functions:

```javascript
function isAdmin() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

Then use `isAdmin()` in your rules where needed.

### Adding Provider Authorization

For provider access to patient documents, add authorization checks:

```javascript
function isAuthorizedProvider(patientId) {
  // Check if provider has an active appointment with patient
  // This requires additional Firestore queries
  return isProvider() && /* your authorization logic */;
}
```

## ⚠️ Important Notes

1. **Always test rules** in the Firebase Emulator before deploying to production
2. **Review rules regularly** to ensure they match your application's requirements
3. **Monitor Firebase logs** for denied requests
4. **Keep rules simple** - complex rules can impact performance
5. **Use helper functions** to avoid code duplication

## 🔍 Monitoring

Monitor rule violations in Firebase Console:
- **Firestore**: Firestore Database → Usage → Denied requests
- **Storage**: Storage → Usage → Denied requests
- **Realtime Database**: Realtime Database → Usage → Denied requests

## 📚 Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules Documentation](https://firebase.google.com/docs/storage/security)
- [Realtime Database Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

## 🆘 Troubleshooting

### Rules not working?
1. Check that rules are deployed: `firebase deploy --only firestore:rules`
2. Verify syntax: Use Firebase Console rules simulator
3. Check authentication: Ensure users are properly authenticated
4. Review logs: Check Firebase Console for denied requests

### Performance issues?
1. Minimize `get()` calls in rules
2. Use indexes for queries
3. Cache frequently accessed data
4. Simplify complex rule logic

