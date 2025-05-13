<script setup>
import { ref, computed } from 'vue';
import { getGames } from '../games.js';
import { progress } from '../progress.js';
import GameItem from './GameItem.vue';

const loading = ref(false);
const error = ref(null);
const gamesMap = ref({});
const search = ref('');
const source = ref(null);
const status = ref(['DRAFT', 'UPLOADING', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);

loadGamesList();

async function loadGamesList() {
  try {
    // Fetch games from the main process
    loading.value = true;
    error.value = null;

    console.log('GamesList::loadGamesList fetching games');
    const response = await getGames();

    if (response.status !== 'success') {
      error.value = response.error.message;
      return;
    }

    gamesMap.value = response.games;
  } catch (error) {
    error.value = 'Failed to load games: ' + error.message;
  } finally {
    loading.value = false;
  }
}

const filteredAndSortedGames = computed(() => {
  function compare(a, b) {
    if (a.steamTitle < b.steamTitle) return -1;
    if (a.steamTitle > b.steamTitle) return 1;
    return 0;
  }

  console.log('status.value', status.value);

  return Object.values(gamesMap.value)
    .filter((game) => {
      return game.steamTitle.toLowerCase().includes(search.value.toLowerCase()) || game.steamAppId.toString().includes(search.value.toLowerCase());
    })
    .filter((game) => {
      if (!source.value) return true;
      if (source.value === 'db') return game.source === 'db';
      if (source.value === 'steam') return game.source === 'steam';
    })
    .filter((game) => {
      if (status.value.length === 0) return true;
      if (status.value.includes(game.status)) return true;
      return false;
    })
    .sort(compare);
});
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full mb-4 mt-4">
    <div class="flex items-center justify-between w-full">
      <h2 class="block text-3xl font-bold dark:text-white">
        <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Games Lib</span>
      </h2>

      <button
        v-if="!loading"
        type="button"
        class="w-3xs text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
        @click="loadGamesList()"
      >
        Refresh
      </button>

      <button
        v-if="loading"
        disabled
        type="button"
        class="w-3xs text-white bg-gradient-to-br from-purple-600 to-blue-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center cursor-not-allowed"
      >
        <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="#E5E7EB"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentColor"
          />
        </svg>
        Loading...
      </button>
    </div>
  </div>

  <div class="flex flex-col items-center justify-center w-full mb-4">
    <div class="flex items-center justify-between w-full">
      <div class="relative w-md">
        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
        </div>
        <input
          id="search"
          v-model="search"
          type="search"
          class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Search"
          required
        />
      </div>

      <div>
        <span class="font-semibold text-gray-900 dark:text-white">Source: </span>

        <div class="flex">
          <div class="flex items-center me-4">
            <input
              id="source-all"
              v-model="source"
              checked
              type="radio"
              value=""
              name="source-filter"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="source-all" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">All</label>
          </div>
          <div class="flex items-center me-4">
            <input
              id="source-nexus"
              v-model="source"
              type="radio"
              value="db"
              name="source-filter"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="source-nexus" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Nexus DB</label>
          </div>
          <div class="flex items-center me-4">
            <input
              id="source-steam"
              v-model="source"
              type="radio"
              value="steam"
              name="source-filter"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="source-steam" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Steam</label>
          </div>
        </div>
      </div>

      <div>
        <span class="font-semibold text-gray-900 dark:text-white">Status: </span>

        <div class="flex">
          <div class="flex items-center me-4">
            <input
              id="status-checkbox-draft"
              v-model="status"
              checked
              type="checkbox"
              value="DRAFT"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="status-checkbox-draft" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">DRAFT</label>
          </div>
          <div class="flex items-center me-4">
            <input
              id="status-checkbox-uploading"
              v-model="status"
              checked
              type="checkbox"
              value="UPLOADING"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="status-checkbox-uploading" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">UPLOADING</label>
          </div>
          <div class="flex items-center me-4">
            <input
              id="status-checkbox-active"
              v-model="status"
              checked
              type="checkbox"
              value="ACTIVE"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="status-checkbox-active" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">ACTIVE</label>
          </div>
          <div class="flex items-center me-4">
            <input
              id="status-checkbox-inactive"
              v-model="status"
              checked
              type="checkbox"
              value="INACTIVE"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="status-checkbox-inactive" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">INACTIVE</label>
          </div>
          <div class="flex items-center">
            <input
              id="status-checkbox-archived"
              v-model="status"
              checked
              type="checkbox"
              value="ARCHIVED"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="status-checkbox-archived" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">ARCHIVED</label>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="error"
    id="alert-border-2"
    class="flex items-center p-4 mb-4 text-red-800 border-t-4 border-red-300 bg-red-50 dark:text-red-400 dark:bg-gray-800 dark:border-red-800"
    role="alert"
  >
    <svg class="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
      />
    </svg>
    <div class="ms-3 text-sm font-medium">
      {{ error }}
    </div>
  </div>

  <div v-if="filteredAndSortedGames.length === 0 && !loading" class="dark:text-gray-300">No games found in the library</div>

  <div v-if="filteredAndSortedGames.length > 0" class="game-list">
    <div v-for="game in filteredAndSortedGames" :key="game.steamAppId" class="game-item">
      <GameItem :game-item="game" :progress="progress[`steamAppId-${game.steamAppId}`]" />
    </div>
  </div>
</template>
