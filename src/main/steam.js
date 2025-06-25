import path from 'node:path';
import fs from 'fs-extra';
import { readVdf, writeVdf } from 'steam-binary-vdf';

import { makeGameItemFromSteamItem } from './game.item';
import { getConfig } from './conf';

async function steam_getAllGamesMap() {
  try {
    const shortcutsPath = getVdfShortcutsFullPath();
    console.log('steam::steam_getAllGamesMap: Shortcuts Path:', shortcutsPath);

    const inBuffer = await fs.readFile(shortcutsPath);
    const shortcutsData = readVdf(inBuffer);
    //   console.log(shortcutsData);

    const shortcutsMap = shortcutsData['shortcuts'];
    const gamesMap = {};

    for (const key in shortcutsMap) {
      const shortcut = shortcutsMap[key];
      const steamAppId = String(shortcut['appid']);

      gamesMap[steamAppId] = makeGameItemFromSteamItem(shortcut);
    }

    return gamesMap;
  } catch (error) {
    console.error('steam::steam_getAllGamesMap: Error fetching games:', error);
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
    console.log('steam::steam_SyncStateForGame: Game is from Steam, skipping sync');
    return gameItem;
  }

  if (gameItem.status !== 'ACTIVE') {
    console.log('steam::steam_SyncStateForGame: Game is not in ACTIVE state, skipping sync');
    return gameItem;
  }

  try {
    console.log('steam::steam_SyncStateForGame: Syncing state for game: ' + steamAppId);

    const title = await makeSteamTitle(gameItem);
    gameItem.localState.steamTitle = title;

    if (prevGameItem.launcher !== gameItem.launcher) {
      console.log('steam::steam_SyncStateForGame: Launcher changed, updating Steam shortcut');
      const { exeTarget, startDir, launchArgs } = await makeLaunchDetails(gameItem);

      console.log('steam::steam_SyncStateForGame: Exe Target:', exeTarget);
      console.log('steam::steam_SyncStateForGame: Start Dir:', startDir);
      console.log('steam::steam_SyncStateForGame: Launch Args:', launchArgs);

      gameItem.steamExeTarget = exeTarget;
      gameItem.steamStartDir = startDir;
      gameItem.steamLaunchArgs = launchArgs;
    }

    console.log('steam::steam_SyncStateForGame: Updating Steam shortcut if needed or creating a new one');
    await tryToUpdateSteamShortcut(gameItem);

    return gameItem;
  } catch (error) {
    console.error('steam::steam_SyncStateForGame: Error updating steam state:', error);
    throw error;
  }
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
    console.log('steam::makeSteamTitle: Game is not installed locally, marking as absent');
    return makeAbsentTitle(gameItem);
  }

  console.log('steam::makeSteamTitle: Game is installed locally, marking as present');
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

async function tryToUpdateSteamShortcut(gameItem) {
  try {
    console.log('steam::tryToUpdateSteamShortcut: Updating game:', gameItem);
    const shortcutsPath = getVdfShortcutsFullPath();
    console.log('steam::tryToUpdateSteamShortcut: Shortcuts Path:', shortcutsPath);

    if (!fs.existsSync(shortcutsPath)) {
      console.error('steam::tryToUpdateSteamShortcut: Shortcuts file does not exist:', shortcutsPath);
      throw new Error('Shortcuts file does not exist: ' + shortcutsPath);
    }

    // once we confirmed the file exists we need to makes a backup of it
    const backupPath = shortcutsPath + '.' + Date.now() + '.bak';
    await fs.copy(shortcutsPath, backupPath);
    console.log('steam::tryToUpdateSteamShortcut: Backup created:', backupPath);

    const inBuffer = await fs.readFile(shortcutsPath);
    const shortcutsData = readVdf(inBuffer);

    let hadChanges = false;
    let foundInDataSet = false;

    for (const key of Object.keys(shortcutsData['shortcuts'])) {
      const shortcut = shortcutsData['shortcuts'][key];

      if (shortcut['appid'] == gameItem.steamAppId || shortcut['AppId'] == gameItem.steamAppId) {
        console.log('steam::tryToUpdateSteamShortcut: Found matching shortcut:', shortcut);
        foundInDataSet = true;

        if (shortcut['appname'] && shortcut['appname'] !== gameItem.localState.steamTitle) {
          console.log('steam::tryToUpdateSteamShortcut: Updated appname from', shortcut['appname'], 'to', gameItem.localState.steamTitle);
          shortcutsData['shortcuts'][key]['appname'] = gameItem.localState.steamTitle;
          hadChanges = true;
        }

        if (shortcut['AppName'] && shortcut['AppName'] !== gameItem.localState.steamTitle) {
          console.log('steam::tryToUpdateSteamShortcut: Updated AppName from', shortcut['AppName'], 'to', gameItem.localState.steamTitle);
          shortcutsData['shortcuts'][key]['AppName'] = gameItem.localState.steamTitle;
          hadChanges = true;
        }

        if (shortcut['exe'] && shortcut['exe'] !== gameItem.steamExeTarget) {
          console.log('steam::tryToUpdateSteamShortcut: Updated exe from', shortcut['exe'], 'to', gameItem.steamExeTarget);
          shortcutsData['shortcuts'][key]['exe'] = gameItem.steamExeTarget;
          hadChanges = true;
        }

        if (shortcut['Exe'] && shortcut['Exe'] !== gameItem.steamExeTarget) {
          console.log('steam::tryToUpdateSteamShortcut: Updated Exe from', shortcut['Exe'], 'to', gameItem.steamExeTarget);
          shortcutsData['shortcuts'][key]['Exe'] = gameItem.steamExeTarget;
          hadChanges = true;
        }

        if (shortcut['startdir'] && shortcut['startdir'] !== gameItem.steamStartDir) {
          console.log('steam::tryToUpdateSteamShortcut: Updated startdir from', shortcut['startdir'], 'to', gameItem.steamStartDir);
          shortcutsData['shortcuts'][key]['startdir'] = gameItem.steamStartDir;
          hadChanges = true;
        }

        if (shortcut['StartDir'] && shortcut['StartDir'] !== gameItem.steamStartDir) {
          console.log('steam::tryToUpdateSteamShortcut: Updated StartDir from', shortcut['StartDir'], 'to', gameItem.steamStartDir);
          shortcutsData['shortcuts'][key]['StartDir'] = gameItem.steamStartDir;
          hadChanges = true;
        }

        if (shortcut['launchoptions'] && shortcut['launchoptions'] !== gameItem.steamLaunchArgs) {
          console.log('steam::tryToUpdateSteamShortcut: Updated launchoptions from', shortcut['launchoptions'], 'to', gameItem.steamLaunchArgs);
          shortcutsData['shortcuts'][key]['launchoptions'] = gameItem.steamLaunchArgs;
          hadChanges = true;
        }

        if (shortcut['LaunchOptions'] && shortcut['LaunchOptions'] !== gameItem.steamLaunchArgs) {
          console.log('steam::tryToUpdateSteamShortcut: Updated LaunchOptions from', shortcut['LaunchOptions'], 'to', gameItem.steamLaunchArgs);
          shortcutsData['shortcuts'][key]['LaunchOptions'] = gameItem.steamLaunchArgs;
          hadChanges = true;
        }

        break;
      }
    }

    if (!foundInDataSet) {
      console.log('steam::tryToUpdateSteamShortcut: Game not found in shortcuts file, adding...');
      console.log('steam::tryToUpdateSteamShortcut: New Key:', Object.keys(shortcutsData['shortcuts']).length);
      shortcutsData['shortcuts'][Object.keys(shortcutsData['shortcuts']).length] = {
        appid: gameItem.steamAppId,
        AppName: gameItem.localState.steamTitle,
        exe: gameItem.steamExeTarget,
        StartDir: gameItem.steamStartDir,
        LaunchOptions: gameItem.steamLaunchArgs,
      };
      hadChanges = true;
    }

    if (hadChanges) {
      console.log('steam::tryToUpdateSteamShortcut: Saving changes to shortcuts file...');
      const outBuffer = writeVdf(shortcutsData);
      await fs.writeFile(shortcutsPath, outBuffer);
    }
  } catch (error) {
    console.error('steam::tryToUpdateSteamShortcut: Error updating game shortcut:', error);
    throw error;
  }
}

export { steam_getAllGamesMap, steam_SyncStateForGame };
