import { db } from './db';

const Game = db.games;

async function db_getAllGamesMap() {
  try {
    const games = await Game.findAll();
    // convert games to a map
    const gamesMap = {};
    for (const game of games) {
      const steamAppId = game['steam_app_id'];
      gamesMap[steamAppId] = game;
    }

    return gamesMap;
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

export { db_getAllGamesMap };
