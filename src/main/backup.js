import path from 'path';
import { getConfig } from './conf.js';
import { uploadWithRsync, abortRsyncTransferByItemId } from './transfer.js';

let shouldAbortBackupTransferSequence = false;

async function backupPrefixes(progressCallback) {
  console.log('backup::backupPrefixes: starting');
  const config = getConfig();

  try {
    const abortId = 'backup';

    const sourcePath = config.local_lib.prefixes_path;
    const destinationPath = path.join(config.remote_lib.prefixes_path, config.steam.user_name);

    console.log('backup::backupPrefixes: sourcePath: ' + sourcePath);
    console.log('backup::backupPrefixes: destinationPath: ' + destinationPath);

    await uploadWithRsync({
      abortId,
      sourcePath,
      destinationPath,
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, abortId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    return {
      status: 'success',
    };
  } catch (error) {
    console.error('backup::backupPrefixes: Error uploading prefixes backup:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to upload prefixes backup: ' + error,
      },
    };
  }
}

async function backupCustomLocation(location, progressCallback) {
  console.log('backup::backupCustomLocation', location);
  const config = getConfig();

  try {
    const abortId = 'backup';

    const sourcePath = location.path;
    const destinationPath = path.join(config.backup.remote_location, config.steam.user_name, location.path);

    console.log('backup::backupCustomLocation: sourcePath: ' + sourcePath);
    console.log('backup::backupCustomLocation: destinationPath: ' + destinationPath);

    await uploadWithRsync({
      abortId,
      sourcePath,
      destinationPath,
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      exclude: location.exclude,
      extra: location.extra,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, abortId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    return {
      status: 'success',
    };
  } catch (error) {
    console.error('backup::backupCustomLocation: Error uploading custom backup:', error);
    return {
      status: 'error',
      error: {
        message: 'Failed to upload custom backup: ' + error,
      },
    };
  }
}

async function backupAllCustomLocations(progressCallback) {
  console.log('backup::backupAllCustomLocations');

  const errors = [];

  const config = getConfig();

  shouldAbortBackupTransferSequence = false;

  for (const location of config.backup.local_locations) {
    if (shouldAbortBackupTransferSequence) {
      break;
    }

    const result = await backupCustomLocation(location, progressCallback);

    if (result.status !== 'success') {
      errors.push(result.error.message);
    }
  }

  return {
    status: 'success',
    errors,
  };
}

async function abortBackupTransfer(abortId) {
  console.log('backup::abortBackupTransfer', abortId);

  shouldAbortBackupTransferSequence = true;

  return await abortRsyncTransferByItemId(abortId);
}

function augmentOutputWithProgressId(output, abortId) {
  output.progressId = abortId;

  return output;
}

export { backupPrefixes, backupCustomLocation, abortBackupTransfer, backupAllCustomLocations };
