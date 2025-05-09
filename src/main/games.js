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

import { db_getAllGamesMap, db_uploadIcon, db_updateGameItem, db_createGameItemFromSteamData, db_updateGameState } from './game.queries';
import { steam_getAllGamesMap } from './steam';
import { getConfig } from './conf';
import { uploadWithRsync, abortRsyncTransferByItemId } from './transfer';

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
    const game = await augmentGameWithRealLocalGamePath(mergedGamesMap[key]);
    gamesMap[game.steamAppId] = game;
  }

  //  console.log('Games Map:', gamesMap);

  return Object.values(gamesMap).slice(0, 5);
}

async function augmentGameWithRealLocalGamePath(game) {
  const config = getConfig();

  // if the game is sourced from steam, it doesn't have
  // the clientLocation and nasLocation
  // so we need to skip it
  if (game.source === 'steam') {
    // console.log('Skipping game from steam:', game);
    return game;
  }

  game.errors = [];

  if (!config.client.games_lib_path.trim()) {
    console.error('Games lib path client config is not specified');
    game.errors.push({
      message: 'Games lib path client config is not specified',
    });
    return game;
  }

  // get the list of all available/configured game libs locations
  // they are being stored in the following format
  // /path/to/game/lib;/another/path/to/game/lib;/and/so/on
  const gameLibPathList = config.client.games_lib_path.split(';');

  for (const localGamesLibPath of gameLibPathList) {
    const localGamePath = path.join(localGamesLibPath, game.clientLocation);
    console.log('Local Game Path:', localGamePath);

    if (!fs.existsSync(localGamePath)) {
      console.log('Game not found at the following location: ' + localGamePath);
      continue; // Skip to the next disk if the path doesn't exist
    }

    console.log('Found local game path:', localGamePath);

    game.realLocalGamePath = localGamePath;
    break;
  }

  if (!game.prefixLocation) {
    return game;
  }

  const localPrefixPath = path.join(config.client.prefixes_path, game.prefixLocation);
  console.log('Local Prefix Path:', localPrefixPath);

  if (!fs.existsSync(localPrefixPath)) {
    return game;
  }

  game.realLocalPrefixPath = localPrefixPath;

  return game;
}

async function calculateHashAndSize(steamAppId, gameItem) {
  gameItem = await adjustedGameWithLocalAndRemoteDetails(gameItem);

  return {
    success: true,
    gameItem: gameItem,
  };
}

async function adjustedGameWithLocalAndRemoteDetails(game) {
  // if the game is sourced from steam, it doesn't have
  // the clientLocation and nasLocation
  // so we need to skip it
  if (game.source === 'steam') {
    // console.log('Skipping game from steam:', game);
    return game;
  }

  game.errors = [];

  const config = getConfig();

  console.log('Local game path:', game.realLocalGamePath);

  try {
    const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(game.realLocalGamePath);

    console.log('Local Game Hash:', localHash);
    console.log('Local Game Size:', localSizeInBytes);

    game.localHash = localHash;
    game.localSizeInBytes = localSizeInBytes;
  } catch (error) {
    console.error('Error getting local directory hash and size:', error);
    game.errors.push({
      message: `Error getting local directory hash and size: ${error.message}`,
    });
  }

  try {
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

  // skip the prefix evaluation if the prefix is not specified
  // not all games are having prefixes, for example PS2/PS3 games
  // (and other simulators) do not have any prefix locations
  if (!game.prefixLocation) {
    return game;
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

      // do not calculate and store hash/size for steam games here
      // we do it when the game is uploaded to the remote

      // we also need to calculate the local hash and size based on the given path
      // if it's not possible (wrong local path is given) then we cannot create
      // the game in the DB -- we need a hash/size baseline
      // and if the game is being created from a Steam game instance
      // that means the game exists and should be possible to calculate
      // the hash/size pair
      // try {
      //   const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(gameItem.realLocalGamePath);
      //   console.log('==============localHash: ' + localHash);
      //   console.log('==============localSizeInBytes: ' + localSizeInBytes);
      //   gameItem.hash = localHash;
      //   gameItem.sizeInBytes = localSizeInBytes;

      //   // get hash and size for the local prefix, which will be the initial prefix
      //   // initial prefix won't change once created, every Steam account will
      //   // use that as a baseline or their own ones if existed
      //   // ...
      //   // prefix might be optional for PS2/PS3 and some other games/launchers

      //   if (gameItem.launcher === 'PORT_PROTON') {
      //     const config = getConfig();
      //     const prefixesBasePath = config.client.prefixes_path;
      //     const prefixPath = path.join(prefixesBasePath, gameItem.prefixLocation);
      //     console.log('prefixesPath: ' + prefixPath);

      //     const { hash: prefixHash, sizeInBytes: prefixSizeInBytes } = await getLocalDirectoryHashAndSize(prefixPath);
      //     console.log('==============prefixHash: ' + prefixHash);
      //     console.log('==============prefixSizeInBytes: ' + prefixSizeInBytes);
      //     gameItem.prefixHash = prefixHash;
      //     gameItem.prefixSizeInBytes = prefixSizeInBytes;
      //   }
      // } catch (error) {
      //   console.log('Failed to create and save game item to the database: getLocalDirectoryHashAndSize');
      //   return {
      //     success: false,
      //     message: 'Failed to create game item; getLocalDirectoryHashAndSize error: ' + error,
      //   };
      // }

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

  if (gameItem.launcher === 'PORT_PROTON' && (!gameItem.prefixLocation || !gameItem.prefixLocation.trim())) {
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

async function abortRsyncTransfer(itemId) {
  console.log('abortRsyncTransfer', itemId);

  return await abortRsyncTransferByItemId(itemId);
}

// the idea it that the game item is uploaded only once in the beginning
// when it's created we also upload the initial prefix if needed (for PORT_PROTON)
// after that the prefix is frozen and cannot be changed
// unless it'e enforced by the user
// the game is available for upload only when it's in DRAFT/UPDATING state
async function uploadGameToRemote(steamAppId, gameItem, progressCallback) {
  // run some validations
  if (gameItem.source !== 'db' || (gameItem.status !== 'DRAFT' && gameItem.status !== 'UPLOADING')) {
    console.log('Game is not in DRAFT state');
    return {
      success: false,
      message: 'Game is not in DRAFT state',
    };
  }

  // 0. update the game state to uploading
  try {
    await db_updateGameState(steamAppId, 'UPLOADING');
  } catch (error) {
    console.error('Error updating game state to uploading:', error);
    return {
      success: false,
      message: 'Failed to update game state to uploading: ' + error,
    };
  }

  if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixLocation) {
    console.log('Prefix location is empty');
    return {
      success: false,
      message: 'Prefix location is empty',
    };
  }

  const config = getConfig();
  const localGamePath = gameItem.realLocalGamePath;
  const remoteGamePath = path.join(config.nas.games_lib_path, gameItem.nasLocation);
  const localPrefixPath = gameItem.prefixLocation ? path.join(config.client.prefixes_path, gameItem.prefixLocation) : null;
  const remotePrefixPath = gameItem.prefixLocation ? path.join(config.nas.prefixes_path, 'initial', gameItem.prefixLocation) : null;

  console.log('remoteGamePath: ' + remoteGamePath);
  console.log('localGamePath: ' + localGamePath);

  try {
    // 1. upload the game to the remote
    await uploadWithRsync({
      abortId: steamAppId,
      sourcePath: localGamePath,
      destinationPath: remoteGamePath,
      host: config.nas.host,
      username: config.nas.user,
      privateKeyPath: config.nas.private_key_path,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    console.log('Upload completed successfully!');
  } catch (error) {
    console.error('Upload failed:', error);

    return {
      success: false,
      message: 'Failed to upload game to remote: ' + error,
    };
  }

  try {
    // 2. upload the prefix if needed
    //  - the launcher has to be PORT_PROTON
    //  - the remote initial prefix has to be empty - record in the DB should not exist
    if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixHash && localPrefixPath && remotePrefixPath) {
      console.log('localPrefixPath: ' + localPrefixPath);
      console.log('remotePrefixPath: ' + remotePrefixPath);

      await uploadWithRsync({
        sourcePath: localPrefixPath,
        destinationPath: remotePrefixPath,
        host: config.nas.host,
        username: config.nas.user,
        privateKeyPath: config.nas.private_key_path,
        onProgress: (output) => {
          const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, steamAppId);
          progressCallback(augmentedWithSteamAppIdOutput);
        },
      });

      console.log('Upload prefix completed successfully!');
    }
  } catch (error) {
    console.error('Upload prefix failed:', error);

    return {
      success: false,
      message: 'Failed to upload prefix to remote: ' + error,
    };
  }

  // 3. calculate the hash and size for the remote and local
  try {
    const { hash: localGameHash, sizeInBytes: localGameSizeInBytes } = await getLocalDirectoryHashAndSize(localGamePath);
    console.log('==============localGameHash: ' + localGameHash);
    console.log('==============localGameSizeInBytes: ' + localGameSizeInBytes);

    const { hash: remoteGameHash, sizeInBytes: remoteGameSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remoteGamePath);
    console.log('==============remoteGameHash: ' + remoteGameHash);
    console.log('==============remoteGameSizeInBytes: ' + remoteGameSizeInBytes);

    // we need to make sure the local game size and hash match the remote
    if (localGameHash !== remoteGameHash || localGameSizeInBytes !== remoteGameSizeInBytes) {
      console.log('Local game size and hash do not match remote');
      return {
        success: false,
        message: 'Local game size and hash do not match remote',
      };
    }

    gameItem.hash = localGameHash;
    gameItem.sizeInBytes = localGameSizeInBytes;

    // the prefix check should be done only on the initial upload
    if (gameItem.launcher === 'PORT_PROTON' && !gameItem.prefixHash) {
      const { hash: localPrefixHash, sizeInBytes: localPrefixSizeInBytes } = await getLocalDirectoryHashAndSize(localPrefixPath);
      console.log('==============localPrefixHash: ' + localPrefixHash);
      console.log('==============localPrefixSizeInBytes: ' + localPrefixSizeInBytes);

      const { hash: remotePrefixHash, sizeInBytes: remotePrefixSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remotePrefixPath);
      console.log('==============remotePrefixHash: ' + remotePrefixHash);
      console.log('==============remotePrefixSizeInBytes: ' + remotePrefixSizeInBytes);

      // we need to make sure the local prefix size and hash match the remote
      if (localPrefixHash !== remotePrefixHash || localPrefixSizeInBytes !== remotePrefixSizeInBytes) {
        console.log('Local prefix size and hash do not match remote');
        return {
          success: false,
          message: 'Local prefix size and hash do not match remote',
        };
      }

      gameItem.prefixHash = localPrefixHash;
      gameItem.prefixSizeInBytes = localPrefixSizeInBytes;
    }
  } catch (error) {
    console.error('Error calculating hash and size:', error);
    return {
      success: false,
      message: 'Failed to calculate hash and size: ' + error,
    };
  }

  // 4. update the game item in the DB
  try {
    console.log('Updating game item in the DB...');
    gameItem.status = 'ACTIVE';

    const result = await db_updateGameItem(steamAppId, gameItem);
    let game = await augmentGameWithRealLocalGamePath(result);
    game = await adjustedGameWithLocalAndRemoteDetails(game);

    return {
      success: true,
      message: 'Game item saved successfully',
      gameItem: game,
    };
  } catch (error) {
    console.error('Error updating game item:', error);
    return {
      success: false,
      message: 'Failed to update game item: ' + error,
    };
  }
}

function augmentOutputWithProgressId(output, steamAppId) {
  output.progressId = `steamAppId-${steamAppId}`;

  return output;
}

export { getGames, uploadIcon, saveGameItem, uploadGameToRemote, abortRsyncTransfer, calculateHashAndSize };
