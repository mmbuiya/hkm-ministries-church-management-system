# Google Sign-In Setup Guide

## Overview
Google Sign-In is now fully implemented using Firebase authentication. This guide explains how to enable it.

## Prerequisites
- Firebase project is already configured (credentials in `.env.local`)
- Google OAuth is enabled in your Firebase project

## Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hkm-church-management`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google**
5. Enable it and set up the OAuth consent screen:
   - User Type: External
   - Add test users (for development)
   - Configure the consent screen with app name and logo

## Configuration

Your Firebase credentials are already configured in `.env.local`:
```
VITE_FIREBASE_API_KEY=AIzaSyDbTBzggKOu-X9xpXLwrEBdP7wLT6dsepI
VITE_FIREBASE_AUTH_DOMAIN=hkm-church-management.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hkm-church-management
VITE_FIREBASE_STORAGE_BUCKET=hkm-church-management.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1067271076976
VITE_FIREBASE_APP_ID=1:1067271076976:web:6dffc67073969d04c6c8b5
```

## How It Works

### 1. **Click "Sign in with Google"**
   - User clicks the Google Sign-In button on the login page

### 2. **Firebase Popup**
   - Firebase opens a popup for the user to select/login with their Google account
   - User grants permission to access email, name, and profile picture

### 3. **User Data Extraction**
   - Firebase returns the authenticated user with:
     - `email`: User's Google email
     - `displayName`: User's full name
     - `photoURL`: User's profile picture

### 4. **App User Creation/Update**
   - System checks if a user with that email exists in the app database
   - If new user: Creates account with Admin role (first user) or Member role
   - If existing user: Updates last login timestamp

### 5. **Session Creation**
   - System creates a session for the user
   - Checks if 2FA is enabled
   - If yes: Redirects to 2FA verification
   - If no: Completes login and goes to dashboard

## For Electron App

When building the Electron app, Google Sign-In should work seamlessly:
- The Firebase popup will open as a native window
- No additional configuration needed beyond Firebase setup

## Troubleshooting

### "Pop-up was blocked"
- Browser is blocking popups. Whitelist the domain or disable popup blocker.

### "Operation not allowed"
- Google Sign-In is not enabled in Firebase Console. Enable it in the Sign-in method settings.

### "Network error"
- Check internet connection
- Verify Firebase configuration is correct

### "Sign-in was cancelled"
- User closed the Google Sign-In popup before completing authentication
- This is normal, just try again

### Empty displayName or photoURL
- Fallback to username from email
- Use UI Avatars service for default avatar

## Files Modified

1. **firebaseService.ts** - Added `googleSignIn()` method
2. **LoginPage.tsx** - Updated error handling for Google Sign-In
3. **App.tsx** - Implemented complete Google login flow with user creation/update
4. **firebaseConfig.ts** - Already exports `googleProvider`

## Testing

1. Run the development server: `npm run dev`
2. Go to login page
3. Click "Sign in with Google"
4. Complete the Google authentication flow
5. New user will be created in the app database
6. You'll be logged in automatically

## Production Considerations

For production deployment:
- Ensure your Electron app origin is authorized in Google Cloud Console
- Update Firebase security rules to allow OAuth authentication
- Consider implementing additional security measures for OAuth tokens
