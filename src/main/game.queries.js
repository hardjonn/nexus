import { db } from './db';
import { makeGameItemFromDbItem } from './game.item';

const Game = db.games;

async function db_getAllGamesMap() {
  try {
    console.log('game.queries::db_getAllGamesMap');
    const games = await Game.findAll();
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
    console.log('game.queries::db_updateGameItem', steamAppId);
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

async function db_updateGameState(steamAppId, state) {
  try {
    await Game.update(
      {
        status: state,
      },
      {
        where: {
          steam_app_id: steamAppId,
        },
      }
    );
    console.log(`Game state ${steamAppId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating game state:', error);
    return false;
  }
}

export { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData, db_updateGameState };
