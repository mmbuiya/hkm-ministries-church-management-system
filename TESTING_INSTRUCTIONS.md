# Desktop App - Testing Instructions

## What Was Fixed

### Issue
The desktop app was getting stuck on "Initializing secure session..." screen when launched.

### Root Cause
The Content Security Policy (CSP) in the Electron main process was too restrictive and was blocking Clerk authentication from loading properly.

### Solution Applied
1. **Updated CSP in `electron/main.js`**:
   - Added `https://*.clerk.com` to allowed script and image sources
   - Added `https://esm.sh` for ES module imports
   - Added `child-src` directive for iframe support
   - Added Hasura endpoints to `connect-src` for GraphQL queries

2. **Rebuilt the app** with the updated CSP configuration

3. **Created build scripts** to make future builds easier

## How to Test

### Step 1: Launch the Desktop App
```
release\win-unpacked\HKM Ministries CMS.exe
```

### Step 2: Verify Authentication
1. The app should load and show the Clerk sign-in page (not stuck on "Initializing...")
2. Sign in with your credentials
3. Verify you can access the dashboard

### Step 3: Test Core Functionality
Once signed in, test these features:
- [ ] Dashboard loads with statistics
- [ ] Members page loads and displays data
- [ ] Can add a new member
- [ ] Transactions page works
- [ ] Attendance marking works
- [ ] Settings page accessible

### Step 4: Test Offline Sync
1. Check the bottom-right corner for the offline indicator
2. Disconnect from internet
3. Try to add/edit data (should queue for sync)
4. Reconnect to internet
5. Verify data syncs automatically

### Step 5: Test Real-time Updates
1. Open the web app in a browser
2. Open the desktop app
3. Make a change in one (e.g., add a member)
4. Verify the change appears in the other within 5 seconds

## Expected Behavior

### ✅ Working
- App launches successfully
- Clerk authentication loads and works
- Can sign in and access all features
- Data syncs with web version
- Offline indicator shows connection status
- All CRUD operations work

### ⚠️ Known Limitations
- Installer build fails due to Windows permissions (use unpacked version)
- First launch might be slower as Electron initializes
- DevTools can be opened from View menu for debugging

## If Issues Persist

### Authentication Still Not Working
1. Check internet connection
2. Verify Clerk service is accessible: https://clerk.com/status
3. Open DevTools (View → Toggle DevTools) and check console for errors
4. Try clearing Electron cache:
   - Close the app
   - Delete: `%APPDATA%\hkm-ministries-cms\`
   - Restart the app

### App Won't Launch
1. Check if antivirus is blocking it
2. Try running as administrator
3. Verify all files in `win-unpacked` folder are present
4. Check Windows Event Viewer for crash logs

### Data Not Syncing
1. Verify internet connection
2. Check Hasura endpoint is accessible
3. Look at the offline indicator status
4. Check DevTools console for sync errors

## Rebuilding the App

If you need to rebuild after making changes:

### Quick Build (Recommended)
```bash
create-portable.bat
```

### Manual Build
```bash
npm run build
npm run electron:build
```

Note: The installer build will fail due to Windows permissions. Use the unpacked version instead.

## Next Steps

After testing, if everything works:
1. ✅ Desktop app authentication is fixed
2. ✅ App can be distributed by copying the `win-unpacked` folder
3. ✅ Users can run it without installation
4. ⚠️ Installer version requires Windows Developer Mode or admin privileges (optional)

## Distribution

To distribute the app to users:
1. Copy the entire `release\win-unpacked\` folder
2. Rename it to "HKM Ministries CMS"
3. Create a shortcut to the `.exe` file
4. Zip the folder for easy transfer
5. Users can extract and run directly (no installation needed)

## Support

For issues or questions:
- Check `DESKTOP_APP_GUIDE.md` for detailed documentation
- Review console logs in DevTools
- Check network tab for failed requests
- Verify environment variables are embedded in build
