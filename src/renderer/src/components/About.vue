<script setup>
import { reactive, computed, watch } from 'vue';
import { store } from './../store.js';
import { progress } from '../progress.js';
import { getCurrentVersion, checkForUpdates } from '../update.js';

const processingActions = {
  gettingCurrentVersion: 'Getting current version...',
  checkingForUpdates: 'Checking for updates...',
  downloadingUpdate: 'Downloading update...',
};

const data = reactive({
  currentVersion: null,
  updateCheckResult: null,

  processingAction: null,

  errorMessage: null,
  progressMessage: null,
  successMessage: null,
  errors: null,

  progressContent: null,
  progress: null,
});

function isProcessingAction(action) {
  return data.processingAction === action;
}

function activateProcessingAction(action) {
  data.processingAction = action;

  data.errorMessage = null;
  data.successMessage = null;
  data.errors = null;
  data.progress = null;
  data.progressContent = null;
}

watch(
  () => progress.backup,
  () => {
    data.progress = progress.backup;

    if (!data.progressContent) {
      data.progressContent = '';
    }

    if (progress.backup) {
      data.progressContent += progress.backup.rawOutput;
    }
  }
);

async function onActionGetCurrentVersion() {
  activateProcessingAction(processingActions.gettingCurrentVersion);

  try {
    const response = await getCurrentVersion();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.currentVersion = response.version;
  } catch (error) {
    console.error('Error getting current version:', error);
    data.errorMessage = 'An error occurred while getting the current version: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionCheckForUpdates() {
  activateProcessingAction(processingActions.checkingForUpdates);

  try {
    const response = await checkForUpdates();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.updateCheckResult = response.updateCheckResult;
    data.successMessage = 'Checked for updates';
  } catch (error) {
    console.error('Error checking for updates:', error);
    data.errorMessage = 'An error occurred while checking for updates: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

onActionGetCurrentVersion();
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full p-4">
    <div class="flex items-center justify-between w-full mb-4">
      <h2 class="block w-full text-3xl font-bold dark:text-white">
        <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">About</span>
      </h2>
    </div>

    <div class="flex flex-col items-start justify-start w-full mb-8">
      <div class="flex items-center justify-between w-full mb-4">
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white mb-8">App Updates</h3>

        <div class="text-sm font-medium dark:text-gray-400">Current Version: {{ data.currentVersion }}</div>
      </div>

      <button
        type="button"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        @click="onActionCheckForUpdates"
      >
        Check for Updates
      </button>

      <div v-if="data.updateCheckResult && !data.updateCheckResult.isUpdateAvailable" class="text-sm font-medium dark:text-gray-400">Update is not available.</div>

      <div v-if="data.updateCheckResult && data.updateCheckResult.isUpdateAvailable">
        <div class="text-sm font-medium dark:text-gray-400">Update is available.</div>

        <div class="text-sm font-medium dark:text-gray-400">Current Version: {{ data.updateCheckResult.versionInfo.version }}</div>
        <div class="text-sm font-medium dark:text-gray-400">Latest Version: {{ data.updateCheckResult.updateInfo.version }}</div>

        <div class="text-sm font-medium dark:text-gray-400">Current Release Date: {{ data.updateCheckResult.versionInfo.releaseDate }}</div>
        <div class="text-sm font-medium dark:text-gray-400">Latest Release Date: {{ data.updateCheckResult.updateInfo.releaseDate }}</div>

        <div class="text-sm font-medium dark:text-gray-400">Current Release Notes: {{ data.updateCheckResult.versionInfo.releaseNotes }}</div>
        <div class="text-sm font-medium dark:text-gray-400">Latest Release Notes: {{ data.updateCheckResult.updateInfo.releaseNotes }}</div>

        <div class="text-sm font-medium dark:text-gray-400">Current Release Date: {{ data.updateCheckResult.versionInfo.releaseDate }}</div>
        <div class="text-sm font-medium dark:text-gray-400">Latest Release Date: {{ data.updateCheckResult.updateInfo.releaseDate }}</div>

        <div class="text-sm font-medium dark:text-gray-400">Current Release SHA512: {{ data.updateCheckResult.versionInfo.sha512 }}</div>
        <div class="text-sm font-medium dark:text-gray-400">Latest Release SHA512: {{ data.updateCheckResult.updateInfo.sha512 }}</div>
      </div>
    </div>
  </div>

  <div v-if="data.progress && (isProcessingAction(processingActions.uploadingPrefixesBackup) || isProcessingAction(processingActions.uploadingCustomBackup))">
    <div class="mt-2 mb-2 text-base font-medium text-center text-green-700 dark:text-green-500">{{ data.progress.transferred }} | {{ data.progress.speed }}</div>
    <div class="w-full h-4 mb-4 bg-gray-200 rounded-full dark:bg-gray-700">
      <div class="h-4 dark:bg-green-500 text-xs font-medium text-center p-0.5 leading-none rounded-full" :style="{ width: data.progress.percentage }">
        {{ data.progress.percentage }}
      </div>
    </div>
  </div>

  <div v-if="data.progressContent" class="dark:bg-gray-700 dark:text-gray-400">
    <div class="p-4 w-full h-full max-h-[480px] overflow-auto">
      <pre v-html="data.progressContent"></pre>
    </div>
  </div>

  <div
    v-if="data.errorMessage"
    id="alert-border-2"
    class="flex w-full flex-col p-4 mb-4 text-red-800 border-t-4 border-red-300 bg-red-50 dark:text-red-400 dark:bg-gray-800 dark:border-red-800"
    role="alert"
  >
    <div class="flex w-full">
      <svg class="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
        />
      </svg>
      <div class="ms-3 text-sm font-medium">
        {{ data.errorMessage }}
      </div>
    </div>
    <ul class="space-y-1 mx-8 list-inside dark:text-red-500">
      <li v-for="error in data.errors" :key="error" class="flex items-center">
        {{ error }}
      </li>
    </ul>
  </div>

  <div
    v-if="data.processingAction"
    id="alert-border-1"
    class="flex items-center p-4 mb-4 text-blue-800 border-t-4 border-blue-300 bg-blue-50 dark:text-blue-400 dark:bg-gray-800 dark:border-blue-800"
    role="alert"
  >
    <svg class="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
      />
    </svg>
    <div class="ms-3 text-sm font-medium">
      {{ data.processingAction }}
    </div>
    <button
      type="button"
      class="ms-auto -mx-1.5 -my-1.5 bg-blue-50 text-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 p-1.5 hover:bg-blue-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
      data-dismiss-target="#alert-border-1"
      aria-label="Close"
    >
      <span class="sr-only">Dismiss</span>
      <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
      </svg>
    </button>
  </div>

  <div
    v-if="data.successMessage"
    id="alert-border-3"
    class="flex items-center p-4 mb-4 text-green-800 border-t-4 border-green-300 bg-green-50 dark:text-green-400 dark:bg-gray-800 dark:border-green-800"
    role="alert"
  >
    <svg class="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
      />
    </svg>
    <div class="ms-3 text-sm font-medium">
      {{ data.successMessage }}
    </div>
  </div>
</template>
