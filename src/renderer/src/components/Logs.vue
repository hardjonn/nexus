<script setup>
import { reactive, watch } from 'vue';
import { consoleLog } from '../console.js';

const data = reactive({
  consoleLogs: '',
});

watch(
  () => consoleLog.data,
  () => {
    if (consoleLog.data) {
      data.consoleLogs += '<br/>' + consoleLog.data;
    }
  }
);

function clearConsoleLogs() {
  data.consoleLogs = '';
}
</script>

<template>
  <div class="w-full p-4">
    <div class="flex items-center justify-between w-full mb-4">
      <h2 class="block w-full text-3xl font-bold dark:text-white">
        <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Logs</span>
      </h2>
      <button
        type="button"
        class="text-white h-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 w-3xs dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
        @click="clearConsoleLogs"
      >
        Clear
      </button>
    </div>

    <div v-if="data.consoleLogs" class="dark:bg-gray-700 dark:text-gray-400">
      <div class="p-4 w-full h-full overflow-auto">
        <pre v-html="data.consoleLogs"></pre>
      </div>
    </div>
  </div>
</template>
