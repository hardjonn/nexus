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

export { getGames, uploadIcon, saveGameItem, uploadGameToRemote, abortGameUpload };
