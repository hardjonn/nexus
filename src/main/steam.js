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

async function steam_SyncStateForGame(steamAppId, gameItem) {
  if (gameItem.source === 'steam') {
    console.log('steam_SyncStateForGame: Game is from Steam, skipping sync');
    return gameItem;
  }

  if (gameItem.status !== 'ACTIVE') {
    console.log('steam_SyncStateForGame: Game is not in ACTIVE state, skipping sync');
    return gameItem;
  }

  try {
    console.log('steam_SyncStateForGame: Syncing state for game: ' + steamAppId);

    // check and make sure the game is present locally
    const isGamePresentLocally = await fs.pathExists(gameItem.realLocalGamePath);

    let title = gameItem.steamTitle;

    // if the game is not present locally, then it's not installed
    // and cannot be launched, thus mark it in Steam with appropriate state
    if (!isGamePresentLocally) {
      console.log('steam_SyncStateForGame: Game is not installed locally, marking as absent');
      title = makeAbsentTitle(gameItem);
    } else {
      console.log('steam_SyncStateForGame: Game is installed locally, marking as present');
      title = makePresentTitle(gameItem);
    }

    await updateSteamTitle(gameItem, title);

    return title;
  } catch (error) {
    console.error('steam_updateSteamState: Error updating steam state:', error);
    throw error;
  }
}

function makeAbsentTitle(gameItem) {
  return `❌ ${gameItem.steamTitle} [${gameItem.launcher}]`;
}

function makePresentTitle(gameItem) {
  // need to find which game library the game belongs to
  const config = getConfig();
  const gameLibPathList = config.local_lib.games_path;

  let longestPath = '';
  let libLabel = 'N/A';

  for (const gameLib of gameLibPathList) {
    if (gameItem.realLocalGamePath.startsWith(gameLib.path) && gameLib.path.length > longestPath.length) {
      longestPath = gameLib.path;
      libLabel = gameLib.label;
    }
  }

  return `✅ ${gameItem.steamTitle} [${libLabel}] [${gameItem.launcher}]`;
}

async function updateSteamTitle(gameItem, title) {
  try {
    console.log('steam_updateSteamTitle: Updating game title:', title);
    const shortcutsPath = getVdfShortcutsFullPath();
    console.log('Shortcuts Path:', shortcutsPath);

    if (!fs.existsSync(shortcutsPath)) {
      console.error('steam_updateSteamTitle: Shortcuts file does not exist:', shortcutsPath);
      throw new Error('Shortcuts file does not exist: ' + shortcutsPath);
    }

    // once we confirmed the file exists we need to makes a backup of it
    const backupPath = shortcutsPath + '.' + Date.now() + '.bak';
    await fs.copy(shortcutsPath, backupPath);
    console.log('steam_updateSteamTitle: Backup created:', backupPath);

    const inBuffer = await fs.readFile(shortcutsPath);
    const shortcutsData = readVdf(inBuffer);

    let hadChanges = false;

    for (const key of Object.keys(shortcutsData['shortcuts'])) {
      const shortcut = shortcutsData['shortcuts'][key];

      if (shortcut['appid'] == gameItem.steamAppId || shortcut['AppId'] == gameItem.steamAppId) {
        console.log('steam_updateSteamTitle: Found matching shortcut:', shortcut);
        if (shortcut['appname']) {
          shortcutsData['shortcuts'][key]['appname'] = title;
          hadChanges = true;
        }

        if (shortcut['AppName']) {
          shortcutsData['shortcuts'][key]['AppName'] = title;
          hadChanges = true;
        }

        break;
      }
    }

    if (hadChanges) {
      console.log('steam_updateSteamTitle: Saving changes to shortcuts file...');
      const outBuffer = writeVdf(shortcutsData);
      await fs.writeFile(shortcutsPath, outBuffer);
    }
  } catch (error) {
    console.error('steam_updateSteamTitle: Error updating game title:', error);
    throw error;
  }
}

export { steam_getAllGamesMap, steam_SyncStateForGame };
