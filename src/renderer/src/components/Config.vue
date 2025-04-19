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
    nas: toRaw(store.nas),
    client: toRaw(store.client),
  };

  saving.value = true;
  lastError.value = null;
  lastSuccess.value = null;

  console.log('Saving config: ', configData);

  try {
    window.conf
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
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Database Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="db_host" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">DB Host</label>
        <input
          id="db_host"
          v-model="store.db.host"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="nexus.db.host"
          required
        />
      </div>
      <div>
        <label for="db_port" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">DB Port</label>
        <input
          id="db_port"
          v-model="store.db.port"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="3306"
          required
        />
      </div>
      <div>
        <label for="db_user" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">DB User</label>
        <input
          id="db_user"
          v-model="store.db.user"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="user"
          required
        />
      </div>
      <div>
        <label for="db_base" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">DB Base</label>
        <input
          id="db_base"
          v-model="store.db.base"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="database"
          required
        />
      </div>
      <div>
        <label for="db_pass" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">DB Pass</label>
        <input
          id="db_pass"
          v-model="store.db.pass"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder=""
          required
        />
      </div>
    </div>

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
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">NAS/Remote Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="nas_host" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NAS/Remote Host</label>
        <input
          id="nas_host"
          v-model="store.nas.host"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="nas.host"
          required
        />
      </div>
      <div>
        <label for="nas_games_lib_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NAS/Remote Games Lib Path</label>
        <input
          id="nas_games_lib_path"
          v-model="store.nas.games_lib_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Nexus/Games"
          required
        />
      </div>
      <div>
        <label for="nas_prefixes_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">NAS/Remote Prefixes Path</label>
        <input
          id="nas_prefixes_path"
          v-model="store.nas.prefixes_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Nexus/Prefixes"
          required
        />
      </div>
    </div>

    <h2 class="block w-full mt-8 mb-6 text-3xl font-bold dark:text-white">
      <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Client/Local Settings</span>
    </h2>
    <div class="grid gap-6 mb-6 md:grid-cols-2">
      <div>
        <label for="client_games_lib_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Client/Local Games Lib Path</label>
        <input
          id="client_games_lib_path"
          v-model="store.client.games_lib_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Games"
          required
        />
      </div>
      <div>
        <label for="client_prefixes_path" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Client/Local Prefixes Path</label>
        <input
          id="client_prefixes_path"
          v-model="store.client.prefixes_path"
          type="text"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Prefixes"
          required
        />
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
