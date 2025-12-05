function getGames() {
  return window.gamesAPI.getGames();
}

function uploadIcon(steamAppId, filePath) {
  return window.gamesAPI.uploadIcon(steamAppId, filePath);
}

function saveGameItem(steamAppId, gameItem) {
  return window.gamesAPI.saveGameItem(steamAppId, gameItem);
}

function syncLocalHashToRemote(steamAppId, gameItem) {
  return window.gamesAPI.syncLocalHashToRemote(steamAppId, gameItem);
}

function uploadGameToRemote(steamAppId, gameItem) {
  return window.gamesAPI.uploadGameToRemote(steamAppId, gameItem);
}

function abortGameUpload(itemId) {
  return window.gamesAPI.abortGameUpload(itemId);
}

function refreshHashAndSize(steamAppId, gameItem) {
  return window.gamesAPI.refreshHashAndSize(steamAppId, gameItem);
}

function deleteGameFromLocal(steamAppId, gameItem, deletePrefix) {
  return window.gamesAPI.deleteGameFromLocal(steamAppId, gameItem, deletePrefix);
}

function requestDownloadDetails(steamAppId, gameItem) {
  return window.gamesAPI.requestDownloadDetails(steamAppId, gameItem);
}

function downloadGameFromRemote(steamAppId, gameItem, prefixAlias, libPath) {
  return window.gamesAPI.downloadGameFromRemote(steamAppId, gameItem, prefixAlias, libPath);
}

function abortGameDownload(itemId) {
  return window.gamesAPI.abortGameDownload(itemId);
}

function syncSteamState(steamAppId, gameItem) {
  return window.gamesAPI.syncSteamState(steamAppId, gameItem);
}

export {
  getGames,
  uploadIcon,
  saveGameItem,
  syncLocalHashToRemote,
  uploadGameToRemote,
  abortGameUpload,
  refreshHashAndSize,
  deleteGameFromLocal,
  requestDownloadDetails,
  downloadGameFromRemote,
  abortGameDownload,
  syncSteamState,
};
