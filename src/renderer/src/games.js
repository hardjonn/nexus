function getGames() {
  return window.gamesAPI.getGames();
}

function uploadIcon(steamAppId, filePath) {
  return window.gamesAPI.uploadIcon(steamAppId, filePath);
}

function saveGameItem(steamAppId, gameItem) {
  return window.gamesAPI.saveGameItem(steamAppId, gameItem);
}

export { getGames, uploadIcon, saveGameItem };
