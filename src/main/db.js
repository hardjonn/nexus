const { Sequelize } = require('sequelize');

import { getConfig } from './conf';
import { initGameModel } from './game.model';

const config = getConfig();

const sequelize = new Sequelize(config.db.base, config.db.user, config.db.pass, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mariadb',
  define: {
    timestamps: false,
  },
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.games = initGameModel(sequelize);

export { db };
