const { DataTypes } = require('sequelize');

function initGameModel(sequelize) {
  console.log('game.model::initGameModel');
  return sequelize.define('games', {
    steam_app_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    steam_title: {
      type: DataTypes.STRING,
    },
    steam_exe_target: {
      type: DataTypes.STRING,
    },
    steam_start_dir: {
      type: DataTypes.STRING,
    },
    steam_launch_args: {
      type: DataTypes.STRING,
    },
    icon: {
      type: DataTypes.BLOB,
    },
    game_location: {
      type: DataTypes.STRING,
    },
    prefix_location: {
      type: DataTypes.STRING,
    },
    launcher: {
      type: DataTypes.ENUM('NOOP', 'PORT_PROTON', 'PS2', 'PS3'), // Define the ENUM type and its values
      defaultValue: 'NOOP', // Set the default value
      allowNull: false,
    },
    launcher_target: {
      type: DataTypes.STRING,
    },
    game_hash_md5: {
      type: DataTypes.STRING,
    },
    game_size_in_bytes: {
      type: DataTypes.INTEGER,
    },
    prefix_hash_md5: {
      type: DataTypes.STRING,
    },
    prefix_size_in_bytes: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'UPLOADING', 'ACTIVE', 'INACTIVE', 'ARCHIVED'), // Define the ENUM type and its values
      defaultValue: 'DRAFT', // Set the default value
      allowNull: false,
    },
  });
}

export { initGameModel };
