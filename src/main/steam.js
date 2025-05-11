import path from 'node:path';
import fs from 'fs-extra';
import { readVdf, writeVdf } from 'steam-binary-vdf';

import { makeGameItemFromSteamItem } from './game.item';
import { getConfig } from './conf';

async function steam_getAllGamesMap() {
  try {
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

      gamesMap[steamAppId] = makeGameItemFromSteamItem(shortcut);
    }

    return gamesMap;
  } catch (error) {
    console.error('steam_getAllGamesMap: Error fetching games:', error);
    throw error;
  }
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
