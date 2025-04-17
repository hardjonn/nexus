import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {};

const conf = {
  getConfig: () => electronAPI.ipcRenderer.invoke('config/get'),
  saveConfig: (configData) => electronAPI.ipcRenderer.invoke('config/save', configData),
  saveConfigApp_ActiveTab: (tabName) => electronAPI.ipcRenderer.send('config/save/app/active_tab', tabName),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('conf', conf);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.conf = conf;
}
