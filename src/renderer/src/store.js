import { reactive } from 'vue';

const store = reactive({
  // steam config
  steam: {
    user_id: '',
    user_name: '',
    user_config_path: '',
    shortcuts_filename: 'shortcuts.vdf',
  },

  // remote config
  remote_lib: {
    host: '',
    games_path: 'Nexus/Games',
    prefixes_path: 'Nexus/Prefixes',
    db_path: 'Nexus/DB',
    default_prefixes: 'default',
  },

  // port proton config
  port_proton: {
    path: '',
  },

  // emulation config
  emulation: {
    path: '',
  },

  // local config
  local_lib: {
    games_path: [{ label: 'SSD', path: 'Games' }],
    prefixes_path: '',
    db_path: '/home/deck/Nexus/DB',
  },

  // backup config
  backup: {
    remote_location: '~/Backup/Location',
    local_locations: [{ path: '~/Backup/Location', exclude: "{'*.txt','dir3','dir4'}", extra: '--dry-run' }],
  },

  app: {
    active_tab: 'config',
  },

  setActiveTab(tabName) {
    this.app.active_tab = tabName;
    console.log('Activating Tab:', tabName);

    // make an ipc call to the main process to set the active tab
    window.confAPI.saveConfigApp_ActiveTab(tabName);
  },
});

window.confAPI.getConfig().then((config) => {
  console.log('Received Config from the main process:', config);
  store.steam = config.steam;
  store.remote_lib = config.remote_lib;
  store.port_proton = config.port_proton;
  store.emulation = config.emulation;
  store.local_lib = config.local_lib;
  store.backup = config.backup;
  store.app = config.app;
});

export { store };
