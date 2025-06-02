function uploadPrefixesBackup() {
  return window.backupAPI.backupPrefixes();
}

function uploadCustomBackup(location) {
  return window.backupAPI.backupCustomLocation(location);
}

function uploadAllCustomBackups() {
  return window.backupAPI.backupAllCustomLocations();
}

function abortPrefixesBackupUpload() {
  return window.backupAPI.abortPrefixesBackupUpload();
}

function abortCustomBackupUpload() {
  return window.backupAPI.abortCustomBackupUpload();
}

export { uploadPrefixesBackup, uploadCustomBackup, uploadAllCustomBackups, abortPrefixesBackupUpload, abortCustomBackupUpload };
