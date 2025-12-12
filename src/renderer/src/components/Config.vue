<script setup>
import { ref, toRaw, computed } from 'vue';
import { store } from './../store.js';

console.log('Config component loaded: ', store);

const saving = ref(false);
const lastError = ref(null);
const lastSuccess = ref(null);

const vdfFullPath = computed(() => {
  return `${store.steam.user_config_path}/${store.steam.user_id}/config/${store.steam.shortcuts_filename}`;
});

const saveOptions = () => {
  const configData = {
    db: toRaw(store.db),
    steam: toRaw(store.steam),
    remote_lib: toRaw(store.remote_lib),
    local_lib: toRaw(store.local_lib),
    backup: toRaw(store.backup),
    port_proton: toRaw(store.port_proton),
    emulation: toRaw(store.emulation),
    decky: toRaw(store.decky),
  };

  saving.value = true;
  lastError.value = null;
  lastSuccess.value = null;

  console.log('Saving config: ', configData);

  try {
    window.confAPI
      .saveConfig(configData)
      .then(() => {
        console.log('Config saved successfully');
        saving.value = false;
        lastSuccess.value = 'Config saved successfully';
      })
      .catch((error) => {
        console.error('Error saving config: ', error);
        saving.value = false;
        lastError.value = error;
      });
  } catch (error) {
    console.error('Config saving error: ', error);
    saving.value = false;
    lastError.value = error;
  }
};
</script>

<template>
  <form @submit.prevent="saveOptions">
    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Steam Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="steam_user_id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Steam User ID</label>
        <input
          id="steam_user_id"
          v-model="store.steam.user_id"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="123456"
          required
        />
      </div>
      <div>
        <label for="steam_user_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Steam User Name</label>
        <input
          id="steam_user_name"
          v-model="store.steam.user_name"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="User Name"
          required
        />
      </div>
      <div>
        <label for="steam_user_config_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">User Config Path</label>
        <input
          id="steam_user_config_path"
          v-model="store.steam.user_config_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="~/.config/steam/userdata/123456/config"
          required
        />
      </div>
      <div>
        <label for="steam_shortcuts_filename" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Steam Shortcuts File Name</label>
        <input
          id="steam_shortcuts_filename"
          v-model="store.steam.shortcuts_filename"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="shortcuts.vdf"
          required
        />
      </div>
      <div>
        <label for="steam_shortcuts_full_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Steam Shortcuts Full Path Ref</label>
        <div
          id="steam_shortcuts_full_path"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          {{ vdfFullPath }}
        </div>
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Remote Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="remote_host" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Host</label>
        <input
          id="remote_host"
          v-model="store.remote_lib.host"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="remote.host"
          required
        />
      </div>
      <div>
        <label for="remote_user" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote User (SSH)</label>
        <input
          id="remote_user"
          v-model="store.remote_lib.user"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="remote.user"
          required
        />
      </div>
      <div>
        <label for="remote_private_key_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Private Key Path (SSH)</label>
        <input
          id="remote_private_key_path"
          v-model="store.remote_lib.private_key_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="/home/user/.ssh/id_rsa"
          required
        />
      </div>
      <div>
        <label for="remote_games_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Games Path</label>
        <input
          id="remote_games_path"
          v-model="store.remote_lib.games_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Nexus/Games"
          required
        />
      </div>
      <div>
        <label for="remote_prefixes_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Prefixes Path</label>
        <input
          id="remote_prefixes_path"
          v-model="store.remote_lib.prefixes_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Nexus/Prefixes"
          required
        />
      </div>
      <div>
        <label for="remote_db_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote DB Path</label>
        <input
          id="remote_db_path"
          v-model="store.remote_lib.db_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Nexus/DB"
          required
        />
      </div>
      <div>
        <label for="remote_default_prefixes" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Default Prefixes</label>
        <input
          id="remote_default_prefixes"
          v-model="store.remote_lib.default_prefixes"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="default"
          required
        />
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Local Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="local_prefixes_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Local Prefixes Path</label>
        <input
          id="local_prefixes_path"
          v-model="store.local_lib.prefixes_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Prefixes"
          required
        />
      </div>
      <div>
        <label for="port_proton_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Port Proton Path</label>
        <input
          id="port_proton_path"
          v-model="store.port_proton.path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Port Proton Path"
          required
        />
      </div>
      <div>
        <label for="local_db_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Local DB Path</label>
        <input
          id="local_db_path"
          v-model="store.local_lib.db_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Local DB Path"
          required
        />
      </div>
    </div>

    <div class="inline-flex items-center mb-4">
      <h3 for="local_games_lib_path" class="block mb-2 flex-grow mr-4 text-2xl font-medium text-gray-900 dark:text-white">Local Games Lib Path</h3>
      <button
        type="button"
        class="text-white w-16 bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:bg-gradient-to-br dark:focus:ring-green-800 shadow-lg dark:shadow-lg dark:shadow-green-800/80 font-medium rounded-lg text-sm py-2 text-center mb-2"
        @click="store.local_lib.games_path.push({ label: '', path: '' })"
      >
        Add
      </button>
    </div>
    <div v-for="(libPath, index) in store.local_lib.games_path" :key="index" class="grid gap-6 mb-6 grid-cols-[5fr_40fr_5fr_40fr_10fr]">
      <span class="text-sm font-medium py-2.5 dark:text-white">Label:</span>
      <input
        :id="`local_games_lib_path_label-${index}`"
        v-model="store.local_lib.games_path[index].label"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Label"
        required
      />
      <span class="text-sm font-medium py-2.5 dark:text-white">Path:</span>
      <input
        :id="`local_games_lib_path_path-${index}`"
        v-model="store.local_lib.games_path[index].path"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Path"
        required
      />
      <div>
        <button
          v-if="store.local_lib.games_path.length > 1"
          type="button"
          class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="store.local_lib.games_path.splice(index, 1)"
        >
          Delete
        </button>
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Emulation Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="emulation_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Emulation Path</label>
        <input
          id="emulation_path"
          v-model="store.emulation.path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Emulation Path"
          required
        />
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Decky Loader Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="decky_theme_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Decky Theme Path</label>
        <input
          id="decky_theme_path"
          v-model="store.decky.theme.path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Decky Theme Path"
          required
        />
      </div>
    </div>
    <div class="inline-flex items-center mb-4">
      <h3 for="decke_theme_repos" class="block mb-2 flex-grow mr-4 text-2xl font-medium text-gray-900 dark:text-white">Decky Theme Repos</h3>
      <button
        type="button"
        class="text-white w-16 bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:bg-gradient-to-br dark:focus:ring-green-800 shadow-lg dark:shadow-lg dark:shadow-green-800/80 font-medium rounded-lg text-sm py-2 text-center mb-2"
        @click="store.decky.theme.repos.push({ url: 'https://github.com/', folder: '' })"
      >
        Add
      </button>
    </div>
    <div v-for="(repo, index) in store.decky.theme.repos" :key="index" class="grid gap-6 mb-6 grid-cols-[5fr_45fr_30fr_10fr]">
      <span class="text-sm font-medium py-2.5 dark:text-white">URL:</span>
      <input
        :id="`decky_theme_repo_url-${index}`"
        v-model="store.decky.theme.repos[index].url"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Repo"
        required
      />
      <input
        :id="`decky_theme_repo_folder-${index}`"
        v-model="store.decky.theme.repos[index].folder"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Folder"
        required
      />
      <div>
        <button
          type="button"
          class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="store.decky.theme.repos.splice(index, 1)"
        >
          Delete
        </button>
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Backup Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="remote_location" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Remote Location</label>
        <input
          id="remote_location"
          v-model="store.backup.remote_location"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Remote Location"
          required
        />
      </div>
    </div>

    <div class="inline-flex items-center mb-4">
      <h3 for="local_games_lib_path" class="block mb-2 flex-grow mr-4 text-2xl font-medium text-gray-900 dark:text-white">Local Backup Locations</h3>
      <button
        type="button"
        class="text-white w-16 bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:bg-gradient-to-br dark:focus:ring-green-800 shadow-lg dark:shadow-lg dark:shadow-green-800/80 font-medium rounded-lg text-sm py-2 text-center mb-2"
        @click="store.backup.local_locations.push({ path: '', exclude: '{\'*.iso\',\'*.log\',\'.ps3dir\'}', extra: '--dry-run' })"
      >
        Add
      </button>
    </div>
    <div v-for="(backupLocation, index) in store.backup.local_locations" :key="index" class="grid gap-6 mb-6 grid-cols-[5fr_25fr_5fr_25fr_5fr_25fr_10fr]">
      <span class="text-sm font-medium py-2.5 dark:text-white">Path:</span>
      <input
        :id="`backup_location_path-${index}`"
        v-model="store.backup.local_locations[index].path"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Path"
        required
      />
      <span class="text-sm font-medium py-2.5 dark:text-white">Exclude:</span>
      <input
        :id="`backup_location_exclude-${index}`"
        v-model="store.backup.local_locations[index].exclude"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Exclude"
      />
      <span class="text-sm font-medium py-2.5 dark:text-white">Extra:</span>
      <input
        :id="`backup_location_extra-${index}`"
        v-model="store.backup.local_locations[index].extra"
        type="text"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Extra"
      />
      <div>
        <button
          type="button"
          class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="store.backup.local_locations.splice(index, 1)"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <button
        type="submit"
        :disabled="saving"
        class="text-white h-16 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Save Settings
      </button>

      <div
        v-if="lastError"
        id="toast-danger"
        class="flex items-center w-full p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-sm dark:text-gray-400 dark:bg-gray-800"
        role="alert"
      >
        <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z"
            />
          </svg>
          <span class="sr-only">Error icon</span>
        </div>
        <div class="ms-3 text-sm font-normal">{{ lastError }}</div>
      </div>

      <div
        v-if="lastSuccess"
        id="toast-success"
        class="flex items-center w-full p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-sm dark:text-gray-400 dark:bg-gray-800"
        role="alert"
      >
        <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"
            />
          </svg>
          <span class="sr-only">Check icon</span>
        </div>
        <div class="ms-3 text-sm font-normal">{{ lastSuccess }}</div>
      </div>
    </div>
  </form>
</template>
