import { db } from './db';

const Game = db.games;

async function db_getAllGamesMap() {
  try {
    const games = await Game.findAll();
    // convert games to a map
    const gamesMap = {};
    for (const game of games) {
      const steamAppId = game['steam_app_id'];
      gamesMap[steamAppId] = {
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
        status: game['status'],
        realLocalPath: null,
        localHash: null,
        localSizeInBytes: 0,
        remoteHash: null,
        remoteSizeInBytes: 0,
        source: 'db',
      };
    }

    return gamesMap;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
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

export { db_getAllGamesMap, db_uploadIcon };
