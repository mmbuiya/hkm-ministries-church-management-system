# HKM Ministries CMS - Desktop App Guide

## Overview
The HKM Ministries Church Management System is now available as a desktop application built with Electron. The desktop app provides the same functionality as the web version with the added benefits of:

- **Offline Support**: Work without an internet connection and sync when back online
- **Native Desktop Experience**: Runs as a standalone application
- **Real-time Sync**: Automatically syncs with the web and mobile versions through Firebase/Hasura
- **Cross-Platform**: Can be built for Windows, macOS, and Linux

## Building the Desktop App

### Prerequisites
- Node.js and npm installed
- All project dependencies installed (`npm install`)

### Build Instructions

#### Option 1: Using the Batch Script (Windows - Recommended)
```bash
create-portable.bat
```

This script will:
1. Build the web app using Vite
2. Package it as an Electron desktop app
3. Create the executable in `release/win-unpacked/`

#### Option 2: Manual Build
```bash
# Build the web app
npm run build

# Build the Electron app
npm run electron:build
```

### Running the Desktop App

After building, you can find the app at:
```
release/win-unpacked/HKM Ministries CMS.exe
```

Double-click to run the application.

## Recent Fixes

### Authentication Issue Fix (January 2026)
**Problem**: Desktop app was getting stuck on "Initializing secure session..." screen.

**Root Cause**: Content Security Policy (CSP) in Electron was too restrictive and blocking Clerk authentication from loading properly.

**Solution**: Updated `electron/main.js` to include more permissive CSP rules:
- Added `https://*.clerk.com` to allowed domains
- Added `https://esm.sh` for ES module imports
- Added `child-src` directive for iframe support
- Added Hasura GraphQL endpoints to `connect-src`

The environment variables from `.env` file are properly embedded during the Vite build process, so no additional configuration is needed.

## Known Issues

### Installer Build Fails
**Issue**: Building the NSIS installer fails with symbolic link creation errors due to Windows permissions.

**Workaround**: Use the unpacked version from `release/win-unpacked/` instead. You can:
1. Copy the entire `win-unpacked` folder to distribute the app
2. Create a shortcut to the `.exe` file for easy access
3. Zip the folder for distribution

**Technical Details**: The error occurs when electron-builder tries to extract the winCodeSign tool, which contains symbolic links that require administrator privileges on Windows.

## Offline Sync Features

The desktop app includes offline sync capabilities:

### How It Works
1. **IndexedDB Storage**: Data is cached locally using IndexedDB
2. **Automatic Sync**: When online, changes sync automatically every 30 seconds
3. **Pending Operations**: Offline changes are queued and synced when connection is restored
4. **Visual Indicator**: Shows online/offline status and pending sync count

### Synced Data
- Members
- Transactions
- Attendance records
- Equipment inventory
- Financial records

## Environment Variables

The following environment variables are required and are embedded during build:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_HASURA_GRAPHQL_URL=https://...
VITE_HASURA_ADMIN_SECRET=...
```

These are read from the `.env` file during the `npm run build` step and baked into the JavaScript bundle.

## Distribution

### For End Users
1. Copy the entire `release/win-unpacked/` folder
2. Rename it to something user-friendly like "HKM Ministries CMS"
3. Create a shortcut to the `.exe` file
4. Distribute the folder (can be zipped for easier transfer)

### For Developers
- The unpacked version is portable and doesn't require installation
- Users can run it directly from any location
- No administrator privileges required to run (only to build installer)

## Troubleshooting

### App Won't Start
1. Make sure all files in the `win-unpacked` folder are present
2. Check if antivirus is blocking the executable
3. Try running as administrator

### Authentication Not Working
1. Verify internet connection
2. Check if Clerk service is accessible
3. Clear browser cache (Electron uses Chromium)
4. Check console logs in DevTools (View menu → Toggle DevTools)

### Sync Issues
1. Check internet connection
2. Verify Hasura endpoint is accessible
3. Check the offline indicator in the bottom-right corner
4. Review pending operations count

## Development

### Running in Development Mode
```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Launch Electron with hot-reload enabled
3. Open DevTools automatically

### Debugging
- DevTools are available in development mode
- Console logs from renderer process appear in DevTools
- Main process logs appear in the terminal

## Technical Architecture

### Stack
- **Frontend**: React + TypeScript + Vite
- **Desktop Framework**: Electron
- **Authentication**: Clerk
- **Database**: Hasura GraphQL + Firebase
- **Offline Storage**: IndexedDB (via idb library)
- **State Management**: React Context + Apollo Client

### Security
- Content Security Policy (CSP) enforced
- Context isolation enabled
- Node integration disabled
- Web security enabled
- Secure IPC communication

## Future Improvements

- [ ] Fix installer build issues (requires Windows Developer Mode or admin privileges)
- [ ] Add auto-update functionality
- [ ] Implement better offline conflict resolution
- [ ] Add desktop notifications
- [ ] Create macOS and Linux builds
- [ ] Add system tray integration
- [ ] Implement local backup/restore functionality
