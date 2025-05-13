// this file is used to store the state of the app
// it's a single source of truth for the games
// it's updated by the main process
// and used by the renderer process

const appState = {
  gamesMap: {},
};

function getAppState() {
  return appState;
}

function setGamesMapState(gamesMap) {
  appState.gamesMap = gamesMap;
}

function updateGameItemState(steamAppId, fieldsToUpdate) {
  appState.gamesMap[steamAppId] = {
    ...appState.gamesMap[steamAppId],
    ...fieldsToUpdate,
  };

  return appState.gamesMap[steamAppId];
}

export { getAppState, setGamesMapState, updateGameItemState };
