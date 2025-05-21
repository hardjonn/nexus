function getGames() {
  return window.gamesAPI.getGames();
}

function uploadIcon(steamAppId, filePath) {
  return window.gamesAPI.uploadIcon(steamAppId, filePath);
}

function saveGameItem(steamAppId, gameItem) {
  return window.gamesAPI.saveGameItem(steamAppId, gameItem);
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

export { getGames, uploadIcon, saveGameItem, uploadGameToRemote, abortGameUpload, refreshHashAndSize, deleteGameFromLocal, requestDownloadDetails };
