import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

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
};

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
