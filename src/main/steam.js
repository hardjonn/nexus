import path from 'node:path';
import fs from 'fs-extra';
import { readVdf, writeVdf } from 'steam-binary-vdf';

import { getConfig } from './conf';
import { error } from 'node:console';

async function steam_getAllGamesMap() {
  const shortcutsPath = getVdfShortcutsFullPath();
  console.log('Shortcuts Path:', shortcutsPath);

  const inBuffer = await fs.readFile(shortcutsPath);
  const shortcutsData = readVdf(inBuffer);
  //   console.log(shortcutsData);

  const shortcutsMap = shortcutsData['shortcuts'];
  const gamesMap = {};

  for (const key in shortcutsMap) {
    const shortcut = shortcutsMap[key];
    const steamAppId = shortcut['appid'];

    gamesMap[steamAppId] = {
      steamAppId: steamAppId,
      steamTitle: shortcut['AppName'] ?? shortcut['appname'],
      steamExeTarget: shortcut['Exe'] ?? shortcut['exe'],
      steamStartDir: shortcut['StartDir'] ?? shortcut['startdir'],
      steamLaunchArgs: shortcut['LaunchOptions'] ?? shortcut['launchoptions'],
      icon: loadIconFromPath(shortcut['Icon'] ?? shortcut['icon']),

      // all these fields are not in the shortcuts.vdf file and unknown
      // they will be populated later when saving the game
      // for example the start dir could look like this:
      // /home/deck/.var/app/ru.linux_gaming.PortProton/steam_scripts
      clientLocation: null,
      nasLocation: null,
      prefixLocation: null,
      launcher: 'NOOP',
      status: 'DRAFT',
      hash: null,
      sizeInBytes: 0,
      realLocalPath: null,
      localHash: null,
      localSizeInBytes: 0,
      remoteHash: null,
      remoteSizeInBytes: 0,
      source: 'steam',
      errors: [],
    };
  }

  return gamesMap;
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

function getVdfShortcutsFullPath() {
  const config = getConfig();

  // will generate the full path to the shortcuts.vdf file
  // based on the user_config_path and user_id
  // and the shortcuts_filename
  // this is used to read the shortcuts.vdf file
  // and get the list of games
  // the path will look like this: /home/<user>/steam/<steam_user_id>/config/shortcuts.vdf
  return path.join(config.steam.user_config_path, config.steam.user_id, 'config', config.steam.shortcuts_filename);
}

export { steam_getAllGamesMap };
