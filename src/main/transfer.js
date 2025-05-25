import path from 'path';
import fs from 'fs-extra';

const { spawn } = require('child_process');
const { NodeSSH } = require('node-ssh');
const AbortController = require('abort-controller');

const abortControllers = new Map();

async function abortRsyncTransferByItemId(itemId) {
  try {
    const controller = abortControllers.get(itemId);
    if (controller) {
      controller.abort();
      abortControllers.delete(itemId);
    }

    return {
      status: 'success',
    };
  } catch (error) {
    console.error('transfer::abortRsyncTransferByItemId: Error aborting rsync transfer:', error);

    return {
      status: 'error',
      error: {
        message: 'Failed to abort rsync transfer: ' + error,
      },
    };
  }
}

/**
 * Uploads a local directory to a remote host using rsync over SSH with a private key.
 * @param {Object} options
 * @param {string} options.sourcePath - Path to the local directory.
 * @param {string} options.destinationPath - Destination path on remote host.
 * @param {string} options.username - Remote SSH username.
 * @param {string} options.host - Remote host (IP or domain).
 * @param {string} [options.privateKeyPath] - Path to the private SSH key.
 * @param {function(string, number): void} [options.onProgress] - Optional callback for progress updates with percentage.
 * @returns {Promise<void>}
 */
async function uploadWithRsync({ abortId, sourcePath, destinationPath, host, username, privateKeyPath, onProgress }) {
  // first try to create the remote directory
  // if it fails, reject the promise
  // if it succeeds, continue
  // without the remote directory rsync will fail
  try {
    console.log('transfer::uploadWithRsync: Making remote folder: ', destinationPath);
    await makeDirectoryOnRemote(host, username, privateKeyPath, destinationPath);
  } catch (error) {
    console.error('transfer::uploadWithRsync: Error making remote folder:', error);
    throw error;
  }

  return new Promise((resolve, reject) => {
    const remotePath = `${username}@${host}:${destinationPath}`;

    const sourcePathWithTrailingSlash = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
    const destinationPathWithTrailingSlash = remotePath.endsWith('/') ? remotePath : remotePath + '/';

    console.log('transfer::uploadWithRsync: Destination path: ' + destinationPathWithTrailingSlash);
    console.log('transfer::uploadWithRsync: Source path: ' + sourcePathWithTrailingSlash);

    const sshCommand = [
      'ssh',
      '-t',
      '-i',
      privateKeyPath,
      '-o',
      'LogLevel=QUIET',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'PasswordAuthentication=no',
      '-o',
      'ServerAliveInterval=10',
    ].join(' ');

    const rsyncArguments = ['-avzh', '--info=progress2', '--safe-links', '-e', sshCommand, sourcePathWithTrailingSlash, destinationPathWithTrailingSlash];

    const controller = new AbortController();
    abortControllers.set(abortId, controller);
    const { signal } = controller;

    const rsync = spawn('rsync', rsyncArguments, { signal });

    rsync.stdout.on('data', (data) => {
      const processedOutput = processedRsyncOutput(data.toString());
      if (onProgress) onProgress(processedOutput);
    });

    rsync.stderr.on('data', (data) => {
      const processedOutput = processedRsyncOutput(data.toString());
      if (onProgress) onProgress(processedOutput);
    });

    rsync.on('close', (code) => {
      abortControllers.delete(abortId);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rsync exited with code ${code}`));
      }
    });

    rsync.on('error', (err) => {
      reject(err);
    });

    // add support for cancellation/aborting the upload
  });
}

function processedRsyncOutput(output) {
  const columns = output.split(' ');

  if (columns.length === 0) {
    return {
      rawOutput: output,
      transferred: null,
      percentage: null,
      speed: null,
    };
  }

  let nonEmptyColumns = columns.filter((column) => column.trim() !== '');

  if (nonEmptyColumns.length < 3 || !nonEmptyColumns[1].endsWith('%')) {
    return {
      rawOutput: output,
      transferred: null,
      percentage: null,
      speed: null,
    };
  }

  const transferred = nonEmptyColumns[0];
  const percentage = nonEmptyColumns[1];
  const speed = nonEmptyColumns[2];

  return {
    rawOutput: output,
    transferred: transferred,
    percentage: percentage,
    speed: speed,
  };
}

/**
 * Downloads a remote directory to a local host using rsync over SSH with a private key.
 * @param {Object} options
 * @param {string} options.sourcePath - Path to the remote directory.
 * @param {string} options.destinationPath - Destination path on local host.
 * @param {string} options.username - Remote SSH username.
 * @param {string} options.host - Remote host (IP or domain).
 * @param {string} [options.privateKeyPath] - Path to the private SSH key.
 * @param {function(string, number): void} [options.onProgress] - Optional callback for progress updates with percentage.
 * @returns {Promise<void>}
 */
async function downloadWithRsync({ abortId, sourcePath, destinationPath, host, username, privateKeyPath, onProgress }) {
  // source path is the remote path
  // destination path is the local path

  try {
    console.log('transfer::downloadWithRsync: Making local folder: ', destinationPath);
    await makeDirectoryOnLocal(destinationPath);
  } catch (error) {
    console.error('transfer::downloadWithRsync: Error making local folder:', error);
    throw error;
  }

  return new Promise((resolve, reject) => {
    const remotePath = `${username}@${host}:${sourcePath}`;

    const remotePathWithTrailingSlash = remotePath.endsWith('/') ? remotePath : remotePath + '/';
    const localPathWithTrailingSlash = destinationPath.endsWith('/') ? destinationPath : destinationPath + '/';

    console.log('transfer::downloadWithRsync: Destination path: ' + localPathWithTrailingSlash);
    console.log('transfer::downloadWithRsync: Source path: ' + remotePathWithTrailingSlash);

    const sshCommand = [
      'ssh',
      '-t',
      '-i',
      privateKeyPath,
      '-o',
      'LogLevel=QUIET',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'PasswordAuthentication=no',
      '-o',
      'ServerAliveInterval=10',
    ].join(' ');

    const rsyncArguments = ['-avzh', '--info=progress2', '--safe-links', '-e', sshCommand, remotePathWithTrailingSlash, localPathWithTrailingSlash];

    const controller = new AbortController();
    abortControllers.set(abortId, controller);
    const { signal } = controller;

    const rsync = spawn('rsync', rsyncArguments, { signal });

    rsync.stdout.on('data', (data) => {
      const processedOutput = processedRsyncOutput(data.toString());
      if (onProgress) onProgress(processedOutput);
    });

    rsync.stderr.on('data', (data) => {
      const processedOutput = processedRsyncOutput(data.toString());
      if (onProgress) onProgress(processedOutput);
    });

    rsync.on('close', (code) => {
      abortControllers.delete(abortId);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rsync exited with code ${code}`));
      }
    });

    rsync.on('error', (err) => {
      reject(err);
    });

    // add support for cancellation/aborting the upload
  });
}

async function makeDirectoryOnRemote(host, username, privateKeyPath, remoteDirPath) {
  const ssh = new NodeSSH();

  try {
    console.log(`transfer::makeDirectoryOnRemote: Connecting to ${host}...`);
    await ssh.connect({
      host: host,
      username: username,
      privateKeyPath: privateKeyPath,
    });

    const escapedDirPath = `'${remoteDirPath.replace(/'/g, "'\\''")}'`; // Basic quoting for shell

    const mkDirCommand = `sh -c "mkdir -p ${escapedDirPath}"`;

    console.log('transfer::makeDirectoryOnRemote: MKDIR Command:', mkDirCommand);

    await ssh.execCommand(mkDirCommand);
  } catch (error) {
    console.error('transfer::makeDirectoryOnRemote: Error making remote folder:', error);
    throw error; // Re-throw the error for upstream handling
  } finally {
    if (ssh.connection) {
      console.log('transfer::makeDirectoryOnRemote: Disconnecting SSH session.');
      ssh.dispose();
    }
  }
}

async function makeDirectoryOnLocal(localDirPath) {
  if (fs.existsSync(localDirPath)) {
    console.log(`transfer::makeDirectoryOnLocal: Directory already exists: ${localDirPath}`);
    return;
  }

  try {
    console.log(`transfer::makeDirectoryOnLocal: Making local folder: ${localDirPath}`);
    fs.mkdirSync(localDirPath, { recursive: true });
  } catch (error) {
    console.error('transfer::makeDirectoryOnLocal: Error making local folder:', error);
    throw error; // Re-throw the error for upstream handling
  }
}

async function getListOfPrefixesOnRemote(host, username, privateKeyPath, prefixesBasePath, prefixLocation) {
  const ssh = new NodeSSH();

  try {
    console.log(`transfer::getListOfPrefixesOnRemote: Connecting to ${host}...`);
    await ssh.connect({
      host: host,
      username: username,
      privateKeyPath: privateKeyPath,
    });

    const escapedPrefixesBasePath = `'${prefixesBasePath.replace(/'/g, "'\\''")}'`; // Basic quoting for shell
    const escapedPrefixLocation = `'${prefixLocation.replace(/'/g, "'\\''")}'`; // Basic quoting for shell

    const listDirCommand = `sh -c "find ${escapedPrefixesBasePath} -type d -iname ${escapedPrefixLocation}"`;

    console.log('transfer::getListOfPrefixesOnRemote: LISTDIR Command:', listDirCommand);

    const result = await ssh.execCommand(listDirCommand);

    console.log('transfer::getListOfPrefixesOnRemote: LISTDIR Result:', result);

    if (!result.stdout) {
      return [];
    }

    const stdOutLines = result.stdout.split('\n');
    const aliasPrefixesList = [];

    stdOutLines.forEach((line) => {
      const pathWithoutPrefixesBasePath = line.replace(prefixesBasePath, '');
      const alias = path.dirname(pathWithoutPrefixesBasePath).replace(path.sep, '');
      aliasPrefixesList.push({ alias, path: line });
    });

    console.log('transfer::getListOfPrefixesOnRemote: Alias Prefix List:', aliasPrefixesList);

    return aliasPrefixesList;
  } catch (error) {
    console.error('transfer::getListOfPrefixesOnRemote: Error listing remote folders:', error);
    throw error; // Re-throw the error for upstream handling
  } finally {
    if (ssh.connection) {
      console.log('transfer::getListOfPrefixesOnRemote: Disconnecting SSH session.');
      ssh.dispose();
    }
  }
}

export { uploadWithRsync, abortRsyncTransferByItemId, getListOfPrefixesOnRemote, downloadWithRsync };
