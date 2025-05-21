import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// progress observers list
const progressObservers = [];

function addObserverToProgress(progressObserver) {
  progressObservers.push(progressObserver);
}

function notifyProgressObservers(data) {
  progressObservers.forEach((observer) => observer(data));
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
  uploadGameToRemote: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/upload', steamAppId, gameItem),
  abortGameUpload: (itemId) => electronAPI.ipcRenderer.invoke('games/item/abort_rsync_transfer', itemId),
  refreshHashAndSize: (steamAppId, gameItem) => electronAPI.ipcRenderer.invoke('games/item/refresh_hash_and_size', steamAppId, gameItem),
  deleteGameFromLocal: (itemId, gameItem, deletePrefix) => electronAPI.ipcRenderer.invoke('games/item/delete_from_local', itemId, gameItem, deletePrefix),
  subscribeToProgressUpdates: (progressObserver) => addObserverToProgress(progressObserver),
};

electronAPI.ipcRenderer.on('progress', (event, data) => {
  console.log('progress', data);
  notifyProgressObservers(data);
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
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.confAPI = confAPI;
  window.gamesAPI = gamesAPI;
}
