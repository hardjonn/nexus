import { reactive } from 'vue';

const store = reactive({
  // db config
  db: {
    host: '',
    port: 9306,
    user: '',
    pass: '',
    base: '',
  },

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
  },

  // local config
  local_lib: {
    games_path: 'Games',
    prefixes_path: '',
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
  store.db = config.db;
  store.steam = config.steam;
  store.remote_lib = config.remote_lib;
  store.local_lib = config.local_lib;
  store.app = config.app;
});

export { store };
