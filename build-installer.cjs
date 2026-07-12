const builder = require('electron-builder');
const Platform = builder.Platform;

builder.build({
  targets: Platform.WINDOWS.createTarget(['nsis', 'portable'], builder.Arch.x64),
  config: {
    appId: 'com.hkm.ministries.cms',
    productName: 'HKM Ministries CMS',
    directories: {
      output: 'release'
    },
    files: [
      'dist/**/*',
      'electron/**/*'
    ],
    win: {
      target: ['nsis', 'portable'],
      icon: 'public/icon.ico',
      sign: null,
      signingHashAlgorithms: []
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'HKM Ministries CMS'
    },
    portable: {
      artifactName: 'HKM-Ministries-CMS-Portable.exe'
    }
  }
}).then(() => {
  console.log('✅ Build complete! Check the release folder.');
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
