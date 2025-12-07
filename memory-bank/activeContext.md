# Active Context

## Current Focus: Logout Redirection

### 🎯 **Feature Overview**
- Updated logout functionality to redirect users to `/sign-in-patient` instead of the home page or generic login page.

### 🔧 **Technical Implementation**

#### **1. ProfileMenu Updates** (`src/components/ProfileMenu.tsx`)
- Changed `handleLogout` navigation from `'/'` to `'/sign-in-patient'`.

#### **2. SettingsPage Updates** (`src/pages/patientSetup/SettingsPage.tsx`)
- Changed `handleLogout` navigation from `'/login'` to `'/sign-in-patient'`.

### 📊 **Current Status**

#### ✅ **Completed Features**
1. **Simplified Booking Form**: No longer asks for home address.
2. **Age Validation**: Users must be at least 2 years old to be booked.
3. **Optional ID**: Identification number is optional and marked as such.
4. **Binary Gender**: Gender selection restricted to Male/Female.
5. **Accurate Receipt**: Correctly displays available address information.
6. **Draft Cleanup**: Booking draft is automatically cleared after successful payment.
7. **Default Service**: First service is auto-selected by default.
8. **Logout Redirection**: Logout now consistently redirects to `/sign-in-patient`.

### 📁 **Files Modified**
1. `src/components/ProfileMenu.tsx`
2. `src/pages/patientSetup/SettingsPage.tsx`
