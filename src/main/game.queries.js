import { db } from './db';
import { makeGameItemFromDbItem } from './game.item';

const Game = db;

async function db_getAllGamesMap(progressCallback) {
  try {
    console.log('game.queries::db_getAllGamesMap');
    const games = await Game.findAll(progressCallback);
    // convert games to a map
    const gamesMap = {};
    for (const game of games) {
      const steamAppId = game['steam_app_id'];
      gamesMap[steamAppId] = makeGameItemFromDbItem(game);
    }

    return gamesMap;
  } catch (error) {
    console.error('game.queries::db_getAllGamesMap: Error fetching games:', error);
    throw error;
  }
}

async function db_uploadIcon(steamAppId, resizedImage) {
  try {
    console.log('game.queries::db_uploadIcon', steamAppId);
    const update = {
      icon: resizedImage,
    };

    const conditions = {
      where: {
        steam_app_id: steamAppId,
      },
    };

    const game = await Game.update(update, conditions);

    if (!game) {
      throw new Error(`Game with steamAppId ${steamAppId} not found`);
    }

    console.log(`game.queries::db_uploadIcon: Icon for game ${steamAppId} updated successfully`);
    return true;
  } catch (error) {
    console.error('game.queries::db_uploadIcon: Error uploading icon:', error);
    return false;
  }
}

async function db_updateGameItem(steamAppId, gameItem) {
  try {
    console.log('game.queries::db_updateGameItem', steamAppId);

    const update = {
      steam_title: gameItem.steamTitle,
      steam_exe_target: gameItem.steamExeTarget,
      steam_start_dir: gameItem.steamStartDir,
      steam_launch_args: gameItem.steamLaunchArgs,
      version: gameItem.version,
      description: gameItem.description,
      game_location: gameItem.gameLocation,
      prefix_location: gameItem.prefixLocation,
      launcher: gameItem.launcher,
      launcher_target: gameItem.launcherTarget,
      status: gameItem.status,
      game_hash_md5: gameItem.gameHash,
      game_size_in_bytes: gameItem.gameSizeInBytes,
      prefix_hash_md5: gameItem.prefixHash,
      prefix_size_in_bytes: gameItem.prefixSizeInBytes,
    };

    const conditions = {
      where: {
        steam_app_id: steamAppId,
      },
    };

    const game = await Game.update(update, conditions);
    console.log(`game.queries::db_updateGameItem: Game item ${steamAppId} updated successfully`);

    return makeGameItemFromDbItem(game);
  } catch (error) {
    console.error('game.queries::db_updateGameItem: Error saving game item:', error);
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
      version: gameItem.version,
      description: gameItem.description,
      game_location: gameItem.gameLocation,
      prefix_location: gameItem.prefixLocation,
      icon: gameItem.icon,
      launcher: gameItem.launcher,
      launcher_target: gameItem.launcherTarget,
      status: gameItem.status,
      game_hash_md5: gameItem.gameHash,
      game_size_in_bytes: gameItem.gameSizeInBytes,
      prefix_hash_md5: gameItem.prefixHash,
      prefix_size_in_bytes: gameItem.prefixSizeInBytes,
    });

    console.log(`Game item ${steamAppId} created successfully`);

    console.log('game.queries::db_createGameItemFromSteamData: Game item:', game);

    const madeGameItem = makeGameItemFromDbItem(game);
    console.log('game.queries::db_createGameItemFromSteamData: Made game item:', madeGameItem);

    return madeGameItem;
  } catch (error) {
    console.error('Error creating game item:', error);
    return null;
  }
}

async function db_updateGameState(steamAppId, state) {
  try {
    const update = {
      status: state,
    };

    const conditions = {
      where: {
        steam_app_id: steamAppId,
      },
    };

    await Game.update(update, conditions);

    console.log(`Game state ${steamAppId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating game state:', error);
    return false;
  }
}

export { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData, db_updateGameState };
