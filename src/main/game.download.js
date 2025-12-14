const nodeDiskInfo = require('node-disk-info');
const path = require('path');
const fs = require('fs-extra');

import { getConfig } from './conf';
import { getListOfPrefixesOnRemote } from './transfer';

async function getDownloadDetails(steamAppId, gameItem) {
  // the download details include
  //  - list of available prefixes

  const config = getConfig();

  const downloadDetails = {
    prefixes: [],
    libs: [],
  };

  downloadDetails.prefixes = await getAvailablePrefixes(config, gameItem.prefixLocation);

  downloadDetails.libs = await getAvailableLibs(config, gameItem.gameLocation);

  return downloadDetails;
}

async function getAvailablePrefixes(config, prefixLocation) {
  if (!prefixLocation) {
    return [];
  }

  try {
    console.log('games::getAvailablePrefixes: Getting remote prefix for ' + prefixLocation);
    const remotePrefixes = await getListOfPrefixesOnRemote(
      config.remote_lib.host,
      config.remote_lib.user,
      config.remote_lib.private_key_path,
      config.remote_lib.prefixes_path,
      prefixLocation
    );

    console.log('games::getAvailablePrefixes: Remote Prefixes:', remotePrefixes);

    return remotePrefixes;
  } catch (error) {
    console.error('games::getAvailablePrefixes: Error getting remote prefixes:', error);
    return [];
  }
}

async function getAvailableLibs(config, gameLocation) {
  try {
    console.log('games::getAvailableLibs: Getting local libs');

    const gamesLibPathList = config.local_lib.games_path;
    console.log('games::getAvailableLibs: Local Libs:', gamesLibPathList);

    const disks = await nodeDiskInfo.getDiskInfo();
    console.log('games::getAvailableLibs: Disks:', disks);

    const availableLibs = [];

    for (const libPath of gamesLibPathList) {
      let maxMatchedLen = 0;
      let matchedDisk = null;

      for (const disk of disks) {
        if (libPath.path.startsWith(disk.mounted) && disk.mounted.length > maxMatchedLen) {
          maxMatchedLen = disk.mounted.length;
          matchedDisk = disk;
        }
      }

      if (matchedDisk) {
        console.log('games::getAvailableLibs: Matched disk for ' + libPath.path + ':', matchedDisk);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath.path + ':', matchedDisk.available);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath.path + ':', matchedDisk.capacity);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath.path + ':', matchedDisk.used);
        availableLibs.push({
          path: libPath.path,
          label: libPath.label,
          diskInfo: matchedDisk,
          downloadLocation: path.join(libPath.path, gameLocation),
        });
      }
    }

    return availableLibs;
  } catch (error) {
    console.error('games::getAvailableLibs: Error getting local libs:', error);
    return [];
  }
}

async function runPostDownloadActions(gameItem) {
  const config = getConfig();

  try {
    if (gameItem.launcher === 'PORT_PROTON') {
      await runPostDownloadAction_PortProton(config, gameItem);
    }

    if (gameItem.launcher === 'NOOP') {
      await runPostDownloadAction_NOOP(config, gameItem);
    }

    if (gameItem.launcher === 'PS2') {
      await runPostDownloadAction_PS2(config, gameItem);
    }

    if (gameItem.launcher === 'PS3') {
      await runPostDownloadAction_PS3(config, gameItem);
    }

    if (gameItem.launcher === 'SWITCH_CITRON') {
      await runPostDownloadAction_SwitchCitron(config, gameItem);
    }

    if (gameItem.launcher === 'SWITCH_RYUJINX') {
      await runPostDownloadAction_SwitchRyuJinX(config, gameItem);
    }
  } catch (error) {
    console.error('games::runPostDownloadActions: Error running post download actions:', error);
    throw error;
  }
}

async function runPostDownloadAction_PortProton(config, gameItem) {
  console.log('games::runPostDownloadAction_PortProton: Running post download actions for port proton');

  try {
    const launcherTargetFullPath = path.join(gameItem.realLocalGamePath, gameItem.launcherTarget);
    console.log('games::runPostDownloadAction_PortProton: Launcher Target Full Path:', launcherTargetFullPath);

    const portProtonLauncherPath = path.join(config.port_proton.path, 'data/scripts/start.sh');
    console.log('games::runPostDownloadAction_PortProton: Port Proton Launcher Path:', portProtonLauncherPath);

    const portProtonScriptLocation = gameItem.steamExeTarget.replace(/^"(.*)"$/, '$1');
    console.log('games::runPostDownloadAction_PortProton: Port Proton Script Location:', portProtonScriptLocation);

    const template =
      '#!/usr/bin/env bash\n' +
      'export LD_PRELOAD=\n' +
      'export START_FROM_STEAM=1\n' +
      'export START_FROM_FLATPAK=1\n' +
      `"${portProtonLauncherPath}" "${launcherTargetFullPath}" "$@"`;
    console.log('games::runPostDownloadAction_PortProton: Template:', template);

    fs.writeFileSync(portProtonScriptLocation, template);

    // add execute permissions
    fs.chmodSync(portProtonScriptLocation, 0o755);
  } catch (error) {
    console.error('games::runPostDownloadAction_PortProton: Error running post download action for Port Proton:', error);
    throw error;
  }
}
async function runPostDownloadAction_NOOP(config, gameItem) {
  console.log('games::runPostDownloadAction_NOOP: Running post download actions for noop');

  try {
    const launcherTargetFullPath = path.join(gameItem.realLocalGamePath, gameItem.launcherTarget);
    console.log('games::runPostDownloadAction_NOOP: Launcher Target Full Path:', launcherTargetFullPath);

    // add execute permissions
    fs.chmodSync(launcherTargetFullPath, 0o755);
  } catch (error) {
    console.error('games::runPostDownloadAction_NOOP: Error running post download action for NOOP:', error);
    throw error;
  }
}

async function runPostDownloadAction_PS2(config, gameItem) {
  console.log('games::runPostDownloadAction_PS2: Running post download actions for PS2');

  try {
    const romLink = path.join(config.emulation.path, 'roms', 'ps2', gameItem.launcherTarget);
    console.log('games::runPostDownloadAction_PS2: ROM Link:', romLink);

    const linkPointsTo = path.join(gameItem.realLocalGamePath, gameItem.launcherTarget);
    console.log('games::runPostDownloadAction_PS2: Link Points To:', linkPointsTo);

    try {
      const stat = fs.lstatSync(romLink);
      console.log('games::runPostDownloadAction_PS2: ROM Link Stats:', stat);

      if (stat.isSymbolicLink()) {
        console.log('games::runPostDownloadAction_PS2: ROM Link is a symlink, removing it');
        fs.unlinkSync(romLink);
      }
    } catch (error) {
      console.error('games::runPostDownloadAction_PS2: Error getting ROM link stats:', error);
    }

    fs.ensureSymlinkSync(linkPointsTo, romLink);
    console.log('games::runPostDownloadAction_PS2: Link created successfully');
  } catch (error) {
    console.error('games::runPostDownloadAction_PS2: Error running post download action for PS2:', error);
    throw error;
  }
}

async function runPostDownloadAction_PS3(config, gameItem) {
  console.log('games::runPostDownloadAction_PS3: Running post download actions for PS3');

  try {
    const gameLocationFolderName = path.basename(gameItem.gameLocation);
    console.log('games::runPostDownloadAction_PS3: Game Location Folder Name:', gameLocationFolderName);

    const romLink = path.join(config.emulation.path, 'roms', 'ps3', gameLocationFolderName);
    console.log('games::runPostDownloadAction_PS3: ROM Link:', romLink);

    const linkPointsTo = gameItem.realLocalGamePath;
    console.log('games::runPostDownloadAction_PS3: Link Points To:', linkPointsTo);

    try {
      const stat = fs.lstatSync(romLink);
      console.log('games::runPostDownloadAction_PS3: ROM Link Stats:', stat);

      if (stat.isSymbolicLink()) {
        console.log('games::runPostDownloadAction_PS3: ROM Link is a symlink, removing it');
        fs.unlinkSync(romLink);
      }
    } catch (error) {
      console.error('games::runPostDownloadAction_PS3: Error getting ROM link stats:', error);
    }

    fs.ensureSymlinkSync(linkPointsTo, romLink);
    console.log('games::runPostDownloadAction_PS3: Link created successfully');
  } catch (error) {
    console.error('games::runPostDownloadAction_PS3: Error running post download action for PS3:', error);
    throw error;
  }
}

async function runPostDownloadAction_SwitchCitron(config, gameItem) {
  console.log('games::runPostDownloadAction_SwitchCitron: Running post download actions for Switch Citron');

  try {
    const gameLocationFolderName = path.basename(gameItem.gameLocation);
    console.log('games::runPostDownloadAction_SwitchCitron: Game Location Folder Name:', gameLocationFolderName);

    const romLink = path.join(config.emulation.path, 'roms', 'switch', gameLocationFolderName);
    console.log('games::runPostDownloadAction_SwitchCitron: ROM Link:', romLink);

    const linkPointsTo = gameItem.realLocalGamePath;
    console.log('games::runPostDownloadAction_SwitchCitron: Link Points To:', linkPointsTo);

    try {
      const stat = fs.lstatSync(romLink);
      console.log('games::runPostDownloadAction_SwitchCitron: ROM Link Stats:', stat);

      if (stat.isSymbolicLink()) {
        console.log('games::runPostDownloadAction_SwitchCitron: ROM Link is a symlink, removing it');
        fs.unlinkSync(romLink);
      }
    } catch (error) {
      console.error('games::runPostDownloadAction_SwitchCitron: Error getting ROM link stats:', error);
    }

    fs.ensureSymlinkSync(linkPointsTo, romLink);
    console.log('games::runPostDownloadAction_SwitchCitron: Link created successfully');
  } catch (error) {
    console.error('games::runPostDownloadAction_SwitchCitron: Error running post download action for Switch Citron:', error);
    throw error;
  }
}

async function runPostDownloadAction_SwitchRyuJinX(config, gameItem) {
  console.log('games::runPostDownloadAction_SwitchRyuJinX: Running post download actions for Switch RyuJinX');

  try {
    const gameLocationFolderName = path.basename(gameItem.gameLocation);
    console.log('games::runPostDownloadAction_SwitchRyuJinX: Game Location Folder Name:', gameLocationFolderName);

    const romLink = path.join(config.emulation.path, 'roms', 'switch', gameLocationFolderName);
    console.log('games::runPostDownloadAction_SwitchRyuJinX: ROM Link:', romLink);

    const linkPointsTo = gameItem.realLocalGamePath;
    console.log('games::runPostDownloadAction_SwitchRyuJinX: Link Points To:', linkPointsTo);

    try {
      const stat = fs.lstatSync(romLink);
      console.log('games::runPostDownloadAction_SwitchRyuJinX: ROM Link Stats:', stat);

      if (stat.isSymbolicLink()) {
        console.log('games::runPostDownloadAction_SwitchRyuJinX: ROM Link is a symlink, removing it');
        fs.unlinkSync(romLink);
      }
    } catch (error) {
      console.error('games::runPostDownloadAction_SwitchRyuJinX: Error getting ROM link stats:', error);
    }

    fs.ensureSymlinkSync(linkPointsTo, romLink);
    console.log('games::runPostDownloadAction_SwitchRyuJinX: Link created successfully');
  } catch (error) {
    console.error('games::runPostDownloadAction_SwitchRyuJinX: Error running post download action for Switch RyuJinX:', error);
    throw error;
  }
}

export { getDownloadDetails, runPostDownloadActions };
