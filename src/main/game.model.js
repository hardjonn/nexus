const { DataTypes } = require('sequelize');

function initGameModel(sequelize) {
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
    client_location: {
      type: DataTypes.STRING,
    },
    nas_location: {
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
    status: {
      type: DataTypes.ENUM('DRAFT', 'UPLOADING', 'ACTIVE', 'INACTIVE', 'ARCHIVED'), // Define the ENUM type and its values
      defaultValue: 'DRAFT', // Set the default value
      allowNull: false,
    },
    hash_md5: {
      type: DataTypes.STRING,
    },
    size_in_bytes: {
      type: DataTypes.INTEGER,
    },
  });
}

export { initGameModel };
