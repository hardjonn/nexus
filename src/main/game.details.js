import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'node:path';
const { exec } = require('child_process');
import { promisify } from 'util';
const execPromise = promisify(exec);
const { NodeSSH } = require('node-ssh');

import { getConfig } from './conf';

// const drivelist = require('drivelist');
// const nodeDiskInfo = require('node-disk-info');

async function adjustedGameWithLocalAndRemoteDetails(game) {
  // if the game is sourced from steam, it doesn't have
  // the clientLocation and nasLocation
  // so we need to skip it
  if (game.source === 'steam') {
    // console.log('Skipping game from steam:', game);
    return game;
  }

  const errors = [];
  const config = getConfig();

  game.realLocalGamePath = getRealLocalGamePath(game.gameLocation);
  game.realLocalPrefixPath = getRealLocalPrefixPath(game.prefixLocation);

  console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Local game path:', game.realLocalGamePath);

  try {
    const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(game.realLocalGamePath);

    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Local Game Hash:', localHash);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Local Game Size:', localSizeInBytes);

    game.localGameHash = localHash;
    game.localGameSizeInBytes = localSizeInBytes;
  } catch (error) {
    console.error('game.details::adjustedGameWithLocalAndRemoteDetails: Error getting local directory hash and size:', error);
    game.localGameHash = null;
    game.localGameSizeInBytes = 0;
    errors.push(`Error getting local directory hash and size: ${error.message}`);
  }

  try {
    const remoteGamePath = path.join(config.remote_lib.games_path, game.gameLocation);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Game Path:', remoteGamePath);

    const { hash: remoteHash, sizeInBytes: remoteSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remoteGamePath);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Game Hash:', remoteHash);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Game Size:', remoteSizeInBytes);

    game.remoteGameHash = remoteHash;
    game.remoteGameSizeInBytes = remoteSizeInBytes;
  } catch (error) {
    console.error('game.details::adjustedGameWithLocalAndRemoteDetails: Error getting remote directory hash and size:', error);
    game.remoteGameHash = null;
    game.remoteGameSizeInBytes = 0;
    errors.push(`Error getting remote directory hash and size: ${error.message}`);
  }

  // skip the prefix evaluation if the prefix is not specified
  // not all games are having prefixes, for example PS2/PS3 games
  // (and other simulators) do not have any prefix locations
  if (!game.prefixLocation) {
    return {
      gameItem: game,
      errors: errors,
    };
  }

  try {
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Local Prefix Path:', game.realLocalPrefixPath);

    const { hash: localPrefixHash, sizeInBytes: localPrefixSizeInBytes } = await getLocalDirectoryHashAndSize(game.realLocalPrefixPath);
    game.localPrefixHash = localPrefixHash;
    game.localPrefixSizeInBytes = localPrefixSizeInBytes;
  } catch (error) {
    console.error('game.details::adjustedGameWithLocalAndRemoteDetails: Error getting local prefix hash and size:', error);
    game.localPrefixHash = null;
    game.localPrefixSizeInBytes = 0;
    errors.push(`Error getting local prefix hash and size: ${error.message}`);
  }

  try {
    const remotePrefixPath = path.join(config.remote_lib.prefixes_path, 'initial', game.prefixLocation);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Prefix Path:', remotePrefixPath);

    const { hash: remotePrefixHash, sizeInBytes: remotePrefixSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remotePrefixPath);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Initial Prefix Hash:', remotePrefixHash);
    console.log('game.details::adjustedGameWithLocalAndRemoteDetails: Remote Initial Prefix Size:', remotePrefixSizeInBytes);

    game.remotePrefixHash = remotePrefixHash;
    game.remotePrefixSizeInBytes = remotePrefixSizeInBytes;
  } catch (error) {
    console.error('game.details::adjustedGameWithLocalAndRemoteDetails: Error getting remote initial prefix hash and size:', error);
    game.remotePrefixHash = null;
    game.remotePrefixSizeInBytes = 0;
    errors.push(`Error getting remote initial prefix hash and size: ${error.message}`);
  }

  return {
    gameItem: game,
    errors: errors,
  };
}

async function getLocalDirectoryHashAndSize(dirPath) {
  if (!dirPath) {
    console.error('game.details::getLocalDirectoryHashAndSize: Directory path is not specified');
    throw new Error('Directory path is not specified');
  }

  if (!fs.existsSync(dirPath)) {
    console.error('game.details::getLocalDirectoryHashAndSize: Directory does not exist:', dirPath);
    throw new Error('Directory does not exist: ' + dirPath);
  }

  try {
    return await getDirectoryHashAndSize(dirPath, execPromise);
  } catch (error) {
    console.error('game.details::getLocalDirectoryHashAndSize: Error getting local directory hash and size:', error);
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
    console.log(`game.details::getRemoteDirectoryHashAndSize: Connecting to ${config.remote_lib.host}...`);
    await ssh.connect({
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
    });

    console.log(`game.details::getRemoteDirectoryHashAndSize: Connected. Getting details for folder: ${remoteDirPath}`);

    return await getDirectoryHashAndSize(remoteDirPath, ssh.execCommand.bind(ssh));
  } catch (error) {
    console.error('game.details::getRemoteDirectoryHashAndSize: Error getting remote folder details:', error);
    throw error; // Re-throw the error for upstream handling
  } finally {
    if (ssh.connection) {
      console.log('game.details::getRemoteDirectoryHashAndSize: Disconnecting SSH session.');
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
    console.log(`game.details::getDirectoryHashAndSize: Executing hash command...`);
    const hashResult = await shellExecutor(hashCommand);

    console.log(`game.details::getDirectoryHashAndSize: Executing size command...`);
    const sizeResult = await shellExecutor(sizeCommand);

    console.log(`game.details::getDirectoryHashAndSize: Shell commands finished.`);
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
    console.log(`game.details::getDirectoryHashAndSize: Calculated folder MD5: ${hash}`);

    // --- Process Size Result ---
    if (sizeResult.stderr && !sizeResult.stdout.trim()) {
      // Allow stderr if stdout has the size (e.g., find might warn about permissions but still output sizes)
      console.warn(`game.details::getDirectoryHashAndSize: Shell size command produced stderr: ${sizeResult.stderr}`);
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
    console.log(`game.details::getDirectoryHashAndSize: Calculated folder size: ${totalSizeInBytes} bytes`);

    // --- Return combined result ---
    return {
      hash: hash,
      sizeInBytes: totalSizeInBytes,
    };
  } catch (error) {
    console.error('game.details::getDirectoryHashAndSize: Error getting folder details with shell:', error);
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

function getGameAndPrefixPath(gameItem) {
  const config = getConfig();

  const localGamePath = gameItem.realLocalGamePath;
  const remoteGamePath = path.join(config.remote_lib.games_path, gameItem.gameLocation);

  const localPrefixPath = gameItem.realLocalPrefixPath;
  const remotePrefixPath = gameItem.prefixLocation ? path.join(config.remote_lib.prefixes_path, config.remote_lib.initial_prefixes, gameItem.prefixLocation) : null;

  return {
    localGamePath: localGamePath,
    remoteGamePath: remoteGamePath,
    localPrefixPath: localPrefixPath,
    remotePrefixPath: remotePrefixPath,
  };
}

function getRealLocalGamePath(gameLocation) {
  const config = getConfig();

  if (!gameLocation) {
    console.error('game.item::getRealLocalGamePath: Game location is not specified');
    return null;
  }

  if (!config.local_lib.games_path.trim()) {
    console.error('game.item::getRealLocalGamePath: Games lib path client config is not specified');
    return null;
  }

  try {
    // get the list of all available/configured game libs locations
    // they are being stored in the following format
    // /path/to/game/lib;/another/path/to/game/lib;/and/so/on
    const gamesLibPathList = config.local_lib.games_path.split(';');

    for (const gamesLibPath of gamesLibPathList) {
      const localGamePath = path.join(gamesLibPath, gameLocation);
      console.log('game.item::getRealLocalGamePath: Local Game Path:', localGamePath);

      if (fs.existsSync(localGamePath)) {
        return localGamePath;
      }

      console.log('game.item::getRealLocalGamePath: Game not found at the following location: ' + localGamePath);
    }
  } catch (error) {
    console.error('game.item::getRealLocalGamePath: Error getting local game path:', error);
  }

  return null;
}

function getRealLocalPrefixPath(prefixLocation) {
  const config = getConfig();

  if (!prefixLocation) {
    console.error('game.item::getRealLocalPrefixPath: Prefix location is not specified');
    return null;
  }

  if (!config.local_lib.prefixes_path.trim()) {
    console.error('game.item::getRealLocalPrefixPath: Prefixes lib path client config is not specified');
    return null;
  }

  try {
    const localPrefixPath = path.join(config.local_lib.prefixes_path, prefixLocation);

    if (!fs.existsSync(localPrefixPath)) {
      console.log('game.item::getRealLocalPrefixPath: Prefix not found at the following location: ' + localPrefixPath);
      return null;
    }

    console.log('game.item::getRealLocalPrefixPath: Local Prefix Path:', localPrefixPath);

    return localPrefixPath;
  } catch (error) {
    console.error('game.item::getRealLocalPrefixPath: Error getting local prefix path:', error);
    return null;
  }
}

export { adjustedGameWithLocalAndRemoteDetails, getGameAndPrefixPath, getLocalDirectoryHashAndSize, getRemoteDirectoryHashAndSize, getRealLocalGamePath, getRealLocalPrefixPath };
