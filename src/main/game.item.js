import { loadIconFromPath } from './game.icon';

function makeGameItemFromDbItem(game) {
  return {
    steamAppId: game['steam_app_id'],
    steamTitle: game['steam_title'],
    steamExeTarget: game['steam_exe_target'],
    steamStartDir: game['steam_start_dir'],
    steamLaunchArgs: game['steam_launch_args'],
    version: game['version'],
    description: game['description'],
    icon: game['icon'],
    gameLocation: game['game_location'],
    prefixLocation: game['prefix_location'],
    launcher: game['launcher'],
    launcherTarget: game['launcher_target'],
    gameHash: game['game_hash'],
    gameSizeInBytes: game['game_size_in_bytes'],
    prefixHash: game['prefix_hash'],
    prefixSizeInBytes: game['prefix_size_in_bytes'],
    status: game['status'],
    // --- augmented fields ---
    source: 'db',
  };
}

function makeGameItemFromSteamItem(shortcut) {
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
    version: null,
    description: null,
    gameLocation: null, // gameLocation does not exist for steam entries
    prefixLocation: null, // prefixLocation does not exist for steam entries
    launcher: 'NOOP',
    launcherTarget: null,
    gameHash: null,
    gameSizeInBytes: 0,
    prefixHash: null,
    prefixSizeInBytes: 0,
    status: 'DRAFT',

    source: 'steam',
  };
}

export { makeGameItemFromDbItem, makeGameItemFromSteamItem };
