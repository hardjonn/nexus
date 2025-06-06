import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

// workaround for dev mode: https://www.electron.build/auto-update
import path from 'path';
process.env.APPIMAGE = path.join(__dirname, 'dist', `app_name-${app.getVersion()}.AppImage`);
autoUpdater.forceDevUpdateConfig = true;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`update::download-progress: `, progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log(`update::update-downloaded: `, info);
  // autoUpdater.quitAndInstall();
});

async function getCurrentVersion() {
  try {
    console.log('update::getCurrentVersion: getting current version');
    return {
      status: 'success',
      version: app.getVersion(),
    };
  } catch (error) {
    console.error('update::getCurrentVersion: Error getting current version:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

async function checkForUpdates() {
  try {
    console.log('update::checkForUpdates: checking for updates');
    const updateCheckResult = await autoUpdater.checkForUpdates();

    console.log('update::checkForUpdates: updateCheckResult: ', updateCheckResult);

    const downloadedFiles = await autoUpdater.downloadUpdate();
    console.log('update::checkForUpdates: downloadedFiles: ', downloadedFiles);

    return {
      status: 'success',
      updateCheckResult,
    };
  } catch (error) {
    console.log('update::checkForUpdates: Error checking for updates:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

export { checkForUpdates, getCurrentVersion };
