import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer');
import { getConfigApp_WindowBounds, saveConfigApp_WindowBounds, saveConfigApp_ActiveTab, getConfig, saveConfig } from './conf';
import {
  getGames,
  uploadIcon,
  saveGameItem,
  uploadGameToRemote,
  abortRsyncTransfer,
  calculateHashAndSize,
  deleteGameFromLocal,
  requestDownloadDetails,
  downloadGameFromRemote,
} from './games';

let progressCallback = null;

function createWindow() {
  // retrieve the window bounds from the config
  const windowBounds = getConfigApp_WindowBounds();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // webSecurity: false,
      // allowRunningInsecureContent: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resized', () => {
    const windowBounds = mainWindow.getBounds();
    console.log('resized', windowBounds);
    saveConfigApp_WindowBounds(windowBounds);
  });

  mainWindow.on('moved', () => {
    const windowBounds = mainWindow.getBounds();
    console.log('moved', windowBounds);
    saveConfigApp_WindowBounds(windowBounds);
  });

  mainWindow.on('move', () => {
    const windowBounds = mainWindow.getBounds();
    console.log('move', windowBounds);
    saveConfigApp_WindowBounds(windowBounds);
  });

  mainWindow.on('resize', () => {
    const windowBounds = mainWindow.getBounds();
    console.log('resize', windowBounds);
    saveConfigApp_WindowBounds(windowBounds);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  progressCallback = (data) => mainWindow.webContents.send('progress', data);

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Install `Vue.js devtools` extension
  installExtension(VUEJS_DEVTOOLS)
    .then((ext) => console.log(`InstallExtension: Added Extension: ${ext.name}`))
    .catch((err) => console.log('InstallExtension: Failed with:', err));

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('config/get', async () => {
  return getConfig();
});

ipcMain.handle('config/save', async (event, configData) => {
  return saveConfig(configData);
});

ipcMain.on('config/save/app/active_tab', (event, tabName) => {
  console.log('on.config/save/app/active_tab: tabName:', tabName);
  saveConfigApp_ActiveTab(tabName);
});

ipcMain.handle('games/get', async () => {
  return await getGames();
});

ipcMain.handle('games/icon/upload', async (event, steamAppId, filePath) => {
  return await uploadIcon(steamAppId, filePath);
});

ipcMain.handle('games/item/save', async (event, steamAppId, gameItem) => {
  return await saveGameItem(steamAppId, gameItem);
});

ipcMain.handle('games/item/upload', async (event, steamAppId, gameItem) => {
  console.log('games/item/upload', steamAppId, gameItem);
  return await uploadGameToRemote(steamAppId, gameItem, progressCallback);
});

ipcMain.handle('games/item/abort_rsync_transfer', async (event, itemId) => {
  console.log('games/item/abort_rsync_transfer', itemId);
  return await abortRsyncTransfer(itemId);
});

ipcMain.handle('games/item/refresh_hash_and_size', async (event, steamAppId, gameItem) => {
  console.log('games/item/refresh_hash_and_size', steamAppId, gameItem);
  return await calculateHashAndSize(steamAppId, gameItem);
});

ipcMain.handle('games/item/delete_from_local', async (event, itemId, gameItem, deletePrefix) => {
  console.log('games/item/delete_from_local', itemId, gameItem);
  return await deleteGameFromLocal(itemId, gameItem, deletePrefix);
});

ipcMain.handle('games/item/request_download_details', async (event, steamAppId, gameItem) => {
  console.log('games/item/request_download_details', steamAppId, gameItem);
  return await requestDownloadDetails(steamAppId, gameItem);
});

ipcMain.handle('games/item/download_from_remote', async (event, steamAppId, gameItem, prefixAlias, libPath) => {
  console.log('games/item/download_from_remote', steamAppId, gameItem, prefixAlias, libPath);
  return await downloadGameFromRemote(steamAppId, gameItem, prefixAlias, libPath, progressCallback);
});
