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

    const gamesLibPathList = config.local_lib.games_path.split(';');
    console.log('games::getAvailableLibs: Local Libs:', gamesLibPathList);

    const disks = await nodeDiskInfo.getDiskInfo();
    console.log('games::getAvailableLibs: Disks:', disks);

    const availableLibs = [];

    for (const libPath of gamesLibPathList) {
      let maxMatchedLen = 0;
      let matchedDisk = null;

      for (const disk of disks) {
        if (libPath.startsWith(disk.mounted) && disk.mounted.length > maxMatchedLen) {
          maxMatchedLen = disk.mounted.length;
          matchedDisk = disk;
        }
      }

      if (matchedDisk) {
        console.log('games::getAvailableLibs: Matched disk for ' + libPath + ':', matchedDisk);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath + ':', matchedDisk.available);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath + ':', matchedDisk.capacity);
        console.log('games::getAvailableLibs: Matched disk for ' + libPath + ':', matchedDisk.used);
        availableLibs.push({
          path: libPath,
          diskInfo: matchedDisk,
          downloadLocation: path.join(libPath, gameLocation),
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
  } catch (error) {
    console.error('games::runPostDownloadAction_PortProton: Error running post download action for Port Proton:', error);
    throw error;
  }
}

export { getDownloadDetails, runPostDownloadActions };
