import { app, BrowserWindow, Menu, session, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Note: squirrel-startup check is skipped for ES modules - handle separately if needed
let mainWindow;

// Content Security Policy for production
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://*.clerk.accounts.dev https://clerk.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob: https://img.clerk.com",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://generativelanguage.googleapis.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://challenges.clerk.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.clerk.accounts.dev https://challenges.clerk.com",
  "worker-src 'self' blob:",
].join('; ');

const createWindow = () => {
  // Set CSP headers for all requests
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP]
      }
    });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // Delay opening DevTools to avoid blank screen
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Detailed logging to diagnose blank/renderer issues
  mainWindow.webContents.on('crashed', () => {
    console.error('WebContents crashed');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('did-finish-load:', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [level=${level}] ${message} (source: ${sourceId}:${line})`);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('WebContents became unresponsive');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Show window when ready to show
  mainWindow.once('ready-to-show', () => {
    console.log('ready-to-show fired');
    mainWindow.show();
  });

  // Ensure window shows even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('ready-to-show did not fire; forcing show()');
      mainWindow.show();
    }
  }, 2000);

  // Build menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HKM Ministries CMS',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'HKM Ministries Church Management System',
              detail: 'Version 1.0.0\n\nA comprehensive church management solution.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
