import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

// workaround for dev mode: https://www.electron.build/auto-update
import path from 'path';
process.env.APPIMAGE = path.join(__dirname, 'dist', `Nexus-${app.getVersion()}.AppImage`);
autoUpdater.forceDevUpdateConfig = true;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.autoRunAppAfterInstall = true;

let errorCallbackInternal = null;

autoUpdater.on('update-downloaded', (info) => {
  console.log(`update::update-downloaded: `, info);
});

autoUpdater.on('error', (info) => {
  console.log(`update::error: `, info);
  const error = {
    errorId: 'installUpdate',
    error: info,
  };

  errorCallbackInternal(error);
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

async function downloadUpdate(progressCallback) {
  try {
    console.log('update::downloadUpdate: downloading update');
    const abortId = 'downloadUpdate';

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`update::downloadUpdate::download-progress: `, progressObj);
      const progress = augmentOutputWithProgressId(progressObj, abortId);

      progressCallback(progress);
    });

    const downloadedFiles = await autoUpdater.downloadUpdate();
    console.log('update::downloadUpdate: downloadedFiles: ', downloadedFiles);

    return {
      status: 'success',
      downloadedFiles,
    };
  } catch (error) {
    console.log('update::downloadUpdate: Error downloading update:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

async function installUpdate(errorCallback) {
  try {
    errorCallbackInternal = errorCallback;
    console.log('update::installUpdate: installing update');
    autoUpdater.quitAndInstall();

    return {
      status: 'success',
    };
  } catch (error) {
    console.log('update::installUpdate: Error installing update:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

function augmentOutputWithProgressId(output, abortId) {
  output.progressId = abortId;

  return output;
}

export { checkForUpdates, getCurrentVersion, downloadUpdate, installUpdate };
