<script setup>
import { reactive, toRaw, watch } from 'vue';
import { getDeckyThemes, updateDeckyTheme, installDeckyTheme } from '../decky.js';

const processingActions = {
  gettingDeckyThemes: 'Getting Decky themes...',
  updatingDeckyTheme: 'Updating Decky theme...',
  installingDeckyTheme: 'Installing Decky theme...',
};

const data = reactive({
  currentDeckyThemes: [],

  processingAction: null,

  errorMessage: null,
  progressMessage: null,
  successMessage: null,
  errors: null,
});

function isProcessingAction(action) {
  return data.processingAction === action;
}

function activateProcessingAction(action) {
  data.processingAction = action;

  data.errorMessage = null;
  data.successMessage = null;
  data.errors = null;
}

async function onActionGetCurrentDeckyThemes() {
  activateProcessingAction(processingActions.gettingDeckyThemes);

  try {
    const response = await getDeckyThemes();

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    data.currentDeckyThemes = response.themes;
    data.successMessage = 'Got Decky themes';
  } catch (error) {
    console.error('Error getting Decky themes:', error);
    data.errorMessage = 'An error occurred while getting the Decky themes: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionInstallDeckyTheme(theme) {
  activateProcessingAction(processingActions.installingDeckyTheme);
  try {
    const rawTheme = toRaw(theme);
    const response = await installDeckyTheme(rawTheme);

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    // find the theme in the currentDeckyThemes array
    const themeIndex = data.currentDeckyThemes.findIndex((t) => t.repoUrl === theme.repoUrl && t.repoFolder === theme.repoFolder);
    if (themeIndex !== -1) {
      data.currentDeckyThemes[themeIndex] = response.theme;
    }
    data.successMessage = 'Installed Decky theme';
  } catch (error) {
    console.error('Error installing Decky theme:', error);
    data.errorMessage = 'An error occurred while installing the Decky theme: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionUpdateDeckyTheme(theme) {
  activateProcessingAction(processingActions.installingDeckyTheme);
  try {
    const rawTheme = toRaw(theme);
    const response = await updateDeckyTheme(rawTheme);

    if (response.status !== 'success') {
      data.errorMessage = response.error.message;
      return;
    }

    // find the theme in the currentDeckyThemes array
    const themeIndex = data.currentDeckyThemes.findIndex((t) => t.repoUrl === theme.repoUrl && t.repoFolder === theme.repoFolder);
    if (themeIndex !== -1) {
      data.currentDeckyThemes[themeIndex] = response.theme;
    }
    data.successMessage = 'Updated Decky theme';
  } catch (error) {
    console.error('Error updating Decky theme:', error);
    data.errorMessage = 'An error occurred while updating the Decky theme: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

onActionGetCurrentDeckyThemes();
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full p-4">
    <div class="flex items-center justify-between w-full mb-4">
      <h2 class="block w-full text-3xl font-bold dark:text-white">
        <span class="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Decky</span>
      </h2>
    </div>

    <div class="flex flex-col items-start justify-start w-full mb-8">
      <div class="flex items-center justify-between w-full mb-4">
        <h3 class="block mb-2 flex-grow text-2xl font-medium dark:text-white">CSS Themes</h3>
      </div>

      <div v-if="data.currentDeckyThemes" class="dark:text-white w-full">
        <div v-for="(theme, index) in data.currentDeckyThemes" :key="index" class="grid gap-6 mb-6 grid-cols-[20fr_80fr]">
          <div>Repo URL</div>
          <div>{{ theme.repoUrl }}</div>
          <div>Repo Folder</div>
          <div>{{ theme.repoFolder }}</div>
          <div>Path</div>
          <div>{{ theme.fullPath }}</div>
          <div>Name</div>
          <div>{{ theme.name }}</div>
          <div>Version</div>
          <div>{{ theme.version }}</div>
          <div>Author</div>
          <div>{{ theme.author }}</div>
          <div>Description</div>
          <div>{{ theme.description }}</div>
          <div>Actions</div>
          <div>
            <button v-if="theme.name" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" @click="onActionUpdateDeckyTheme(theme)">Update</button>
            <button v-else class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" @click="onActionInstallDeckyTheme(theme)">Install</button>
          </div>
        </div>
      </div>
      <div v-if="!data.currentDeckyThemes || data.currentDeckyThemes.length === 0" class="dark:text-white w-full">No Decky themes found. Update the Config to add themes.</div>
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
