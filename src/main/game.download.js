const nodeDiskInfo = require('node-disk-info');
const path = require('path');

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

export { getDownloadDetails };
