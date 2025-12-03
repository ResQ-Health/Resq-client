# Quick Deployment Guide

Since Firebase CLI project initialization is having issues, use the **Firebase Console** method instead (it's actually easier!).

## 🚀 Deploy via Firebase Console (Recommended)

### Step 1: Deploy Firestore Rules

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: **resq-health-africa**
3. Go to **Firestore Database** → **Rules** tab
4. Copy the entire contents of `firebase-security-rules/firestore.rules`
5. Paste into the rules editor
6. Click **Publish**

### Step 2: Deploy Storage Rules

1. In the same Firebase Console
2. Go to **Storage** → **Rules** tab
3. Copy the entire contents of `firebase-security-rules/storage.rules`
4. Paste into the rules editor
5. Click **Publish**

### Step 3: Deploy Realtime Database Rules (if you use it)

1. In Firebase Console
2. Go to **Realtime Database** → **Rules** tab
3. Copy the entire contents of `firebase-security-rules/realtime-database.rules.json`
4. Paste into the rules editor
5. Click **Publish**

## ✅ Verify Deployment

After publishing, you should see:
- ✅ Rules saved successfully
- ✅ Rules are now active

## 🔧 Alternative: Fix Firebase CLI (Optional)

If you want to use CLI later, you need to:

1. **Verify project exists**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Make sure `resq-health-africa` project exists
   - If not, create it first

2. **Re-authenticate**:
   ```bash
   firebase logout
   firebase login
   ```

3. **List projects**:
   ```bash
   firebase projects:list
   ```

4. **Set active project**:
   ```bash
   firebase use resq-health-africa
   ```

5. **Deploy**:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

## 📝 Notes

- The `.firebaserc` file has been created with your project ID
- The `firebase.json` file is configured correctly
- Console deployment is just as secure as CLI deployment
- Rules take effect immediately after publishing

