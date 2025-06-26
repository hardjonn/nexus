const { NodeSSH } = require('node-ssh');
import path from 'node:path';
import fs from 'node:fs';
import { getConfig } from './conf';
import { dbModelValidator, dbModelSerializer, dbModelParser } from './game.model';
import { downloadWithRsync } from './transfer';

const config = getConfig();
const ssh = new NodeSSH();
let sftp = null;

async function ensureConnection() {
  console.log('db::ensureConnection: Ensuring connection to ' + config.remote_lib.host);

  if (sftp) {
    console.log('db::ensureConnection: Connection already established');
    return;
  }

  try {
    console.log('db::ensureConnection: Connecting to ' + config.remote_lib.host);

    await ssh.connect({
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      keepaliveCountMax: 5,
      keepaliveInterval: 30 * 1000,
    });
    console.log('db::ensureConnection: Connected to ' + config.remote_lib.host);

    sftp = await ssh.requestSFTP();
    console.log('db::ensureConnection: SFTP connection established');

    console.log('db::ensureConnection: Ensuring DB directory exists');
    await ssh.mkdir(config.remote_lib.db_path);
  } catch (error) {
    console.error('db::ensureConnection: Error connecting to ' + config.remote_lib.host, error);
    throw error;
  }
}

async function sftp_readDir(path) {
  await ensureConnection();

  console.log('db::sftp_readDir: Reading directory from ' + path);

  return new Promise((resolve, reject) => {
    sftp.readdir(path, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.map((item) => item.filename));
      }
    });
  });
}

async function sftp_readFile(gameId) {
  await ensureConnection();

  const gameItemPath = path.join(config.remote_lib.db_path, gameId + '.json');
  console.log('db::sftp_readFile: Reading file from ' + gameItemPath);

  return new Promise((resolve, reject) => {
    sftp.readFile(gameItemPath, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(dbModelParser(buffer.toString()));
      }
    });
  });
}

async function sftp_writeFile(gameId, payload) {
  await ensureConnection();

  const data = dbModelSerializer(payload);

  const gameItemPath = path.join(config.remote_lib.db_path, gameId + '.json');
  console.log('db::sftp_writeFile: Writing file to ' + gameItemPath);

  return new Promise((resolve, reject) => {
    sftp.writeFile(gameItemPath, data, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

async function findAll(progressCallback) {
  try {
    console.log('db::findAll: Fetching games');

    const abortId = 'dbPullFromRemote';
    const startTime = Date.now();

    const games = [];

    // fetching every file using the sftp is very slow
    // thus sync down the entire data set using rsync
    // and then load files from the local directory
    await downloadWithRsync({
      abortId,
      sourcePath: config.remote_lib.db_path,
      destinationPath: config.local_lib.db_path,
      host: config.remote_lib.host,
      username: config.remote_lib.user,
      privateKeyPath: config.remote_lib.private_key_path,
      onProgress: (output) => {
        const augmentedWithSteamAppIdOutput = augmentOutputWithProgressId(output, abortId);
        progressCallback(augmentedWithSteamAppIdOutput);
      },
    });

    const listOfFilesInLocalDirectory = fs.readdirSync(config.local_lib.db_path);
    console.log('db::findAll: Files in local directory:', listOfFilesInLocalDirectory);

    for (const file of listOfFilesInLocalDirectory) {
      if (file.endsWith('.json')) {
        const gameContent = fs.readFileSync(path.join(config.local_lib.db_path, file), 'utf-8');
        const game = dbModelParser(gameContent);
        if (game) {
          games.push(game);
        } else {
          console.error('db::findAll: Error parsing game:', file);
          console.log('db::findAll: game content', gameContent);
        }
      }
    }

    const endTime = Date.now();
    console.log('db::findAll: Fetching games took ' + (endTime - startTime) + ' ms');

    return games;
  } catch (error) {
    console.error('db::findAll: Error fetching games:', error);
    throw error;
  }
}

async function findOne(gameId) {
  try {
    console.log('db::findOne: Fetching game ' + gameId);

    return await sftp_readFile(gameId);
  } catch (error) {
    console.error('db::findOne: Error fetching game:', error);
    throw error;
  }
}

async function create(payload) {
  try {
    console.log('db::create: Creating game ' + payload.steam_app_id);
    const gameId = payload.steam_app_id;

    await sftp_writeFile(gameId, payload);

    return payload;
  } catch (error) {
    console.error('db::create: Error creating game:', error);
    throw error;
  }
}

async function update(updatePayload, conditions) {
  try {
    console.log('db::update: Updating game ' + conditions.where.steam_app_id);
    const gameId = conditions.where.steam_app_id;
    // always fetch the game from the remote
    // to ensure we have the latest version
    const game = await findOne(gameId);

    if (!game) {
      throw new Error(`Game with steamAppId ${gameId} not found`);
    }

    const updatedGame = {
      ...game,
      ...updatePayload,
    };

    await sftp_writeFile(gameId, updatedGame);

    return updatedGame;
  } catch (error) {
    console.error('db::update: Error updating game:', error);
    throw error;
  }
}

function augmentOutputWithProgressId(output, abortId) {
  output.progressId = abortId;

  return output;
}

const db = {
  findAll,
  findOne,
  create,
  update,
};

export { db };
