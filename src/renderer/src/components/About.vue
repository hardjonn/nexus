<script setup>
import { reactive, computed, watch } from 'vue';
import { error } from '../error.js';
import { progress } from '../progress.js';
import { getCurrentVersion, checkForUpdates, downloadUpdate, installUpdate } from '../update.js';
import { addDesktopEntry } from '../integration.js';

const processingActions = {
  gettingCurrentVersion: 'Getting current version...',
  checkingForUpdates: 'Checking for updates...',
  downloadingUpdate: 'Downloading update...',
  installingUpdate: 'Installing update...',
  integrating: 'Integrating...',
};

const data = reactive({
  currentVersion: null,
  updateCheckResult: null,
  downloadedFiles: null,

  processingAction: null,

  errorMessage: null,
  progressMessage: null,
  successMessage: null,
  errors: null,

  progressContent: null,
  progress: null,

  desktopEntryContent: null,
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
  data.desktopEntryContent = null;
}

watch(
  () => progress.downloadUpdate,
  () => {
    data.progress = progress.downloadUpdate;
  }
);

watch(
  () => error.installUpdate,
  () => {
    console.log('error.installUpdate:', error.installUpdate);
    data.errorMessage = error.installUpdate;
    data.errors = [error.installUpdate.error];
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

    // check for updated after we got the current version
    onActionCheckForUpdates();
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

async function onActionDownloadUpdate() {
  activateProcessingAction(processingActions.downloadingUpdate);

  try {
    const response = await downloadUpdate();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.downloadedFiles = response.downloadedFiles;
    data.successMessage = 'Downloaded update';
  } catch (error) {
    console.error('Error downloading update:', error);
    data.errorMessage = 'An error occurred while downloading the update: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionInstallUpdate() {
  activateProcessingAction(processingActions.installingUpdate);

  try {
    const response = await installUpdate();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.successMessage = null;
  } catch (error) {
    console.error('Error installing update:', error);
    data.errorMessage = 'An error occurred while installing the update: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionAddDesktopEntry() {
  activateProcessingAction(processingActions.integrating);

  try {
    const response = await addDesktopEntry();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.successMessage = 'Desktop entry added/updated';
    data.desktopEntryContent = response.desktopEntryContent;
  } catch (error) {
    console.error('Error integrating:', error);
    data.errorMessage = 'An error occurred while integrating: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

const isUpdateAvailable = computed(() => {
  return data.updateCheckResult && data.updateCheckResult.isUpdateAvailable;
});

const isReadyToInstall = computed(() => {
  return data.downloadedFiles && data.downloadedFiles.length > 0;
});

function downloadSpeed(bytesPerSecond) {
  if (!bytesPerSecond) {
    return null;
  }

  // convert bytes per second to Mb/s or Kb/s
  if (bytesPerSecond >= 1024 * 1024) {
    return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' Mb/s';
  }

  return (bytesPerSecond / 1024).toFixed(2) + ' Kb/s';
}

function formattedSize(size, base) {
  let baseLiteralIndex = 0;
  const sizeLiterals = ['B', 'KB', 'MB', 'GB', 'TB'];

  if (base === 'KB') {
    baseLiteralIndex = 1;
  }

  if (size < 1024) return `${size} ${sizeLiterals[baseLiteralIndex]}`;

  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} ${sizeLiterals[baseLiteralIndex + 1]}`;

  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} ${sizeLiterals[baseLiteralIndex + 2]}`;

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} ${sizeLiterals[baseLiteralIndex + 3]}`;
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
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white">App Updates</h3>

        <div class="text-lg font-medium dark:text-gray-400">Current Version: {{ data.currentVersion }}</div>
      </div>

      <div v-if="!isUpdateAvailable" class="text-lg font-medium dark:text-gray-400 mb-8">Update is not available.</div>
      <div v-if="isUpdateAvailable" class="text-lg font-medium dark:text-gray-400 mb-8">Update is available.</div>

      <div v-if="isUpdateAvailable" class="grid gap-6 mb-6 grid-cols-[20fr_40fr_40fr] dark:text-white w-full">
        <div class="col-start-2 col-end-2">Current Release</div>
        <div class="col-start-3">New Release</div>

        <div class="font-bold">Version:</div>
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.versionInfo.version" />
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.updateInfo.version" />

        <div class="font-bold">Release Date:</div>
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.versionInfo.releaseDate" />
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.updateInfo.releaseDate" />

        <div class="font-bold">Release Name:</div>
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.versionInfo.releaseName" />
        <input class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.updateInfo.releaseName" />

        <div class="font-bold">SHA512:</div>
        <textarea class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.versionInfo.sha512" />
        <textarea class="p-2.5 dark:bg-gray-700 dark:text-white" readonly :value="data.updateCheckResult.updateInfo.sha512" />

        <div class="font-bold">Release Notes:</div>
        <p class="p-2.5 dark:bg-gray-700 dark:text-white" v-html="data.updateCheckResult.versionInfo.releaseNotes" />
        <p class="p-2.5 dark:bg-gray-700 dark:text-white" v-html="data.updateCheckResult.updateInfo.releaseNotes" />

        <div v-if="data.progress && isProcessingAction(processingActions.downloadingUpdate)" class="col-span-3">
          <div class="mt-2 mb-2 text-base font-medium text-center text-green-700 dark:text-green-500">
            {{ formattedSize(data.progress.transferred, 'B') }} of {{ formattedSize(data.progress.total, 'B') }} | {{ downloadSpeed(data.progress.bytesPerSecond) }}
          </div>
          <div class="w-full h-4 mb-4 bg-gray-200 rounded-full dark:bg-gray-700">
            <div class="h-4 dark:bg-green-500 text-xs font-medium text-center p-0.5 leading-none rounded-full" :style="{ width: data.progress.percent }">
              {{ data.progress.percent.toFixed(2) }}%
            </div>
          </div>
        </div>

        <div v-if="data.downloadedFiles" class="font-bold">Downloaded Files</div>
        <div v-if="data.downloadedFiles" class="col-span-2">
          <ul class="space-y-1 text-gray-500 list-inside dark:text-gray-400">
            <li v-for="file of data.downloadedFiles" :key="file" class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 mr-4">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m9 13.5 3 3m0 0 3-3m-3 3v-6m1.06-4.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>

              {{ file }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end w-full">
      <button
        v-if="!isUpdateAvailable"
        type="button"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        :disabled="data.processingAction"
        @click="onActionCheckForUpdates"
      >
        {{ isProcessingAction(processingActions.checkingForUpdates) ? 'Checking for updates...' : 'Check for Updates' }}
      </button>

      <button
        v-if="isUpdateAvailable && !isReadyToInstall"
        type="button"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        :disabled="data.processingAction"
        @click="onActionDownloadUpdate"
      >
        {{ isProcessingAction(processingActions.downloadingUpdate) ? 'Downloading update...' : 'Download Update' }}
      </button>

      <button
        v-if="isUpdateAvailable && isReadyToInstall"
        type="button"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        :disabled="data.processingAction"
        @click="onActionInstallUpdate"
      >
        Quit and Install
      </button>
    </div>

    <div class="flex flex-col items-start justify-start w-full mb-8">
      <div class="flex items-center justify-between w-full mt-8">
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white">Integration</h3>
      </div>

      <div v-if="data.desktopEntryContent" class="flex items-center justify-start w-full mt-8">
        <textarea class="p-2.5 dark:bg-gray-700 dark:text-white w-full h-70" readonly :value="data.desktopEntryContent" />
      </div>

      <div class="flex items-center justify-start w-full mt-8">
        <button
          type="button"
          class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          :disabled="data.processingAction"
          @click="onActionAddDesktopEntry"
        >
          Add/Update Desktop Entry
        </button>
      </div>
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
