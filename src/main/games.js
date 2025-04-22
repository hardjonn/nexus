import path from 'node:path';
import fs from 'fs-extra';
import crypto from 'crypto';
const { exec } = require('child_process');
import { promisify } from 'util';
const execPromise = promisify(exec);
const { NodeSSH } = require('node-ssh');

import { db_getAllGamesMap } from './game.queries';
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
  const config = getConfig();
  const gamesMap = {};

  // step 1: get all the records from the database
  const gamesFromDbMap = await db_getAllGamesMap();

  // step 2: get all the records from steam
  const gamesFromSteamMap = await steam_getAllGamesMap();

  // step 3: go over the games from the database
  // and try to find a match in the steam games
  // calculate the hash and size for both local and remote
  for (const key in gamesFromDbMap) {
    const dbGame = gamesFromDbMap[key];
    const steamGame = gamesFromSteamMap[key];

    const game = {
      steamAppId: dbGame['steam_app_id'],
      steamTitle: dbGame['steam_title'],
      steamExeTarget: dbGame['steam_exe_target'],
      steamStartDir: dbGame['steam_start_dir'],
      steamLaunchArgs: dbGame['steam_launch_args'],
      clientLocation: dbGame['client_location'],
      nasLocation: dbGame['nas_location'],
      prefixLocation: dbGame['prefix_location'],
      launcher: dbGame['launcher'],
      hash: dbGame['hash_md5'],
      sizeInBytes: dbGame['size_in_bytes'],
      localHash: null,
      localSizeInBytes: 0,
      remoteHash: null,
      remoteSizeInBytes: 0,
    };

    console.log('DB Game:', dbGame);
    console.log('Steam Game:', steamGame);

    // get the local hash and size
    try {
      const localGamePath = path.join(config.client.games_lib_path, game.clientLocation);
      console.log('Local Game Path:', localGamePath);

      const { hash: localHash, sizeInBytes: localSizeInBytes } = await getLocalDirectoryHashAndSize(localGamePath);
      console.log('Local Game Hash:', localHash);
      console.log('Local Game Size:', localSizeInBytes);

      game.localHash = localHash;
      game.localSizeInBytes = localSizeInBytes;

      const remoteGamePath = path.join(config.nas.games_lib_path, game.nasLocation);
      console.log('Remote Game Path:', remoteGamePath);

      const { hash: remoteHash, sizeInBytes: remoteSizeInBytes } = await getRemoteDirectoryHashAndSize(config, remoteGamePath);
      console.log('Remote Game Hash:', remoteHash);
      console.log('Remote Game Size:', remoteSizeInBytes);

      game.remoteHash = remoteHash;
      game.remoteSizeInBytes = remoteSizeInBytes;

      gamesMap[game.steamAppId] = game;
    } catch (error) {
      console.error('Error getting directory hash and size:', error);
    }

    // get the remote hash and size
    // const { hash, sizeInBytes } = getDirectoryHashAndSize(game.remotePath);
    // game.remoteHash = hash;
    // game.remoteSizeInBytes = sizeInBytes;

    // games.push(game);
  }

  console.log('Games Map:', gamesMap);

  return gamesMap;
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

export { getGames };
