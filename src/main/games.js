import path from 'node:path';
import fs from 'fs-extra';
import crypto from 'crypto';
const { exec } = require('child_process');
const drivelist = require('drivelist');
const nodeDiskInfo = require('node-disk-info');
import { promisify } from 'util';
const execPromise = promisify(exec);
const { NodeSSH } = require('node-ssh');
import { Jimp } from 'jimp';

import { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData } from './game.queries';
import { steam_getAllGamesMap } from './steam';
import { getConfig } from './conf';

// once a game is added to the DB and uploaded to the NAS
// it will source as the single source of truth
// ...
// initial hash and size are coming from the local installation
// and stored in the DB, it's needed to validate that the uploaded
// to the library is fully performed, to make sure that the game
// is not out of sync
// ...
// the hash and size have to be calculated for both local and remote
// ...
// if the hash is NULL and the size is 0 then the game is not installed/present

async function getGames() {
  const gamesMap = {};

  // step 1: get all the records from the database
  const gamesFromDbMap = await db_getAllGamesMap();

  // step 2: get all the records from steam
  const gamesFromSteamMap = await steam_getAllGamesMap();

  // step 3: merge the two maps
  // conflict resolution:
  // 1. if the game is in the DB and not in steam, keep it
  // 2. if the game is in steam and not in the DB, keep it
  // 3. if the game is in both, keep the one from the DB
  const mergedGamesMap = { ...gamesFromSteamMap, ...gamesFromDbMap };
  // console.log('Merged Games Map:', mergedGamesMap);

  // step 4: go over the merged games map
  // calculate the hash and size for both local and remote
  // locally the game could be located at different places
  // depending where it was installed to
  for (const key in mergedGamesMap) {
    const game = await adjustedGameWithLocalAndRemoteDetails(mergedGamesMap[key]);
    gamesMap[game.steamAppId] = game;
  }

  //  console.log('Games Map:', gamesMap);

  return Object.values(gamesMap).slice(0, 5);
}

async function adjustedGameWithLocalAndRemoteDetails(game) {
  const config = getConfig();

  // get the list of all attached drives
  // because we don't know where the game is installed
  // that path could be on the internal drive or on an external drive
  const disks = nodeDiskInfo.getDiskInfoSync();

  // if the game is sourced from steam, it doesn't have
  // the clientLocation and nasLocation
  // so we need to skip it
  if (game.source === 'steam') {
    // console.log('Skipping game from steam:', game);
    return game;
  }

  try {
    for (const disk of disks) {
      const mountPoint = disk.mounted;

      const localGamePath = path.join(mountPoint, config.client.games_lib_path, game.clientLocation);
      console.log('Local Game Path:', localGamePath);

      if (!fs.existsSync(localGamePath)) {
        continue; // Skip to the next disk if the path doesn't exist
      }

      console.log('Found local game path:', localGamePath);

      try {
        const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(localGamePath);

        console.log('Local Game Hash:', localHash);
        console.log('Local Game Size:', localSizeInBytes);

        game.realLocalGamePath = localGamePath;
        game.localHash = localHash;
        game.localSizeInBytes = localSizeInBytes;
      } catch (error) {
        console.error('Error getting local directory hash and size:', error);
        game.errors.push({
          message: `Error getting local directory hash and size: ${error.message}`,
        });
      }

      break;
    }

    try {
      const localPrefixPath = path.join(config.client.prefixes_path, game.prefixLocation);
      console.log('Local Prefix Path:', localPrefixPath);
      game.realLocalPrefixPath = localPrefixPath;

      const { hash: localPrefixHash, sizeInBytes: localPrefixSizeInBytes } = await getLocalDirectoryHashAndSize(localPrefixPath);
      game.localPrefixHash = localPrefixHash;
      game.localPrefixSizeInBytes = localPrefixSizeInBytes;
    } catch (error) {
      console.error('Error getting local prefix hash and size:', error);
      game.errors.push({
        message: `Error getting local prefix hash and size: ${error.message}`,
      });
    }

    try {
      const remotePrefixPath = path.join(config.nas.prefixes_path, 'initial', game.prefixLocation);
      console.log('Remote Prefix Path:', remotePrefixPath);

      const { hash: remotePrefixHash, sizeInBytes: remotePrefixSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remotePrefixPath);
      console.log('Remote Initial Prefix Hash:', remotePrefixHash);
      console.log('Remote Initial Prefix Size:', remotePrefixSizeInBytes);

      game.remotePrefixHash = remotePrefixHash;
      game.remotePrefixSizeInBytes = remotePrefixSizeInBytes;
    } catch (error) {
      console.error('Error getting remote initial prefix hash and size:', error);
      game.errors.push({
        message: `Error getting remote initial prefix hash and size: ${error.message}`,
      });
    }

    const remoteGamePath = path.join(config.nas.games_lib_path, game.nasLocation);
    console.log('Remote Game Path:', remoteGamePath);

    const { hash: remoteHash, sizeInBytes: remoteSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remoteGamePath);
    console.log('Remote Game Hash:', remoteHash);
    console.log('Remote Game Size:', remoteSizeInBytes);

    game.remoteHash = remoteHash;
    game.remoteSizeInBytes = remoteSizeInBytes;
  } catch (error) {
    console.error('Error getting remote directory hash and size:', error);
    game.errors.push({
      message: `Error getting remote directory hash and size: ${error.message}`,
    });
  }

  console.log(game);

  return game;
}

// function that takes in a directory path
// and returns an MD5 hash and size of the entire directory
// including all the nested files and folders,
// for consistency it sorts the files and folders
// before hashing them, the result is an MD5 hash
function getDirectoryHashAndSizeUsingNodeJs(dirPath) {
  const files = fs.readdirSync(dirPath, { recursive: true });

  const allHashes = [];
  let totalSizeInBytes = 0;

  // Loop through the files and folders
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      // If it's a file, read the file and update the hash
      const data = fs.readFileSync(filePath);
      const hash = crypto.createHash('md5').update(data).digest('hex');
      allHashes.push(hash);

      totalSizeInBytes += stat.size;
    }
  }

  allHashes.sort(); // Sort the hashes for consistency

  // Join the hashes with a newline and hash again for the final hash
  const hash = crypto
    .createHash('md5')
    .update(allHashes.join('\n') + '\n')
    .digest('hex');

  return { hash: hash, sizeInBytes: totalSizeInBytes };
}

async function getLocalDirectoryHashAndSize(dirPath) {
  try {
    return await getDirectoryHashAndSize(dirPath, execPromise);
  } catch (error) {
    console.error('Error getting local directory hash and size:', error);
    throw error; // Re-throw the error for upstream handling
  }
}

// function that takes in a directory path on a remote NAS server
// and returns an MD5 hash of the entire directory
// including all the nested files and folders,
// for consistency it sorts the files and folders
// before hashing them, the result is an MD5 hash
async function getRemoteDirectoryHashAndSize(config, remoteDirPath) {
  const ssh = new NodeSSH();

  try {
    console.log(`Connecting to ${config.nas.host}...`);
    await ssh.connect({
      host: config.nas.host,
      username: config.nas.user,
      privateKeyPath: config.nas.private_key_path,
    });

    console.log(`Connected. Getting details for folder: ${remoteDirPath}`);

    return await getDirectoryHashAndSize(remoteDirPath, ssh.execCommand.bind(ssh));
  } catch (error) {
    console.error('Error getting remote folder details:', error);
    throw error; // Re-throw the error for upstream handling
  } finally {
    if (ssh.connection) {
      console.log('Disconnecting SSH session.');
      ssh.dispose();
    }
  }
}

async function getDirectoryHashAndSize(dirPath, shellExecutor) {
  // note: shellExecutor is a function that takes a command string and returns a promise
  // node-ssh and exec are drop in replacements for each other
  try {
    // --- Command 1: Calculate Hash ---
    const hashCommand = makeDirectoryHashCommand(dirPath);

    // --- Command 2: Calculate Total Size ---
    const sizeCommand = makeDirectorySizeCommand(dirPath);

    // --- Execute Commands ---
    console.log(`Executing hash command...`);
    const hashResult = await shellExecutor(hashCommand);

    console.log(`Executing size command...`);
    const sizeResult = await shellExecutor(sizeCommand);

    console.log('Shell commands finished.');
    // console.log("Hash STDOUT:", hashResult.stdout); // Debugging
    // console.log("Hash STDERR:", hashResult.stderr); // Debugging
    // console.log("Size STDOUT:", sizeResult.stdout); // Debugging
    // console.log("Size STDERR:", sizeResult.stderr); // Debugging

    // --- Process Hash Result ---
    if (hashResult.stderr && !hashResult.stdout.trim()) {
      throw new Error(`Shell hash command error: ${hashResult.stderr}`);
    }
    if (!hashResult.stdout) {
      throw new Error(`Shell hash command produced no output. Check path and permissions: ${dirPath}. Stderr: ${hashResult.stderr}`);
    }

    const hash = hashResult.stdout.trim();
    if (!/^[a-f0-9]{32}$/.test(hash)) {
      throw new Error(`Received invalid output for hash (expected MD5 hash): "${hash}". Stderr: ${hashResult.stderr}`);
    }
    console.log(`Calculated folder MD5: ${hash}`);

    // --- Process Size Result ---
    if (sizeResult.stderr && !sizeResult.stdout.trim()) {
      // Allow stderr if stdout has the size (e.g., find might warn about permissions but still output sizes)
      console.warn(`Shell size command produced stderr: ${sizeResult.stderr}`);
      if (!sizeResult.stdout.trim()) {
        // If stdout is also empty, then it's an error
        throw new Error(`Shell size command error: ${sizeResult.stderr}`);
      }
    }

    if (!sizeResult.stdout && sizeResult.stdout !== '0') {
      // Allow "0" as valid output
      throw new Error(`Shell size command produced no output. Check path and permissions: ${dirPath}. Stderr: ${sizeResult.stderr}`);
    }

    const sizeOutput = sizeResult.stdout.trim();
    const totalSizeInBytes = parseInt(sizeOutput, 10);

    if (isNaN(totalSizeInBytes)) {
      throw new Error(`Received invalid output for size (expected number): "${sizeOutput}". Stderr: ${sizeResult.stderr}`);
    }
    console.log(`Calculated folder size: ${totalSizeInBytes} bytes`);

    // --- Return combined result ---
    return {
      hash: hash,
      sizeInBytes: totalSizeInBytes,
    };
  } catch (error) {
    console.error('Error getting folder details with shell:', error);
    throw error; // Re-throw the error for upstream handling
  }
}

function makeDirectoryHashCommand(dirPath) {
  const escapedDirPath = `'${dirPath.replace(/'/g, "'\\''")}'`; // Basic quoting for shell

  // find all the files and execute md5sum on each file
  // that generates an output of the form:
  // <hash> <filename>; c7826d06165bf4890ba638f23b066a6d  ./launch.json
  // we then strip the filename and sort the hashes
  // and finally calculate the md5sum of the sorted hashes
  // the final hash looks like this: f40911587f442d15cdaaa608209d778c  -
  // remove the trailing " -" and keep only the hash
  return `sh -c "cd ${escapedDirPath} && find . -type f -exec md5sum {} \\; | cut -d' ' -f1 | sort | md5sum | cut -d' ' -f1"`;
}

function makeDirectorySizeCommand(dirPath) {
  const escapedDirPath = `'${dirPath.replace(/'/g, "'\\''")}'`; // Basic quoting for shell

  // 1. cd into the target directory.
  // 2. find . -type f -printf '%s\\n': Find all files recursively, print their size in bytes followed by a newline.
  //    Using -printf '%s' gets the size directly.
  // 3. awk '{ total += $1 } END { if (NR==0) print 0; else print total }': Sum all the sizes read from stdin.
  //    Handles empty directories correctly by printing 0 if no files are found (NR==0).
  //    Note: $1 needs to be escaped as \$1 inside the double-quoted sh -c string.
  return `sh -c "cd ${escapedDirPath} && find . -type f -printf '%s\\n' | awk '{ total += \\$1 } END { if (NR==0) print 0; else print total }'"`;
}

async function uploadIcon(steamAppId, filePath) {
  try {
    const image = await Jimp.read(filePath);
    // we need to convert image to a 256x256 JPG
    const resizedImage = await image.resize({ w: 256 }).getBuffer('image/jpeg');
    console.log('Resized image buffer:', resizedImage.length);

    const uploadResult = await db_uploadIcon(steamAppId, resizedImage);

    if (!uploadResult) {
      console.log('Failed to upload icon to the database');
      return {
        success: false,
        message: 'Failed to upload icon to the database',
      };
    }

    return {
      success: true,
      message: 'Icon uploaded successfully',
      icon: resizedImage.toString('base64'), // Convert the buffer to a base64 string
    };
  } catch (error) {
    console.error('Error uploading icon:', error);
    return {
      success: false,
      message: 'Failed to upload icon: ' + error.message,
    };
  }
}

async function saveGameItem(steamAppId, gameItem) {
  console.log('Saving game item:', steamAppId, gameItem);

  try {
    const validationErrors = validateGameItem(gameItem);
    if (validationErrors.length) {
      return {
        success: false,
        message: 'Validation errors',
        errors: validationErrors,
      };
    }

    let result = {};

    // todo: extract into a separate function
    if (gameItem.source === 'steam') {
      // run some validations
      if (gameItem.icon) {
        // try to use the steam icon when the record is created for the first time
        const iconBuffer = Buffer.from(gameItem.icon, 'base64');
        const image = await Jimp.fromBuffer(iconBuffer);

        // we need to convert image to a 256x256 JPG
        const resizedImage = await image.resize({ w: 256 }).getBuffer('image/jpeg');
        gameItem.icon = resizedImage;
      }

      // we also need to calculate the local hash and size based on the given path
      // if it's not possible (wrong local path is given) then we cannot create
      // the game in the DB -- we need a hash/size baseline
      // and if the game is being created from a Steam game instance
      // that means the game exists and should be possible to calculate
      // the hash/size pair
      try {
        const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(gameItem.realLocalGamePath);
        gameItem.hash = localHash;
        gameItem.sizeInBytes = localSizeInBytes;

        // get hash and size for the local prefix, which will be the initial prefix
        // initial prefix won't change once created, every Steam account will
        // use that as a baseline or their own ones if existed
        // ...
        // prefix might be optional for PS2/PS3 and some other games/launchers
        const config = getConfig();
        const prefixesBasePath = config.client.prefixes_path;
        const prefixPath = path.join(prefixesBasePath, gameItem.prefixLocation);
        console.log('prefixesPath: ' + prefixPath);

        const { hash: prefixHash, sizeInBytes: prefixSizeInBytes } = await getLocalDirectoryHashAndSize(prefixPath);
        gameItem.prefixHash = prefixHash;
        gameItem.sizeInBytes = prefixSizeInBytes;
      } catch (error) {
        console.log('Failed to create and save game item to the database: getLocalDirectoryHashAndSize');
        return {
          success: false,
          message: 'Failed to create game item; getLocalDirectoryHashAndSize error: ' + error,
        };
      }

      result = await db_createGameItemFromSteamData(steamAppId, gameItem);
    } else {
      // do not upload/update the icon here
      // icon changes are done separately for created records
      result = await db_updateGameItem(steamAppId, gameItem);
    }

    if (!result) {
      console.log('Failed to save game item to the database');
      return {
        success: false,
        message: 'Failed to save game item to the database',
      };
    }

    // after game is saved we need to refresh all the data for it
    // and recalculate hash/size
    console.log('SAVED GAME RESULT: ' + result);
    const game = await adjustedGameWithLocalAndRemoteDetails(result);

    return {
      success: true,
      message: 'Game item saved successfully',
      gameItem: game,
    };
  } catch (error) {
    console.error('Error saving game item:', error);
    return {
      success: false,
      message: 'Failed to save game item: ' + error,
    };
  }
}

function validateGameItem(gameItem) {
  const errors = [];

  if (!gameItem.steamTitle || !gameItem.steamTitle.trim()) {
    console.log('validateGameItem: steamTitle is empty');
    errors.push(`Empty field: steamTitle ("${gameItem.steamTitle}")`);
  }

  if (!gameItem.steamExeTarget || !gameItem.steamExeTarget.trim()) {
    console.log('validateGameItem: steamExeTarget is empty');
    errors.push(`Empty field: steamExeTarget ("${gameItem.steamExeTarget}")`);
  }

  if (!gameItem.steamStartDir || !gameItem.steamStartDir.trim()) {
    console.log('validateGameItem: steamStartDir is empty');
    errors.push(`Empty field: steamStartDir ("${gameItem.steamStartDir}")`);
  }

  if (!gameItem.launcher || !gameItem.launcher.trim()) {
    console.log('validateGameItem: launcher is empty');
    errors.push(`Empty field: launcher ("${gameItem.launcher}")`);
  }

  if (!gameItem.nasLocation || !gameItem.nasLocation.trim()) {
    console.log('validateGameItem: nasLocation is empty');
    errors.push(`Empty field: nasLocation ("${gameItem.nasLocation}")`);
  }

  if (!gameItem.clientLocation || !gameItem.clientLocation.trim()) {
    console.log('validateGameItem: clientLocation is empty');
    errors.push(`Empty field: clientLocation ("${gameItem.clientLocation}")`);
  }

  if (!gameItem.prefixLocation || !gameItem.prefixLocation.trim()) {
    console.log('validateGameItem: prefixLocation is empty');
    errors.push(`Empty field: prefixLocation ("${gameItem.prefixLocation}")`);
  }

  if (gameItem.source === 'db') {
    return errors;
  }

  // these validations are steam specific
  if (!gameItem.realLocalGamePath || !gameItem.realLocalGamePath.trim()) {
    console.log('validateGameItem: realLocalGamePath is empty');
    errors.push(`Empty field: realLocalGamePath ("${gameItem.realLocalGamePath}")`);
  }

  if (!fs.existsSync(gameItem.realLocalGamePath)) {
    console.log('validateGameItem: game not found at this location: ' + gameItem.realLocalGamePath);
    errors.push(`Game not found at the following location: ${gameItem.realLocalGamePath}`);
  }

  return errors;
}

export { getGames, uploadIcon, saveGameItem };
