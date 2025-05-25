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
  remote_lib: {
    host: 'nexus.host',
    user: 'nexus',
    private_key_path: '/home/deck/.ssh/spb_truenas_nexus',
    games_path: 'Nexus/Games',
    prefixes_path: 'Nexus/Prefixes',
    default_prefixes: 'default',
  },
  local_lib: {
    games_path: 'Games',
    prefixes_path: '',
  },
  port_proton: {
    path: '~.var/app/ru.linux_gaming.PortProton',
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
    remote_lib: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          default: 'nexus.host',
        },
        user: {
          type: 'string',
          default: 'nexus',
        },
        private_key_path: {
          type: 'string',
          default: '/home/deck/.ssh/spb_truenas_nexus',
        },
        games_path: {
          type: 'string',
          default: 'Nexus/Games',
        },
        prefixes_path: {
          type: 'string',
          default: 'Nexus/Prefixes',
        },
        default_prefixes: {
          type: 'string',
          default: 'default',
        },
      },
    },
    local_lib: {
      type: 'object',
      properties: {
        games_path: {
          type: 'string',
          default: 'Games',
        },
        prefixes_path: {
          type: 'string',
          default: '',
        },
      },
    },
    port_proton: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          default: '~/.var/app/ru.linux_gaming.PortProton',
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
  console.log('conf::saveConfig', configData);
  conf.set('db', configData.db);
  conf.set('steam', configData.steam);
  conf.set('remote_lib', configData.remote_lib);
  conf.set('local_lib', configData.local_lib);
  conf.set('port_proton', configData.port_proton);

  return true;
}

function getConfig() {
  console.log('conf::getConfig');
  return {
    db: conf.get('db'),
    steam: conf.get('steam'),
    remote_lib: conf.get('remote_lib'),
    local_lib: conf.get('local_lib'),
    port_proton: conf.get('port_proton'),
    app: conf.get('app'),
  };
}

function getConfigApp_WindowBounds() {
  console.log('conf::getConfigApp_WindowBounds');
  return conf.get('app.window_bounds');
}

function saveConfigApp_WindowBounds(bounds) {
  console.log('conf::saveConfigApp_WindowBounds', bounds);
  conf.set('app.window_bounds', bounds);
}

function saveConfigApp_ActiveTab(tabName) {
  console.log('conf::saveConfigApp_ActiveTab', tabName);
  conf.set('app.active_tab', tabName);
}

export { saveConfig, getConfig, getConfigApp_WindowBounds, saveConfigApp_ActiveTab, saveConfigApp_WindowBounds };
