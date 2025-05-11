import fs from 'fs-extra';
import path from 'node:path';

import { getConfig } from './conf';

async function makeGameItemFromDbItem(game) {
  return {
    steamAppId: game['steam_app_id'],
    steamTitle: game['steam_title'],
    steamExeTarget: game['steam_exe_target'],
    steamStartDir: game['steam_start_dir'],
    steamLaunchArgs: game['steam_launch_args'],
    icon: game['icon'] ? Buffer.from(game['icon']).toString('base64') : null,
    gameLocation: game['game_location'],
    prefixLocation: game['prefix_location'],
    launcher: game['launcher'],
    gameHash: game['game_hash_md5'],
    gameSizeInBytes: game['game_size_in_bytes'],
    prefixHash: game['prefix_hash_md5'],
    prefixSizeInBytes: game['prefix_size_in_bytes'],
    status: game['status'],
    // --- augmented fields ---
    source: 'db',
    realLocalGamePath: getRealLocalGamePath(game['game_location']),
    realLocalPrefixPath: getRealLocalPrefixPath(game['prefix_location']),

    localGameHash: null,
    localGameSizeInBytes: 0,
    remoteGameHash: null,
    remoteGameSizeInBytes: 0,

    localPrefixHash: null,
    localPrefixSizeInBytes: 0,
    remotePrefixHash: null,
    remotePrefixSizeInBytes: 0,
  };
}

async function makeGameItemFromSteamItem(shortcut) {
  return {
    steamAppId: shortcut['AppId'] ?? shortcut['appid'],
    steamTitle: shortcut['AppName'] ?? shortcut['appname'],
    steamExeTarget: shortcut['Exe'] ?? shortcut['exe'],
    steamStartDir: shortcut['StartDir'] ?? shortcut['startdir'],
    steamLaunchArgs: shortcut['LaunchOptions'] ?? shortcut['launchoptions'],
    icon: loadIconFromPath(shortcut['Icon'] ?? shortcut['icon']),

    // all these fields are not in the shortcuts.vdf file and unknown
    // they will be populated later when saving the game
    // for example the start dir could look like this:
    // /home/deck/.var/app/ru.linux_gaming.PortProton/steam_scripts
    gameLocation: null, // gameLocation does not exist for steam entries
    prefixLocation: null, // prefixLocation does not exist for steam entries
    launcher: 'NOOP',
    gameHash: null,
    gameSizeInBytes: 0,
    prefixHash: null,
    prefixSizeInBytes: 0,
    status: 'DRAFT',

    source: 'steam',
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
  };
}

function loadIconFromPath(iconPath) {
  // Load the icon from the given path
  // the icon will be stored in the database as a blob

  // check if the icon path is a valid file
  if (!fs.existsSync(iconPath)) {
    console.error(`Icon path does not exist: ${iconPath}`);
    return null;
  }

  const iconBuffer = fs.readFileSync(iconPath);
  return iconBuffer.toString('base64');
}

function getRealLocalGamePath(gameLocation) {
  const config = getConfig();

  if (!gameLocation) {
    console.error('game.item::getRealLocalGamePath: Game location is not specified');
    return null;
  }

  if (!config.local_lib.games_path.trim()) {
    console.error('game.item::getRealLocalGamePath: Games lib path client config is not specified');
    return null;
  }

  // get the list of all available/configured game libs locations
  // they are being stored in the following format
  // /path/to/game/lib;/another/path/to/game/lib;/and/so/on
  const gamesLibPathList = config.local_lib.games_path.split(';');

  for (const gamesLibPath of gamesLibPathList) {
    const localGamePath = path.join(gamesLibPath, gameLocation);
    console.log('game.item::getRealLocalGamePath: Local Game Path:', localGamePath);

    if (fs.existsSync(localGamePath)) {
      return localGamePath;
    }

    console.log('game.item::getRealLocalGamePath: Game not found at the following location: ' + localGamePath);
  }

  return null;
}

function getRealLocalPrefixPath(prefixLocation) {
  const config = getConfig();

  if (!prefixLocation) {
    console.error('game.item::getRealLocalPrefixPath: Prefix location is not specified');
    return null;
  }

  if (!config.local_lib.prefixes_path.trim()) {
    console.error('game.item::getRealLocalPrefixPath: Prefixes lib path client config is not specified');
    return null;
  }

  try {
    const localPrefixPath = path.join(config.client.prefixes_path, prefixLocation);

    if (!fs.existsSync(localPrefixPath)) {
      console.log('game.item::getRealLocalPrefixPath: Prefix not found at the following location: ' + localPrefixPath);
      return null;
    }

    console.log('game.item::getRealLocalPrefixPath: Local Prefix Path:', localPrefixPath);

    return localPrefixPath;
  } catch (error) {
    console.error('game.item::getRealLocalPrefixPath: Error getting local prefix path:', error);
    return null;
  }
}

export { makeGameItemFromDbItem, makeGameItemFromSteamItem };
