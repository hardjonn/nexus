import Rsync from 'rsync';

/**
 * Upload a local directory to a remote location using rsync
 * @param {string} sourcePath - Local directory path
 * @param {string} destinationPath - Remote destination path (user@host:/path)
 * @param {Object} options - Additional options
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<void>}
 */
export async function uploadDirectoryWithRsync(sourcePath, destinationPath, options = {}, progressCallback = null) {
  return new Promise((resolve, reject) => {
    // Create a new rsync instance
    const rsync = new Rsync().shell('ssh').flags('avz').source(sourcePath).destination(destinationPath).progress();

    // Add any additional options
    if (options.delete) {
      rsync.delete();
    }

    if (options.exclude) {
      rsync.exclude(options.exclude);
    }

    // Handle progress updates
    if (progressCallback) {
      rsync.output(
        (data) => {
          progressCallback({
            type: 'progress',
            data: data.toString(),
          });
        },
        (data) => {
          progressCallback({
            type: 'error',
            data: data.toString(),
          });
        }
      );
    }

    // Execute the rsync command
    rsync.execute((error, code, cmd) => {
      if (error) {
        reject(new Error(`Rsync failed: ${error.message}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Rsync exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}
