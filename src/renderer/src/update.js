function checkForUpdates() {
  return window.updateAPI.checkForUpdates();
}

function getCurrentVersion() {
  return window.updateAPI.getCurrentVersion();
}

function downloadUpdate() {
  return window.updateAPI.downloadUpdate();
}

function installUpdate() {
  return window.updateAPI.installUpdate();
}

export { checkForUpdates, getCurrentVersion, downloadUpdate, installUpdate };
