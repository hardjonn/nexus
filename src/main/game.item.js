import fs from 'fs-extra';

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
    gameLocation: null,
    prefixLocation: null,
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

export { makeGameItemFromDbItem, makeGameItemFromSteamItem };
