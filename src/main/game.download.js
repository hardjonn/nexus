import { getConfig } from './conf';
import { getListOfPrefixesOnRemote } from './transfer';

async function getDownloadDetails(steamAppId, gameItem) {
  // the download details include
  //  - list of available prefixes

  const config = getConfig();

  const downloadDetails = {
    prefixes: [],
  };

  downloadDetails.prefixes = await getAvailablePrefixes(config, gameItem.prefixLocation);

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

export { getDownloadDetails };
