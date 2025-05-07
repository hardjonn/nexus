// import Rsync from 'rsync';

// /**
//  * Upload a local directory to a remote location using rsync
//  * @param {string} sourcePath - Local directory path
//  * @param {string} destinationPath - Remote destination path (user@host:/path)
//  * @param {Object} options - Additional options
//  * @param {Function} progressCallback - Callback for progress updates
//  * @returns {Promise<void>}
//  */
// export async function uploadDirectoryWithRsync(sourcePath, destinationPath, options = {}, progressCallback = null) {
//   return new Promise((resolve, reject) => {
//     // Create a new rsync instance
//     const rsync = new Rsync().shell('ssh').flags('avz').source(sourcePath).destination(destinationPath).progress();

//     // Add any additional options
//     if (options.delete) {
//       rsync.delete();
//     }

//     if (options.exclude) {
//       rsync.exclude(options.exclude);
//     }

//     // Handle progress updates
//     if (progressCallback) {
//       rsync.output(
//         (data) => {
//           progressCallback({
//             type: 'progress',
//             data: data.toString(),
//           });
//         },
//         (data) => {
//           progressCallback({
//             type: 'error',
//             data: data.toString(),
//           });
//         }
//       );
//     }

//     // Execute the rsync command
//     rsync.execute((error, code, cmd) => {
//       if (error) {
//         reject(new Error(`Rsync failed: ${error.message}`));
//         return;
//       }

//       if (code !== 0) {
//         reject(new Error(`Rsync exited with code ${code}`));
//         return;
//       }

//       resolve();
//     });
//   });
// }

// const { spawn } = require('child_process');
// const path = require('path');

// /**
//  * Uploads a local directory to a remote host using rsync over SSH with a private key.
//  * @param {Object} options
//  * @param {string} options.localDir - Path to the local directory.
//  * @param {string} options.remoteUser - Remote SSH username.
//  * @param {string} options.remoteHost - Remote host (IP or domain).
//  * @param {string} options.remoteDir - Destination path on remote host.
//  * @param {string} [options.privateKey] - Path to the private SSH key.
//  * @param {function(string): void} [options.onProgress] - Optional callback for progress updates.
//  * @returns {Promise<void>}
//  */
// function uploadWithRsync({ localDir, remoteUser, remoteHost, remoteDir, privateKey, onProgress }) {
//   return new Promise((resolve, reject) => {
//     const remote = `${remoteUser}@${remoteHost}:${remoteDir}`;

//     // If a private key is specified, construct the SSH command
//     const sshCommand = privateKey ? `ssh -i ${path.resolve(privateKey)} -o StrictHostKeyChecking=no` : 'ssh';

//     const rsyncArgs = ['-az', '--info=progress2', '-e', sshCommand, localDir, remote];

//     const rsync = spawn('rsync', rsyncArgs);

//     rsync.stdout.on('data', (data) => {
//       const text = data.toString();
//       if (onProgress) onProgress(text);
//     });

//     rsync.stderr.on('data', (data) => {
//       const text = data.toString();
//       if (onProgress) onProgress(text);
//     });

//     rsync.on('close', (code) => {
//       if (code === 0) {
//         resolve();
//       } else {
//         reject(new Error(`rsync exited with code ${code}`));
//       }
//     });

//     rsync.on('error', (err) => {
//       reject(err);
//     });
//   });
// }

// module.exports = uploadWithRsync;

// const uploadWithRsync = require('./uploadWithRsync');

// uploadWithRsync({
//   localDir: './my-folder/',
//   remoteUser: 'ubuntu',
//   remoteHost: '123.45.67.89',
//   remoteDir: '/home/ubuntu/backup/',
//   privateKey: '~/.ssh/my-key.pem', // your private key
//   onProgress: (output) => {
//     process.stdout.write(output);
//   },
// })
//   .then(() => console.log('Upload completed successfully!'))
//   .catch((err) => console.error('Upload failed:', err));

const { spawn } = require('child_process');
const { NodeSSH } = require('node-ssh');
const path = require('path');
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
      success: true,
      message: 'Rsync transfer aborted successfully',
    };
  } catch (error) {
    console.error('Error aborting rsync transfer:', error);

    return {
      success: false,
      message: 'Failed to abort rsync transfer: ' + error,
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
    await makeDirectoryOnRemote(host, username, privateKeyPath, destinationPath);
  } catch (error) {
    console.error('Error making remote folder:', error);
    throw error;
  }

  return new Promise((resolve, reject) => {
    const remotePath = `${username}@${host}:${destinationPath}`;

    const sourcePathWithTrailingSlash = sourcePath.endsWith('/') ? sourcePath : sourcePath + '/';
    const destinationPathWithTrailingSlash = remotePath.endsWith('/') ? remotePath : remotePath + '/';

    console.log('remote: ' + destinationPathWithTrailingSlash);
    console.log('sourcePath: ' + sourcePathWithTrailingSlash);

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

async function makeDirectoryOnRemote(host, username, privateKeyPath, remoteDirPath) {
  const ssh = new NodeSSH();

  try {
    console.log(`Connecting to ${host}...`);
    await ssh.connect({
      host: host,
      username: username,
      privateKeyPath: privateKeyPath,
    });

    const escapedDirPath = `'${remoteDirPath.replace(/'/g, "'\\''")}'`; // Basic quoting for shell

    const mkDirCommand = `sh -c "mkdir -p ${escapedDirPath}"`;

    console.log('MKDIR Command:', mkDirCommand);

    await ssh.execCommand(mkDirCommand);
  } catch (error) {
    console.error('Error making remote folder:', error);
    throw error; // Re-throw the error for upstream handling
  } finally {
    if (ssh.connection) {
      console.log('Disconnecting SSH session.');
      ssh.dispose();
    }
  }
}

export { uploadWithRsync, abortRsyncTransferByItemId };

// module.exports = uploadWithRsync;

// const uploadWithRsync = require('./uploadWithRsync');

// uploadWithRsync({
//   sourcePath: './my-folder/',
//   destinationPath: '/home/ubuntu/backup/',
//   remoteUser: 'ubuntu',
//   remoteHost: '123.45.67.89',
//   privateKey: '~/.ssh/my-key.pem', // your private key
//   onProgress: (output, percentage) => {
//     // Display the progress as a percentage
//     process.stdout.clearLine();
//     process.stdout.cursorTo(0);
//     process.stdout.write(`Progress: ${percentage}%`);
//   },
// })
//   .then(() => console.log('\nUpload completed successfully!'))
//   .catch((err) => console.error('Upload failed:', err));
