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

  // nas/remote config
  nas: {
    host: '',
    games_lib_path: 'Nexus/Games',
    prefixes_path: 'Nexus/Prefixes',
  },

  // client config
  client: {
    games_lib_path: 'Games',
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
  store.nas = config.nas;
  store.client = config.client;
  store.app = config.app;
});

export { store };
