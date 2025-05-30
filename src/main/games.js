import fs from 'fs-extra';

import { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData, db_updateGameState } from './game.queries';
import { steam_getAllGamesMap, steam_SyncStateForGame } from './steam';
import { getConfig } from './conf';
import { uploadWithRsync, abortRsyncTransferByItemId, downloadWithRsync } from './transfer';
import { updateGameItemState, getGameItemState } from './app.state';
import { appState_mergeDbAndSteamGamesWithLocalGames } from './app.state';
import { makeIconFromPath, makeIconFromLoadedSteamIcon } from './game.icon';
import {
  adjustedGameWithLocalAndRemoteDetails,
  getGameAndPrefixPath,
  getGameAndPrefixPathForDownload,
  getLocalDirectoryHashAndSize,
  getRemoteDirectoryHashAndSize,
} from './game.details';
import { getDownloadDetails, runPostDownloadActions } from './game.download';

// once a game is added to the DB and uploaded to the NAS
// it will source as the single source of truth
// ...
// default hash and size are coming from the local installation
// and stored in the DB, it's needed to validate that the uploaded
// to the library is fully performed, to make sure that the game
// is not out of sync
// ...
// the hash and size have to be calculated for both local and remote
// ...
// if the hash is NULL and the size is 0 then the game is not installed/present

async function getGames() {
  try {
    // step 1: get all the records from the database
    console.log('games::getGames: fetching DB games');
    const gamesFromDbMap = await db_getAllGamesMap();

    // step 2: get all the records from steam
    console.log('games::getGames: fetching Steam games');
    const gamesFromSteamMap = await steam_getAllGamesMap();

    // step 3: merge the two maps
    console.log('games::getGames: merging DB and Steam games');
    const mergedGamesMap = appState_mergeDbAndSteamGamesWithLocalGames(gamesFromDbMap, gamesFromSteamMap);

    console.log('games::getGames: returning games');
    return {
      status: 'success',
      games: mergedGamesMap, //Object.values(mergedGamesMap).slice(0, 5),
    };
  } catch (error) {
    console.error('games::getGames: Error fetching games:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

async function calculateHashAndSize(steamAppId, inGameItem) {
  try {
    const { errors, gameItem } = await adjustedGameWithLocalAndRemoteDetails(inGameItem);

    const updatedGameItem = updateGameItemState(steamAppId, gameItem);

    return {
      status: 'success',
      gameItem: updatedGameItem,
      error: {
        message: errors.length ? 'Errors calculating hash and size' : '',
        errors: errors,
      },
    };
  } catch (error) {
    console.error('games::calculateHashAndSize: Error calculating hash and size:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to calculate hash and size: ' + error,
      },
    };
  }
}

async function uploadIcon(steamAppId, filePath) {
  try {
    const resizedImage = await makeIconFromPath(filePath);

    const uploadResult = await db_uploadIcon(steamAppId, resizedImage);

    if (!uploadResult) {
      console.log('games::uploadIcon: Failed to upload icon to the database');

      return {
        status: 'error',
        error: {
          message: 'Failed to upload icon to the database',
        },
      };
    }

    const updatedGameItem = updateGameItemState(steamAppId, {
      icon: resizedImage.toString('base64'),
    });

    return {
      status: 'success',
      gameItem: updatedGameItem,
    };
  } catch (error) {
    console.error('games::uploadIcon: Error uploading icon:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to upload icon to the database: ' + error.message,
      },
    };
  }
}

async function createOrUpdateGameItem(steamAppId, gameItem) {
  // do not calculate and store hash/size for steam games here
  // we do it when the game is uploaded to the remote
  if (gameItem.source === 'steam') {
    // if it's a steam game then icon was loaded from a local path or it's empty
    // so we need to convert it to a 192x192 JPG
    gameItem.icon = await makeIconFromLoadedSteamIcon(gameItem.icon);
    return await db_createGameItemFromSteamData(steamAppId, gameItem);
  }

  // do not upload/update the icon here
  // icon changes are done separately for created records
  return await db_updateGameItem(steamAppId, gameItem);
}

async function saveGameItem(steamAppId, gameItem) {
  console.log('games::saveGameItem: Saving game item:', steamAppId, gameItem);

  const prevGameItem = getGameItemState(steamAppId);
  try {
    const validationErrors = validateGameItem(gameItem);
    if (validationErrors.length) {
      return {
        status: 'error',
        error: {
          message: 'Validation errors',
          errors: validationErrors,
        },
      };
    }

    const updatedGameItem = await steam_SyncStateForGame(steamAppId, prevGameItem, gameItem);
    console.log('games::saveGameItem: Updated game item:', updatedGameItem);

    console.log('games::saveGameItem: Game item local state:', gameItem.localState);

    gameItem = updateGameItemState(steamAppId, updatedGameItem);

    const savedGameItem = await createOrUpdateGameItem(steamAppId, gameItem);

    if (!savedGameItem) {
      console.log('games::saveGameItem: Failed to save game item to the database');
      return {
        status: 'error',
        error: {
          message: 'Failed to save game item to the database',
        },
      };
    }

    return {
      status: 'success',
      gameItem: gameItem,
    };
  } catch (error) {
    console.error('games::saveGameItem: Error saving game item:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to save game item: ' + error,
      },
    };
  }
}

function validateGameItem(gameItem) {
  const errors = [];

  if (!gameItem) {
    console.log('games::validateGameItem: gameItem is empty');
    errors.push('Empty game item');
    return errors;
  }

  if (!gameItem.steamTitle || !gameItem.steamTitle.trim()) {
    console.log('games::validateGameItem: steamTitle is empty');
    errors.push(`Empty field: steamTitle ("${gameItem.steamTitle}")`);
  }

  if (!gameItem.steamExeTarget || !gameItem.steamExeTarget.trim()) {
    console.log('games::validateGameItem: steamExeTarget is empty');
    errors.push(`Empty field: steamExeTarget ("${gameItem.steamExeTarget}")`);
  }

  if (!gameItem.steamStartDir || !gameItem.steamStartDir.trim()) {
    console.log('games::validateGameItem: steamStartDir is empty');
    errors.push(`Empty field: steamStartDir ("${gameItem.steamStartDir}")`);
  }

  if (!gameItem.launcher || !gameItem.launcher.trim()) {
    console.log('games::validateGameItem: launcher is empty');
    errors.push(`Empty field: launcher ("${gameItem.launcher}")`);
  }

  if (!gameItem.gameLocation || !gameItem.gameLocation.trim()) {
    console.log('games::validateGameItem: gameLocation is empty');
    errors.push(`Empty field: gameLocation ("${gameItem.gameLocation}")`);
  }

  if (gameItem.launcher === 'PORT_PROTON' && (!gameItem.prefixLocation || !gameItem.prefixLocation.trim())) {
    console.log('games::validateGameItem: prefixLocation is empty');
    errors.push(`Empty field: prefixLocation ("${gameItem.prefixLocation}")`);
  }

  if (gameItem.source === 'db') {
    return errors;
  }

  // these validations are steam specific
  if (!gameItem.realLocalGamePath || !gameItem.realLocalGamePath.trim()) {
    console.log('games::validateGameItem: realLocalGamePath is empty');
    errors.push(`Empty field: realLocalGamePath ("${gameItem.realLocalGamePath}")`);
  }

  if (!fs.existsSync(gameItem.realLocalGamePath)) {
    console.log('games::validateGameItem: game not found at this location: ' + gameItem.realLocalGamePath);
    errors.push(`Game not found at the following location: ${gameItem.realLocalGamePath}`);
  }

  return errors;
}

async function abortRsyncTransfer(itemId) {
  console.log('abortRsyncTransfer', itemId);

  return await abortRsyncTransferByItemId(itemId);
}

// the idea it that the game item is uploaded only once in the beginning
// when it's created we also upload the default prefix if needed (for PORT_PROTON)
// after that the prefix is frozen and cannot be changed
// unless it'e enforced by the user
// the game is available for upload only when it's in DRAFT/UPDATING state
async function uploadGameToRemote(steamAppId, gameItem, progressCallback) {
  // run some validations
  if (gameItem.source !== 'db' || (gameItem.status !== 'DRAFT' && gameItem.status !== 'UPLOADING')) {
    console.log('games::uploadGameToRemote: Game is not in DRAFT state');
    return {
      status: 'error',
      error: {
        message: 'Game is not in DRAFT state',
      },
    };
  }

  const prevGameItem = getGameItemState(steamAppId);

  // 0. update the game state to uploading
  try {
    console.log('games::uploadGameToRemote: Updating the game state to UPLOADING...');
    await db_updateGameState(steamAppId, 'UPLOADING');

    gameItem = updateGameItemState(steamAppId, {
      status: 'UPLOADING',
    });

    console.log('games::uploadGameToRemote: Game state updated to UPLOADING');
  } catch (error) {
    console.error('games::uploadGameToRemote: Error updating game state to uploading:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to update game state to uploading: ' + error,
      },
    };
  }

  console.log('games::uploadGameToRemote: Launcher:', gameItem.launcher);
  console.log('games::uploadGameToRemote: Prefix location:', gameItem.prefixLocation);

  if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixLocation) {
    console.log('games::uploadGameToRemote: Prefix location is empty');
    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Prefix location is empty',
      },
    };
  }

  const config = getConfig();

  const { localGamePath, remoteGamePath, localPrefixPath, remotePrefixPath } = getGameAndPrefixPath(gameItem, config.remote_lib.default_prefixes);

  console.log('games::uploadGameToRemote: localGamePath: ' + localGamePath);
  console.log('games::uploadGameToRemote: remoteGamePath: ' + remoteGamePath);

  console.log('games::uploadGameToRemote: localPrefixPath: ' + localPrefixPath);
  console.log('games::uploadGameToRemote: remotePrefixPath: ' + remotePrefixPath);

  try {
    // 1. upload the game to the remote
    await uploadWithRsync({
      abortId: steamAppId,
      sourcePath: localGamePath,
      destinationPath: remoteGamePath,
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    console.log('games::uploadGameToRemote: Upload completed successfully!');
  } catch (error) {
    console.error('games::uploadGameToRemote: Upload failed:', error);

    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to upload game to remote: ' + error,
      },
    };
  }

  try {
    // 2. upload the prefix if needed
    //  - the launcher has to be PORT_PROTON
    //  - the remote default prefix has to be empty - record in the DB should not exist
    if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixHash && localPrefixPath && remotePrefixPath) {
      console.log('games::uploadGameToRemote: Uploading prefix...');

      await uploadWithRsync({
        sourcePath: localPrefixPath,
        destinationPath: remotePrefixPath,
        host: config.remote_lib.host,
        username: config.remote_lib.user,
        privateKeyPath: config.remote_lib.private_key_path,
        onProgress: (output) => {
          const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
          progressCallback(augmentedWithSteamAppIdOutput);
        },
      });

      console.log('games::uploadGameToRemote: Upload prefix completed successfully!');
    }
  } catch (error) {
    console.error('games::uploadGameToRemote: Upload prefix failed:', error);

    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to upload prefix to remote: ' + error,
      },
    };
  }

  // 3. calculate the hash and size for the remote and local
  try {
    const { hash: localGameHash, sizeInBytes: localGameSizeInBytes } = await getLocalDirectoryHashAndSize(localGamePath);
    console.log('games::uploadGameToRemote: localGameHash: ' + localGameHash);
    console.log('games::uploadGameToRemote: localGameSizeInBytes: ' + localGameSizeInBytes);

    const { hash: remoteGameHash, sizeInBytes: remoteGameSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remoteGamePath);
    console.log('games::uploadGameToRemote: remoteGameHash: ' + remoteGameHash);
    console.log('games::uploadGameToRemote: remoteGameSizeInBytes: ' + remoteGameSizeInBytes);

    // we need to make sure the local game size and hash match the remote
    if (localGameHash !== remoteGameHash || localGameSizeInBytes !== remoteGameSizeInBytes) {
      console.log('games::uploadGameToRemote: Local game size and hash do not match remote');
      return {
        status: 'error',
        gameItem: gameItem,
        error: {
          message: 'Local game size and hash do not match remote',
        },
      };
    }

    gameItem.gameHash = localGameHash;
    gameItem.gameSizeInBytes = localGameSizeInBytes;
    gameItem.remoteGameHash = remoteGameHash;
    gameItem.remoteGameSizeInBytes = remoteGameSizeInBytes;

    gameItem = updateGameItemState(steamAppId, {
      localGameHash: localGameHash,
      localGameSizeInBytes: localGameSizeInBytes,
      gameHash: localGameHash,
      gameSizeInBytes: localGameSizeInBytes,
      remoteGameHash: remoteGameHash,
      remoteGameSizeInBytes: remoteGameSizeInBytes,
    });

    // the prefix check should be done only on the initial upload
    if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixHash) {
      const { hash: localPrefixHash, sizeInBytes: localPrefixSizeInBytes } = await getLocalDirectoryHashAndSize(localPrefixPath);
      console.log('games::uploadGameToRemote: localPrefixHash: ' + localPrefixHash);
      console.log('games::uploadGameToRemote: localPrefixSizeInBytes: ' + localPrefixSizeInBytes);

      const { hash: remotePrefixHash, sizeInBytes: remotePrefixSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remotePrefixPath);
      console.log('games::uploadGameToRemote: remotePrefixHash: ' + remotePrefixHash);
      console.log('games::uploadGameToRemote: remotePrefixSizeInBytes: ' + remotePrefixSizeInBytes);

      // we need to make sure the local prefix size and hash match the remote
      if (localPrefixHash !== remotePrefixHash || localPrefixSizeInBytes !== remotePrefixSizeInBytes) {
        console.log('games::uploadGameToRemote: Local prefix size and hash do not match remote');
        return {
          status: 'error',
          gameItem: gameItem,
          error: {
            message: 'Local prefix size and hash do not match remote',
          },
        };
      }

      gameItem.prefixHash = localPrefixHash;
      gameItem.prefixSizeInBytes = localPrefixSizeInBytes;
      gameItem.localPrefixHash = localPrefixHash;
      gameItem.localPrefixSizeInBytes = localPrefixSizeInBytes;
      gameItem.remotePrefixHash = remotePrefixHash;
      gameItem.remotePrefixSizeInBytes = remotePrefixSizeInBytes;

      gameItem = updateGameItemState(steamAppId, {
        localPrefixHash: localPrefixHash,
        localPrefixSizeInBytes: localPrefixSizeInBytes,
        prefixHash: localPrefixHash,
        prefixSizeInBytes: localPrefixSizeInBytes,
        remotePrefixHash: remotePrefixHash,
        remotePrefixSizeInBytes: remotePrefixSizeInBytes,
      });
    }
  } catch (error) {
    console.error('games::uploadGameToRemote: Error calculating hash and size:', error);
    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to calculate hash and size: ' + error,
      },
    };
  }

  // 4. update the game item in the DB
  try {
    console.log('games::uploadGameToRemote: Updating game item in the DB...');
    gameItem.status = 'ACTIVE';

    const result = await db_updateGameItem(steamAppId, gameItem);
    // let game = await augmentGameWithRealLocalGamePath(result);
    // game = await adjustedGameWithLocalAndRemoteDetails(game);

    gameItem = updateGameItemState(steamAppId, {
      status: 'ACTIVE',
    });

    const updatedGameItem = await steam_SyncStateForGame(steamAppId, prevGameItem, gameItem);
    console.log('games::uploadGameToRemote: Updated game item:', updatedGameItem);

    console.log('games::uploadGameToRemote: Game item local state:', gameItem.localState);

    gameItem = updateGameItemState(steamAppId, updatedGameItem);

    return {
      status: 'success',
      message: 'Game item saved successfully',
      gameItem: gameItem,
    };
  } catch (error) {
    console.error('games::uploadGameToRemote: Error updating game item:', error);
    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to update game item: ' + error,
      },
    };
  }
}

async function downloadGameFromRemote(steamAppId, gameItem, prefixAlias, libPath, progressCallback) {
  if (!steamAppId) {
    console.error('games::downloadGameFromRemote: Steam app ID is not specified');
    return {
      status: 'error',
      error: {
        message: 'Steam app ID is not specified',
      },
    };
  }

  if (!gameItem) {
    console.error('games::downloadGameFromRemote: Game item is not specified');
    return {
      status: 'error',
      error: {
        message: 'Game item is not specified',
      },
    };
  }

  if (!libPath) {
    console.error('games::downloadGameFromRemote: Lib path is not specified');
    return {
      status: 'error',
      error: {
        message: 'Lib path is not specified',
      },
    };
  }

  console.log('games::downloadGameFromRemote: prefixAlias: ' + prefixAlias);
  console.log('games::downloadGameFromRemote: libPath: ' + libPath);

  const prevGameItem = getGameItemState(steamAppId);

  const config = getConfig();

  const { localGamePath, remoteGamePath, localPrefixPath, remotePrefixPath } = getGameAndPrefixPathForDownload(gameItem, libPath, prefixAlias);

  console.log('games::downloadGameFromRemote: localGamePath: ' + localGamePath);
  console.log('games::downloadGameFromRemote: remoteGamePath: ' + remoteGamePath);

  console.log('games::downloadGameFromRemote: localPrefixPath: ' + localPrefixPath);
  console.log('games::downloadGameFromRemote: remotePrefixPath: ' + remotePrefixPath);

  gameItem = updateGameItemState(steamAppId, {
    localState: {
      downloading: {
        localGamePath,
        remoteGamePath,
        localPrefixPath,
        remotePrefixPath,
        libPath,
        prefixAlias,
      },
    },
  });

  try {
    // 1. download the game from the remote
    await downloadWithRsync({
      abortId: steamAppId,
      sourcePath: remoteGamePath,
      destinationPath: localGamePath,
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    gameItem.realLocalGamePath = localGamePath;
    gameItem = updateGameItemState(steamAppId, gameItem);

    console.log('games::downloadGameFromRemote: Game downloaded successfully!');
  } catch (error) {
    console.error('games::downloadGameFromRemote: Game download failed:', error);

    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to download game from remote: ' + error,
      },
    };
  }

  // 2. check if we need to download the prefix from remote as well
  // for PORT_PROTON prefix is the mandatory part of the game
  // but it boils down to the fact that the prefixAlias is specified
  if (localPrefixPath && remotePrefixPath) {
    try {
      await downloadWithRsync({
        abortId: steamAppId,
        sourcePath: remotePrefixPath,
        destinationPath: localPrefixPath,
        host: config.remote_lib.host,
        username: config.remote_lib.user,
        privateKeyPath: config.remote_lib.private_key_path,
        onProgress: (output) => {
          const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
          progressCallback(augmentedWithSteamAppIdOutput);
        },
      });

      gameItem.realLocalPrefixPath = localPrefixPath;
      gameItem = updateGameItemState(steamAppId, gameItem);

      console.log('games::downloadGameFromRemote: Prefix downloaded successfully!');
    } catch (error) {
      console.error('games::downloadGameFromRemote: Prefix download failed:', error);

      return {
        status: 'error',
        gameItem: gameItem,
        error: {
          message: 'Failed to download prefix from remote: ' + error,
        },
      };
    }
  }

  // 3. check if we need to run any post-download actions
  // for example, for PORT_PROTON we need to run the post-download script
  // the actions are dependent on the game launcher
  try {
    console.log('games::downloadGameFromRemote: Running post download actions for launcher: ' + gameItem.launcher);
    await runPostDownloadActions(gameItem);
  } catch (error) {
    console.error('games::downloadGameFromRemote: Error running post download actions:', error);

    return {
      status: 'error',
      gameItem: gameItem,
      error: {
        message: 'Failed to run post download actions: ' + error,
      },
    };
  }

  try {
    const updatedGameItem = await steam_SyncStateForGame(steamAppId, prevGameItem, gameItem);
    console.log('games::downloadGameFromRemote: Updated game item:', updatedGameItem);

    gameItem.localState.downloading = null;
    console.log('games::downloadGameFromRemote: Game item local state:', gameItem.localState);

    gameItem = updateGameItemState(steamAppId, updatedGameItem);

    return {
      status: 'success',
      message: 'Game downloaded successfully',
      gameItem: gameItem,
    };
  } catch (error) {
    console.error('games::downloadGameFromRemote: Error syncing steam state:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to sync steam state: ' + error,
      },
    };
  }
}

async function deleteGameFromLocal(steamAppId, gameItem, deletePrefix) {
  const errors = [];

  if (!gameItem) {
    console.error('games::deleteGameFromLocal: Game item is not specified');
    return {
      status: 'error',
      error: {
        message: 'Game item is not specified',
      },
    };
  }

  const prevGameItem = getGameItemState(steamAppId);

  try {
    console.log('games::deleteGameFromLocal: Deleting game from local...');

    if (!fs.existsSync(gameItem.realLocalGamePath)) {
      console.error('games::deleteGameFromLocal: Game item real local game path does not exist');
      errors.push('Game item real local game path does not exist: ' + gameItem.realLocalGamePath);
    } else {
      console.log('games::deleteGameFromLocal: Deleting game item: ' + gameItem.realLocalGamePath);
      fs.rmSync(gameItem.realLocalGamePath, { recursive: true });
    }

    gameItem.realLocalGamePath = null;
    gameItem.localGameHash = null;
    gameItem.localGameSizeInBytes = 0;
  } catch (error) {
    console.error('games::deleteGameFromLocal: Error deleting game from local:', error);
    errors.push('Failed to delete game from local: ' + error);
  }

  if (deletePrefix) {
    try {
      console.log('games::deleteGameFromLocal: Deleting prefix...');

      if (!fs.existsSync(gameItem.realLocalPrefixPath)) {
        console.error('games::deleteGameFromLocal: Game item real local prefix path does not exist');
        errors.push('Game item real local prefix path does not exist: ' + gameItem.realLocalPrefixPath);
      } else {
        console.log('games::deleteGameFromLocal: Deleting prefix: ' + gameItem.realLocalPrefixPath);
        fs.rmSync(gameItem.realLocalPrefixPath, { recursive: true });
      }

      gameItem.realLocalPrefixPath = null;
      gameItem.localPrefixHash = null;
      gameItem.localPrefixSizeInBytes = 0;
    } catch (error) {
      console.error('games::deleteGameFromLocal: Error deleting prefix:', error);
      errors.push('Failed to delete prefix: ' + error);
    }
  }

  try {
    const updatedGameItem = await steam_SyncStateForGame(steamAppId, prevGameItem, gameItem);
    console.log('games::deleteGameFromLocal: Updated game item:', updatedGameItem);

    gameItem.localState.downloading = null;
    console.log('games::deleteGameFromLocal: Game item local state:', gameItem.localState);
    gameItem = updateGameItemState(gameItem.steamAppId, updatedGameItem);
  } catch (error) {
    console.error('games::deleteGameFromLocal: Error syncing steam state:', error);
    errors.push('Failed to sync steam state: ' + error);
  }

  return {
    status: 'success',
    message: 'Game deleted successfully',
    gameItem: gameItem,
    error: {
      message: errors.length ? 'There were some errors while deleting the game' : null,
      errors: errors,
    },
  };
}

async function requestDownloadDetails(steamAppId, gameItem) {
  if (!gameItem) {
    console.error('games::requestDownloadDetails: Game item is not specified');
    return {
      status: 'error',
      error: {
        message: 'Game item is not specified',
      },
    };
  }

  try {
    console.log('games::requestDownloadDetails: Requesting download details for game: ' + steamAppId);
    const downloadDetails = await getDownloadDetails(steamAppId, gameItem);

    return {
      status: 'success',
      downloadDetails: downloadDetails,
    };
  } catch (error) {
    console.error('games::requestDownloadDetails: Error requesting download details:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to request download details: ' + error,
      },
    };
  }
}

async function syncSteamState(steamAppId, gameItem) {
  if (!gameItem) {
    console.error('games::syncSteamState: Game item is not specified');
    return {
      status: 'error',
      error: {
        message: 'Game item is not specified',
      },
    };
  }

  const prevGameItem = getGameItemState(steamAppId);

  try {
    console.log('games::syncSteamState: Syncing steam state for game: ' + steamAppId);
    const updatedGameItem = await steam_SyncStateForGame(steamAppId, prevGameItem, gameItem);

    console.log('games::syncSteamState: Updated game item:', updatedGameItem);
    console.log('games::syncSteamState: Game item local state:', updatedGameItem.localState);

    gameItem = updateGameItemState(steamAppId, updatedGameItem);

    return {
      status: 'success',
      gameItem: gameItem,
    };
  } catch (error) {
    console.error('games::syncSteamState: Error syncing steam state:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to sync steam state: ' + error,
      },
    };
  }
}

function augmentOutputWithProgressId(output, steamAppId) {
  output.progressId = `steamAppId-${steamAppId}`;

  return output;
}

export {
  getGames,
  uploadIcon,
  saveGameItem,
  uploadGameToRemote,
  abortRsyncTransfer,
  calculateHashAndSize,
  deleteGameFromLocal,
  requestDownloadDetails,
  downloadGameFromRemote,
  syncSteamState,
};
