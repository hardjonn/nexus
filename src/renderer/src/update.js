function checkForUpdates() {
  return window.updateAPI.checkForUpdates();
}

function getCurrentVersion() {
  return window.updateAPI.getCurrentVersion();
}

export { checkForUpdates, getCurrentVersion };
