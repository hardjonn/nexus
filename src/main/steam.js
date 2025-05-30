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

async function steam_SyncStateForGame(steamAppId, prevGameItem, gameItem) {
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

    const title = await makeSteamTitle(gameItem);
    gameItem.localState.steamTitle = title;

    if (prevGameItem.launcher !== gameItem.launcher) {
      console.log('steam_SyncStateForGame: Launcher changed, updating Steam shortcut');
      const { exeTarget, startDir, launchArgs } = await makeLaunchDetails(gameItem);

      console.log('steam_SyncStateForGame: Exe Target:', exeTarget);
      console.log('steam_SyncStateForGame: Start Dir:', startDir);
      console.log('steam_SyncStateForGame: Launch Args:', launchArgs);

      gameItem.steamExeTarget = exeTarget;
      gameItem.steamStartDir = startDir;
      gameItem.steamLaunchArgs = launchArgs;
    }

    if (shortcutNeedsUpdate(prevGameItem, gameItem)) {
      console.log('steam_SyncStateForGame: Shortcut needs update, updating Steam shortcut');
      await updateSteamShortcut(gameItem);
    }

    return gameItem;
  } catch (error) {
    console.error('steam_updateSteamState: Error updating steam state:', error);
    throw error;
  }
}

function shortcutNeedsUpdate(prevGameItem, gameItem) {
  if (prevGameItem.localState.steamTitle !== gameItem.localState.steamTitle) {
    return true;
  }

  if (prevGameItem.steamExeTarget !== gameItem.steamExeTarget) {
    return true;
  }

  if (prevGameItem.steamStartDir !== gameItem.steamStartDir) {
    return true;
  }

  if (prevGameItem.steamLaunchArgs !== gameItem.steamLaunchArgs) {
    return true;
  }

  return false;
}

async function makeLaunchDetails(gameItem) {
  switch (gameItem.launcher) {
    case 'NOOP':
      return makeLaunchDetails_Noop(gameItem);
    case 'PORT_PROTON':
      return makeLaunchDetails_PortProton(gameItem);
    case 'PS2':
      return makeLaunchDetails_PS2(gameItem);
    case 'PS3':
      return makeLaunchDetails_PS3(gameItem);
    case 'SWITCH_CITRON':
      return makeLaunchDetails_SwitchCitron(gameItem);
    case 'SWITCH_RYUJINX':
      return makeLaunchDetails_SwitchRyuJinX(gameItem);
    default:
      throw new Error('Invalid launcher: ' + gameItem.launcher);
  }
}

async function makeLaunchDetails_Noop(gameItem) {
  return {
    exeTarget: gameItem.steamExeTarget,
    startDir: gameItem.steamStartDir,
    launchArgs: gameItem.steamLaunchArgs,
  };
}

async function makeLaunchDetails_PortProton(gameItem) {
  const config = getConfig();

  const exeTarget = path.join(config.port_proton.path, 'steam_scripts', `${gameItem.steamTitle}.sh`);
  const startDir = path.join(config.port_proton.path, 'steam_scripts');
  const launchArgs = '';

  return {
    exeTarget: `"${exeTarget}"`,
    startDir: `"${startDir}"`,
    launchArgs: launchArgs,
  };
}

async function makeLaunchDetails_PS2(gameItem) {
  const config = getConfig();

  const exeTarget = path.join(config.emulation.path, 'tools', 'launchers', 'pcsx2-qt.sh');
  const startDir = path.join(config.emulation.path, 'tools', 'launchers');

  const target = path.join(config.emulation.path, 'roms', 'ps2', gameItem.launcherTarget);
  const launchArgs = `-batch -fullscreen "'${target}'"`;

  return {
    exeTarget: `"${exeTarget}"`,
    startDir: startDir,
    launchArgs: launchArgs,
  };
}

async function makeLaunchDetails_PS3(gameItem) {
  const config = getConfig();

  const launcher = path.join(config.emulation.path, 'tools', 'launchers', 'rpcs3.sh');
  const gameLocationBase = path.basename(gameItem.gameLocation);
  const target = path.join(config.emulation.path, 'roms', 'ps3', gameLocationBase, gameItem.launcherTarget);

  const exeTarget = `"${launcher}" --no-gui "'${target}'"`;
  const startDir = path.join(config.emulation.path, 'tools', 'launchers');
  const launchArgs = '';

  return {
    exeTarget: exeTarget,
    startDir: startDir,
    launchArgs: launchArgs,
  };
}

async function makeLaunchDetails_SwitchCitron(gameItem) {
  const config = getConfig();

  const exeTarget = path.join(config.emulation.path, 'tools', 'launchers', 'citron.sh');
  const startDir = path.join(config.emulation.path, 'tools', 'launchers');

  const gameLocationBase = path.basename(gameItem.gameLocation);
  const target = path.join(config.emulation.path, 'roms', 'switch', gameLocationBase, gameItem.launcherTarget);
  const launchArgs = `vblank_mode=0 %command% -f -g "${target}"`;

  return {
    exeTarget: `"${exeTarget}"`,
    startDir: startDir,
    launchArgs: launchArgs,
  };
}

async function makeLaunchDetails_SwitchRyuJinX(gameItem) {
  const config = getConfig();

  const launcher = path.join(config.emulation.path, 'tools', 'launchers', 'ryujinx.sh');
  const gameLocationBase = path.basename(gameItem.gameLocation);
  const target = path.join(config.emulation.path, 'roms', 'switch', gameLocationBase, gameItem.launcherTarget);
  const exeTarget = `"${launcher}" --fullscreen "${target}"`;

  const startDir = path.join(config.emulation.path, 'tools', 'launchers');
  const launchArgs = '';

  return {
    exeTarget: exeTarget,
    startDir: startDir,
    launchArgs: launchArgs,
  };
}

async function makeSteamTitle(gameItem) {
  // check and make sure the game is present locally
  const isGamePresentLocally = await fs.pathExists(gameItem.realLocalGamePath);

  // if the game is not present locally, then it's not installed
  // and cannot be launched, thus mark it in Steam with appropriate state
  if (!isGamePresentLocally) {
    console.log('makeSteamTitle: Game is not installed locally, marking as absent');
    return makeAbsentTitle(gameItem);
  }

  console.log('makeSteamTitle: Game is installed locally, marking as present');
  return makePresentTitle(gameItem);
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

async function updateSteamShortcut(gameItem) {
  try {
    console.log('steam_updateSteamShortcut: Updating game:', gameItem);
    const shortcutsPath = getVdfShortcutsFullPath();
    console.log('Shortcuts Path:', shortcutsPath);

    if (!fs.existsSync(shortcutsPath)) {
      console.error('steam_updateSteamShortcut: Shortcuts file does not exist:', shortcutsPath);
      throw new Error('Shortcuts file does not exist: ' + shortcutsPath);
    }

    // once we confirmed the file exists we need to makes a backup of it
    const backupPath = shortcutsPath + '.' + Date.now() + '.bak';
    await fs.copy(shortcutsPath, backupPath);
    console.log('steam_updateSteamShortcut: Backup created:', backupPath);

    const inBuffer = await fs.readFile(shortcutsPath);
    const shortcutsData = readVdf(inBuffer);

    let hadChanges = false;

    for (const key of Object.keys(shortcutsData['shortcuts'])) {
      const shortcut = shortcutsData['shortcuts'][key];

      if (shortcut['appid'] == gameItem.steamAppId || shortcut['AppId'] == gameItem.steamAppId) {
        console.log('steam_updateSteamShortcut: Found matching shortcut:', shortcut);
        if (shortcut['appname'] && shortcut['appname'] !== gameItem.steamTitle) {
          console.log('steam_updateSteamShortcut: Updated appname from', shortcut['appname'], 'to', gameItem.steamTitle);
          shortcutsData['shortcuts'][key]['appname'] = gameItem.steamTitle;
          hadChanges = true;
        }

        if (shortcut['AppName'] && shortcut['AppName'] !== gameItem.steamTitle) {
          console.log('steam_updateSteamShortcut: Updated AppName from', shortcut['AppName'], 'to', gameItem.steamTitle);
          shortcutsData['shortcuts'][key]['AppName'] = gameItem.steamTitle;
          hadChanges = true;
        }

        if (shortcut['exe'] && shortcut['exe'] !== gameItem.steamExeTarget) {
          console.log('steam_updateSteamShortcut: Updated exe from', shortcut['exe'], 'to', gameItem.steamExeTarget);
          shortcutsData['shortcuts'][key]['exe'] = gameItem.steamExeTarget;
          hadChanges = true;
        }

        if (shortcut['Exe'] && shortcut['Exe'] !== gameItem.steamExeTarget) {
          console.log('steam_updateSteamShortcut: Updated Exe from', shortcut['Exe'], 'to', gameItem.steamExeTarget);
          shortcutsData['shortcuts'][key]['Exe'] = gameItem.steamExeTarget;
          hadChanges = true;
        }

        if (shortcut['startdir'] && shortcut['startdir'] !== gameItem.steamStartDir) {
          console.log('steam_updateSteamShortcut: Updated startdir from', shortcut['startdir'], 'to', gameItem.steamStartDir);
          shortcutsData['shortcuts'][key]['startdir'] = gameItem.steamStartDir;
          hadChanges = true;
        }

        if (shortcut['StartDir'] && shortcut['StartDir'] !== gameItem.steamStartDir) {
          console.log('steam_updateSteamShortcut: Updated StartDir from', shortcut['StartDir'], 'to', gameItem.steamStartDir);
          shortcutsData['shortcuts'][key]['StartDir'] = gameItem.steamStartDir;
          hadChanges = true;
        }

        if (shortcut['launchoptions'] && shortcut['launchoptions'] !== gameItem.steamLaunchArgs) {
          console.log('steam_updateSteamShortcut: Updated launchoptions from', shortcut['launchoptions'], 'to', gameItem.steamLaunchArgs);
          shortcutsData['shortcuts'][key]['launchoptions'] = gameItem.steamLaunchArgs;
          hadChanges = true;
        }

        if (shortcut['LaunchOptions'] && shortcut['LaunchOptions'] !== gameItem.steamLaunchArgs) {
          console.log('steam_updateSteamShortcut: Updated LaunchOptions from', shortcut['LaunchOptions'], 'to', gameItem.steamLaunchArgs);
          shortcutsData['shortcuts'][key]['LaunchOptions'] = gameItem.steamLaunchArgs;
          hadChanges = true;
        }

        break;
      }
    }

    if (hadChanges) {
      console.log('steam_updateSteamShortcut: Saving changes to shortcuts file...');
      const outBuffer = writeVdf(shortcutsData);
      await fs.writeFile(shortcutsPath, outBuffer);
    }
  } catch (error) {
    console.error('steam_updateSteamShortcut: Error updating game shortcut:', error);
    throw error;
  }
}

export { steam_getAllGamesMap, steam_SyncStateForGame };
