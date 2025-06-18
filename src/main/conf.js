import { Conf } from 'electron-conf/main';

const defaultConfig = {
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
    db_path: 'Nexus/DB',
    default_prefixes: 'default',
  },
  local_lib: {
    games_path: [{ label: 'SSD', path: 'Games' }],
    prefixes_path: '',
    db_path: '/home/deck/Nexus/DB',
  },
  port_proton: {
    path: '~/.var/app/ru.linux_gaming.PortProton',
  },
  emulation: {
    path: '~/Games/Emulation',
  },
  backup: {
    remote_location: '~/Backup/Location',
    local_locations: [{ path: '~/Backup/Location', exclude: "{'*.txt','dir3','dir4'}", extra: '--dry-run' }],
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
        db_path: {
          type: 'string',
          default: 'Nexus/DB',
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
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: {
                type: 'string',
              },
              path: {
                type: 'string',
              },
            },
          },
          default: [{ label: 'SSD', path: 'Games' }],
        },
        prefixes_path: {
          type: 'string',
          default: '',
        },
        db_path: {
          type: 'string',
          default: '/home/deck/Nexus/DB',
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
    emulation: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          default: '~/Games/Emulation',
        },
      },
    },
    backup: {
      type: 'object',
      properties: {
        remote_location: {
          type: 'string',
          default: '~/Backup/Location',
        },
        local_locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
              },
              exclude: {
                type: 'string',
              },
              extra: {
                type: 'string',
              },
            },
          },
          default: [{ path: '~/Backup/Location', exclude: "{'*.txt','dir3','dir4'}", extra: '--dry-run' }],
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
  conf.set('steam', configData.steam);
  conf.set('remote_lib', configData.remote_lib);
  conf.set('local_lib', configData.local_lib);
  conf.set('port_proton', configData.port_proton);
  conf.set('emulation', configData.emulation);
  conf.set('backup', configData.backup);

  return true;
}

function getConfig() {
  console.log('conf::getConfig');
  return {
    steam: conf.get('steam'),
    remote_lib: conf.get('remote_lib'),
    local_lib: conf.get('local_lib'),
    port_proton: conf.get('port_proton'),
    emulation: conf.get('emulation'),
    backup: conf.get('backup'),
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
