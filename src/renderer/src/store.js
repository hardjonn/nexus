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
});

window.conf.getConfig().then((config) => {
  console.log('config', config);
  store.db = config.db;
  store.steam = config.steam;
  store.nas = config.nas;
  store.client = config.client;
});

export { store };
