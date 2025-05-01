import { db } from './db';

const Game = db.games;

async function db_getAllGamesMap() {
  try {
    const games = await Game.findAll();
    // convert games to a map
    const gamesMap = {};
    for (const game of games) {
      const steamAppId = game['steam_app_id'];
      gamesMap[steamAppId] = makeGameItem(game);
    }

    return gamesMap;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

function makeGameItem(game) {
  return {
    steamAppId: game['steam_app_id'],
    steamTitle: game['steam_title'],
    steamExeTarget: game['steam_exe_target'],
    steamStartDir: game['steam_start_dir'],
    steamLaunchArgs: game['steam_launch_args'],
    icon: game['icon'] ? Buffer.from(game['icon']).toString('base64') : null,
    clientLocation: game['client_location'],
    nasLocation: game['nas_location'],
    prefixLocation: game['prefix_location'],
    launcher: game['launcher'],
    hash: game['hash_md5'],
    sizeInBytes: game['size_in_bytes'],
    prefixHash: game['prefix_hash_md5'],
    prefixSizeInBytes: game['prefix_size_in_bytes'],
    status: game['status'],
    realLocalGamePath: null,
    realLocalPrefixPath: null,
    localHash: null,
    localSizeInBytes: 0,
    remoteHash: null,
    remoteSizeInBytes: 0,
    localPrefixHash: null,
    localPrefixSizeInBytes: 0,
    remotePrefixHash: null,
    remotePrefixSizeInBytes: 0,
    source: 'db',
    errors: [],
  };
}

async function db_uploadIcon(steamAppId, resizedImage) {
  try {
    const game = await Game.findOne({
      where: {
        steam_app_id: steamAppId,
      },
    });

    if (!game) {
      throw new Error(`Game with steamAppId ${steamAppId} not found`);
    }

    await game.update({
      icon: resizedImage,
    });
    console.log(`Icon for game ${steamAppId} updated successfully`);
  } catch (error) {
    console.error('Error uploading icon:', error);
    return false;
  }

  return true;
}

async function db_updateGameItem(steamAppId, gameItem) {
  try {
    const game = await Game.findOne({
      where: {
        steam_app_id: steamAppId,
      },
    });

    if (!game) {
      throw new Error(`Game with steamAppId ${steamAppId} not found`);
    }

    await game.update({
      steam_title: gameItem.steamTitle,
      steam_exe_target: gameItem.steamExeTarget,
      steam_start_dir: gameItem.steamStartDir,
      steam_launch_args: gameItem.steamLaunchArgs,
      client_location: gameItem.clientLocation,
      nas_location: gameItem.nasLocation,
      prefix_location: gameItem.prefixLocation,
      launcher: gameItem.launcher,
      status: gameItem.status,
      hash_md5: gameItem.hash,
      size_in_bytes: gameItem.sizeInBytes,
      prefix_hash_md5: gameItem.prefixHash,
      prefix_size_in_bytes: gameItem.prefixSizeInBytes,
    });
    console.log(`Game item ${steamAppId} updated successfully`);

    console.log('GAME ITEM>>>>>>>>>>>>', makeGameItem(game));

    return makeGameItem(game);
  } catch (error) {
    console.error('Error saving game item:', error);
    return null;
  }
}

async function db_createGameItemFromSteamData(steamAppId, gameItem) {
  try {
    const game = await Game.create({
      steam_app_id: steamAppId,
      steam_title: gameItem.steamTitle,
      steam_exe_target: gameItem.steamExeTarget,
      steam_start_dir: gameItem.steamStartDir,
      steam_launch_args: gameItem.steamLaunchArgs,
      client_location: gameItem.clientLocation,
      nas_location: gameItem.nasLocation,
      prefix_location: gameItem.prefixLocation,
      icon: gameItem.icon,
      launcher: gameItem.launcher,
      status: gameItem.status,
      hash_md5: gameItem.hash,
      size_in_bytes: gameItem.sizeInBytes,
      prefix_hash_md5: gameItem.prefixHash,
      prefix_size_in_bytes: gameItem.prefixSizeInBytes,
    });

    console.log(`Game item ${steamAppId} created successfully`);

    console.log('GAME ITEM>>>>>>>>>>>>', makeGameItem(game));

    return makeGameItem(game);
  } catch (error) {
    console.error('Error creating game item:', error);
    return null;
  }
}

export { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData };
