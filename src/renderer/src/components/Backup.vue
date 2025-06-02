<script setup>
import { reactive, computed, watch, toRaw } from 'vue';
import { store } from './../store.js';
import { progress } from '../progress.js';
import { uploadPrefixesBackup, abortPrefixesBackupUpload, abortCustomBackupUpload, uploadCustomBackup, uploadAllCustomBackups } from './../backup.js';

const processingActions = {
  uploadingPrefixesBackup: 'Uploading prefixes backup...',
  abortingPrefixesBackupUpload: 'Aborting prefixes backup upload...',

  uploadingCustomBackup: 'Uploading custom backup...',
  abortingCustomBackupUpload: 'Aborting custom backup upload...',
};

const data = reactive({
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

async function onActionUploadPrefixesBackup() {
  activateProcessingAction(processingActions.uploadingPrefixesBackup);

  try {
    const response = await uploadPrefixesBackup();

    if (!response) {
      console.error('No response from uploadPrefixesBackup');
      data.errorMessage = 'Something went wrong while uploading the prefixes backup.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Prefixes backup upload failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while uploading the prefixes backup.';
      return;
    }

    data.successMessage = 'Prefixes backup uploaded successfully!';
  } catch (error) {
    console.error('Error uploading prefixes backup:', error);
    data.errorMessage = 'An error occurred while uploading the prefixes backup: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionBackupAllCustomLocations() {
  activateProcessingAction(processingActions.uploadingCustomBackup);

  try {
    const response = await uploadAllCustomBackups();

    if (!response) {
      console.error('No response from uploadAllCustomBackups');
      data.errorMessage = 'Something went wrong while uploading all custom backups.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Custom backup upload failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while uploading all custom backups.';
      return;
    }

    data.successMessage = 'All custom backups uploaded successfully!';
  } catch (error) {
    console.error('Error uploading all custom backups:', error);
    data.errorMessage = 'An error occurred while uploading all custom backups: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionBackupCustomLocation(location) {
  activateProcessingAction(processingActions.uploadingCustomBackup);

  const rawLocation = toRaw(location);

  try {
    const response = await uploadCustomBackup(rawLocation);

    if (!response) {
      console.error('No response from uploadCustomBackup');
      data.errorMessage = 'Something went wrong while uploading the custom backup.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Custom backup upload failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while uploading the custom backup.';
      return;
    }

    data.successMessage = 'Custom backup uploaded successfully!';
  } catch (error) {
    console.error('Error uploading custom backup:', error);
    data.errorMessage = 'An error occurred while uploading the custom backup: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionAbortPrefixesBackupUpload() {
  activateProcessingAction(processingActions.abortingPrefixesBackupUpload);

  try {
    const response = await abortPrefixesBackupUpload();

    if (!response) {
      console.error('No response from abortPrefixesBackupUpload');
      data.errorMessage = 'Something went wrong while aborting the prefixes backup upload.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Prefixes backup upload aborted failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while aborting the prefixes backup upload.';
      return;
    }

    data.successMessage = 'Prefixes backup upload aborted successfully!';
  } catch (error) {
    console.error('Error aborting prefixes backup upload:', error);
    data.errorMessage = 'An error occurred while aborting the prefixes backup upload: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionAbortCustomBackupUpload() {
  activateProcessingAction(processingActions.abortingCustomBackupUpload);

  try {
    const response = await abortCustomBackupUpload();

    if (!response) {
      console.error('No response from abortCustomBackupUpload');
      data.errorMessage = 'Something went wrong while aborting the custom backup upload.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Custom backup upload aborted failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while aborting the custom backup upload.';
      return;
    }

    data.successMessage = 'Custom backup upload aborted successfully!';
  } catch (error) {
    console.error('Error aborting custom backup upload:', error);
    data.errorMessage = 'An error occurred while aborting the custom backup upload: ' + error.message;
  } finally {
    data.processingAction = null;
  }
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

const fullRemotePath = computed(() => {
  return `${store.remote_lib.prefixes_path}/${store.steam.user_name}`;
});

const customBackupFullRemotePath = computed(() => {
  return `${store.backup.remote_location}/${store.steam.user_name}`;
});
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full p-4">
    <div class="flex items-center justify-between w-full mb-4">
      <h2 class="block w-full text-3xl font-bold dark:text-white">
        <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Backup</span>
      </h2>
    </div>

    <div class="flex flex-col items-start justify-start w-full mb-8">
      <div class="flex items-center justify-between w-full mb-4">
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white mb-8">Backup local prefixes to Nexus</h3>
        <div class="w-64">
          <button
            v-if="!data.processingAction"
            type="button"
            class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            @click="onActionUploadPrefixesBackup"
          >
            Backup Prefixes
          </button>

          <button
            v-if="isProcessingAction(processingActions.uploadingPrefixesBackup)"
            type="button"
            class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            :disabled="isProcessingAction(processingActions.abortingPrefixesBackupUpload)"
            @click="onActionAbortPrefixesBackupUpload"
          >
            {{ isProcessingAction(processingActions.abortingPrefixesBackupUpload) ? 'Canceling...' : 'Cancel Prefixes Backup' }}
          </button>
        </div>
      </div>

      <div class="grid gap-6 mb-6 grid-cols-[30fr_70fr] dark:text-white">
        <div class="font-bold">Current steam user:</div>
        <div class="p-2.5 dark:bg-gray-700 dark:text-white">{{ store.steam.user_name }}</div>

        <div class="font-bold">Remote Prefixes Location:</div>
        <div class="p-2.5 dark:bg-gray-700 dark:text-white">{{ store.remote_lib.prefixes_path }}</div>

        <div class="font-bold">Full Remote Path:</div>
        <div class="p-2.5 dark:bg-gray-700 dark:text-white">{{ fullRemotePath }}</div>

        <div class="font-bold">Full Local Path</div>
        <div class="p-2.5 dark:bg-gray-700 dark:text-white">{{ store.local_lib.prefixes_path }}</div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between w-full mb-4">
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white mb-8">Backup Custom Locations</h3>

        <div class="w-64">
          <button
            v-if="!data.processingAction"
            type="button"
            class="text-white h-full w-60 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            @click="onActionBackupAllCustomLocations()"
          >
            Backup All Custom Locations
          </button>

          <button
            v-if="isProcessingAction(processingActions.uploadingCustomBackup)"
            type="button"
            class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            :disabled="isProcessingAction(processingActions.abortingCustomBackupUpload)"
            @click="onActionAbortCustomBackupUpload"
          >
            {{ isProcessingAction(processingActions.abortingCustomBackupUpload) ? 'Canceling...' : 'Cancel Custom Backup' }}
          </button>
        </div>
      </div>

      <div class="mb-8">
        <span class="font-bold py-2.5 dark:text-white mr-4">Remote Backup Location:</span>
        <span class="p-2.5 dark:bg-gray-700 dark:text-white">{{ customBackupFullRemotePath }}</span>
      </div>

      <h4 class="block mb-2 flex-grow text-xl font-medium dark:text-white mb-8">Custom Backup Locations</h4>

      <div v-for="(backupLocation, index) in store.backup.local_locations" :key="index" class="grid gap-6 mb-6 grid-cols-[5fr_25fr_5fr_25fr_5fr_25fr_10fr]">
        <span class="font-bold py-2.5 dark:text-white">Path:</span>
        <span class="block w-full p-2.5 dark:bg-gray-700 dark:text-white">{{ store.backup.local_locations[index].path }}</span>

        <span class="font-bold py-2.5 dark:text-white">Exclude:</span>
        <span class="block w-full p-2.5 dark:bg-gray-700 dark:text-white">{{ store.backup.local_locations[index].exclude }}</span>

        <span class="font-bold py-2.5 dark:text-white">Extra:</span>
        <span class="block w-full p-2.5 dark:bg-gray-700 dark:text-white">{{ store.backup.local_locations[index].extra }}</span>

        <div>
          <button
            v-if="!data.processingAction"
            type="button"
            class="text-white h-full w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            @click="onActionBackupCustomLocation(store.backup.local_locations[index])"
          >
            Backup
          </button>
        </div>
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
