import { Conf } from 'electron-conf/main';
import { getRealLocalGamePath, makeRealLocalPrefixPath } from './game.details';

// this file is used to store the state of the app
// it's a single source of truth for the games
// it's updated by the main process
// and used by the renderer process

const defaultAppState = {
  gamesMap: {},
};

const schema = {
  type: 'object',
  properties: {
    gamesMap: {
      type: 'object',
    },
  },
};

const appState = new Conf({ schema: schema, defaults: defaultAppState, name: 'app.state' });

function getAppState_GamesMap() {
  return appState.get('gamesMap');
}

function setAppState_GamesMap(gamesMap) {
  appState.set('gamesMap', gamesMap);
}

function appState_mergeDbAndSteamGamesWithLocalGames(dbGamesMap, steamGamesMap) {
  console.log('app.state::appState_mergeDbAndSteamGamesWithLocalGames: merging db and steam games with local state');
  // conflict resolution:
  // 1. if the game is in the DB and not in steam, keep it
  // 2. if the game is in steam and not in the DB, keep it
  // 3. if the game is in both, keep the one from the DB
  const mergedGamesMap = { ...steamGamesMap, ...dbGamesMap };

  // now we need to merged them with the local games state
  console.log('app.state::appState_mergeDbAndSteamGamesWithLocalGames: get local games map');
  const localGamesMap = getAppState_GamesMap();
  const finalGamesMap = {};

  console.log('app.state::appState_mergeDbAndSteamGamesWithLocalGames: merge games map');

  const additionalFields = {
    realLocalGamePath: null,
    realLocalPrefixPath: null,

    localGameHash: null,
    localGameSizeInBytes: 0,
    remoteGameHash: null,
    remoteGameSizeInBytes: 0,

    localPrefixHash: null,
    localPrefixSizeInBytes: 0,
    remotePrefixHash: null,
    remotePrefixSizeInBytes: 0,

    localState: {
      downloading: null,
      steamTitle: null,
    },
  };

  for (const [steamAppId, gameItem] of Object.entries(mergedGamesMap)) {
    let localGameItem = localGamesMap[steamAppId];

    if (!localGameItem) {
      console.log('app.state::appState_mergeDbAndSteamGamesWithLocalGames: no local game item found for', steamAppId);
      localGameItem = {
        ...gameItem,
        ...additionalFields,
      };

      localGameItem.realLocalGamePath = getRealLocalGamePath(gameItem.gameLocation);
      localGameItem.realLocalPrefixPath = makeRealLocalPrefixPath(gameItem.prefixLocation);
    }

    finalGamesMap[steamAppId] = {
      ...localGameItem,
      ...gameItem,
    };
  }

  console.log('app.state::appState_mergeDbAndSteamGamesWithLocalGames: final games map', finalGamesMap);

  setAppState_GamesMap(finalGamesMap);
  return finalGamesMap;
}

function updateGameItemState(steamAppId, fieldsToUpdate) {
  const gamesMap = appState.get('gamesMap');

  if (!gamesMap[steamAppId]) {
    console.error('app.state::updateGameItemState: Game not found for steamAppId', steamAppId);
    throw new Error('Game not found for steamAppId ' + steamAppId);
  }

  if (fieldsToUpdate.localState) {
    fieldsToUpdate.localState = {
      ...gamesMap[steamAppId].localState,
      ...fieldsToUpdate.localState,
    };
  }

  gamesMap[steamAppId] = {
    ...gamesMap[steamAppId],
    ...fieldsToUpdate,
  };

  appState.set('gamesMap', gamesMap);

  return gamesMap[steamAppId];
}

export { getAppState_GamesMap, setAppState_GamesMap, updateGameItemState, appState_mergeDbAndSteamGamesWithLocalGames };
