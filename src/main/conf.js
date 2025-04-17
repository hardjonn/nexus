import { Conf } from 'electron-conf/main';

const defaultConfig = {
  db: {
    host: 'nexus.host',
    port: 9306,
    user: '',
    pass: '',
    base: '',
  },
  steam: {
    user_id: '',
    user_name: '',
    user_config_path: '',
    shortcuts_filename: 'shortcuts.vdf',
  },
  nas: {
    host: 'nexus.host',
    games_lib_path: 'Nexus/Games',
    prefixes_path: 'Nexus/Prefixes',
  },
  client: {
    games_lib_path: 'Games',
    prefixes_path: '',
  },
  app: {
    window_bounds: {
      x: 240,
      y: 120,
      width: 1200,
      height: 800,
    },
    active_tab: 'config',
  },
};

const schema = {
  type: 'object',
  properties: {
    db: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          default: 'nexus.host',
        },
        port: {
          type: 'number',
          default: 9306,
        },
        user: {
          type: 'string',
          default: '',
        },
        pass: {
          type: 'string',
          default: '',
        },
        base: {
          type: 'string',
          default: '',
        },
      },
    },
    steam: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          default: '',
        },
        user_name: {
          type: 'string',
          default: '',
        },
        user_config_path: {
          type: 'string',
          default: '',
        },
        shortcuts_filename: {
          type: 'string',
          default: 'shortcuts.vdf',
        },
      },
    },
    nas: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          default: 'nexus.host',
        },
        games_lib_path: {
          type: 'string',
          default: 'Nexus/Games',
        },
        prefixes_path: {
          type: 'string',
          default: 'Nexus/Prefixes',
        },
      },
    },
    client: {
      type: 'object',
      properties: {
        games_lib_path: {
          type: 'string',
          default: 'Games',
        },
        prefixes_path: {
          type: 'string',
          default: '',
        },
      },
    },
    app: {
      type: 'object',
      properties: {
        window_bounds: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              default: 240,
            },
            y: {
              type: 'number',
              default: 120,
            },
            width: {
              type: 'number',
              default: 1200,
            },
            height: {
              type: 'number',
              default: 800,
            },
          },
        },
        active_tab: {
          type: 'string',
          default: null,
        },
      },
    },
  },
};

const conf = new Conf({ schema: schema, defaults: defaultConfig });

function saveConfig(configData) {
  conf.set('db', configData.db);
  conf.set('steam', configData.steam);
  conf.set('nas', configData.nas);
  conf.set('client', configData.client);

  return true;
}

function getConfig() {
  return {
    db: conf.get('db'),
    steam: conf.get('steam'),
    nas: conf.get('nas'),
    client: conf.get('client'),
    app: conf.get('app'),
  };
}

function getConfigApp_WindowBounds() {
  return conf.get('app.window_bounds');
}

function saveConfigApp_WindowBounds(bounds) {
  conf.set('app.window_bounds', bounds);
}

function saveConfigApp_ActiveTab(tabName) {
  conf.set('app.active_tab', tabName);
}

export { saveConfig, getConfig, getConfigApp_WindowBounds, saveConfigApp_ActiveTab, saveConfigApp_WindowBounds };
