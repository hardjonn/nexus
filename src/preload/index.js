import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// progress observers list
const progressObservers = [];

function addObserverToProgress(progressObserver) {
  console.log('progress observers list', progressObservers);
  progressObservers.push(progressObserver);
}

function notifyProgressObservers(data) {
  progressObservers.forEach((observer) => observer(data));
}

// error observers list
const errorObservers = [];

function addObserverToError(errorObserver) {
  console.log('error observers list', errorObservers);
  errorObservers.push(errorObserver);
}

function notifyErrorObservers(data) {
  errorObservers.forEach((observer) => observer(data));
}

// console observers lit
const consoleLogObservers = [];

function addObserverToConsoleLog(consoleLogObserver) {
  console.log('consoleLog observers list', consoleLogObservers);
  consoleLogObservers.push(consoleLogObserver);
}

function notifyConsoleLogObservers(data) {
  consoleLogObservers.forEach((observer) => observer(data));
}

// Custom APIs for renderer
const api = {};

const confAPI = {
  getConfig: () => electronAPI.ipcRenderer.invoke('config/get'),
  saveConfig: (configData) => electronAPI.ipcRenderer.invoke('config/save', configData),
  saveConfigApp_ActiveTab: (tabName) => electronAPI.ipcRenderer.send('config/save/app/active_tab', tabName),
};

const gamesAPI = {
  getGames: () => electronAPI.ipcRenderer.invoke('games/get'),
  uploadIcon: (steamAppId, filePath) => electronAPI.ipcRenderer.invoke('games/icon/upload', steamAppId, filePath),
  saveGameItem: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/save', steamAppId, gameItem),
  syncLocalHashToRemote: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/sync_local_hash_to_remote', steamAppId, gameItem),
  uploadGameToRemote: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/upload', steamAppId, gameItem),
  abortGameUpload: (steamAppId) => electronAPI.ipcRenderer.invoke('games/item/abort_rsync_transfer', steamAppId),
  refreshHashAndSize: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/refresh_hash_and_size', steamAppId, gameItem),
  deleteGameFromLocal: (steamAppId, gameItem, deletePrefix) => electronAPI.ipcRenderer.invoke('games/item/delete_from_local', steamAppId, gameItem, deletePrefix),
  requestDownloadDetails: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/request_download_details', steamAppId, gameItem),
  downloadGameFromRemote: (steamAppId, gameItem, prefixAlias, libPath) =>
    electronAPI.ipcRenderer.invoke('games/item/download_from_remote', steamAppId, gameItem, prefixAlias, libPath),
  abortGameDownload: (steamAppId) => electronAPI.ipcRenderer.invoke('games/item/abort_rsync_transfer', steamAppId),
  // TODO: move the progress subscription to a separate channel, does not belong here
  // backuper and updater are also using it
  subscribeToProgressUpdates: (progressObserver) => addObserverToProgress(progressObserver),
  syncSteamState: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/sync_steam_state', steamAppId, gameItem),
};

const backupAPI = {
  backupPrefixes: () => electronAPI.ipcRenderer.invoke('backup/prefixes'),
  backupCustomLocation: (location) => electronAPI.ipcRenderer.invoke('backup/custom_location', location),
  backupAllCustomLocations: () => electronAPI.ipcRenderer.invoke('backup/all_custom_locations'),
  abortPrefixesBackupUpload: () => electronAPI.ipcRenderer.invoke('backup/abort_backup_transfer', 'backup'),
  abortCustomBackupUpload: () => electronAPI.ipcRenderer.invoke('backup/abort_backup_transfer', 'backup'),
};

const updateAPI = {
  getCurrentVersion: () => electronAPI.ipcRenderer.invoke('update/get_current_version'),
  checkForUpdates: () => electronAPI.ipcRenderer.invoke('update/check'),
  downloadUpdate: () => electronAPI.ipcRenderer.invoke('update/download'),
  installUpdate: () => electronAPI.ipcRenderer.invoke('update/install'),
};

const integrationAPI = {
  addDesktopEntry: () => electronAPI.ipcRenderer.invoke('integration/add_desktop_entry'),
};

const errorAPI = {
  subscribeToErrorUpdates: (errorObserver) => addObserverToError(errorObserver),
};

const consoleAPI = {
  subscribeToConsoleLogUpdates: (consoleLogObserver) => addObserverToConsoleLog(consoleLogObserver),
};

electronAPI.ipcRenderer.on('progress', (event, data) => {
  console.log('ON progress', data);
  notifyProgressObservers(data);
});

electronAPI.ipcRenderer.on('error', (event, data) => {
  console.log('ON error', data);
  notifyErrorObservers(data);
});

electronAPI.ipcRenderer.on('consoleLog', (event, data) => {
  console.log('ON consoleLog', data);
  notifyConsoleLogObservers(data);
});

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('confAPI', confAPI);
    contextBridge.exposeInMainWorld('gamesAPI', gamesAPI);
    contextBridge.exposeInMainWorld('backupAPI', backupAPI);
    contextBridge.exposeInMainWorld('updateAPI', updateAPI);
    contextBridge.exposeInMainWorld('integrationAPI', integrationAPI);
    contextBridge.exposeInMainWorld('errorAPI', errorAPI);
    contextBridge.exposeInMainWorld('consoleAPI', consoleAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.confAPI = confAPI;
  window.gamesAPI = gamesAPI;
  window.backupAPI = backupAPI;
  window.updateAPI = updateAPI;
  window.integrationAPI = integrationAPI;
  window.errorAPI = errorAPI;
  window.consoleAPI = consoleAPI;
}
