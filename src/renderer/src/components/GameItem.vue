<script setup>
import { computed, reactive, toRaw, watch } from 'vue';
const { webUtils } = require('electron');
import { uploadIcon, saveGameItem, uploadGameToRemote, abortGameUpload, refreshHashAndSize } from '../games.js';

const props = defineProps({
  gameItem: {
    type: Object,
    required: true,
  },
  progress: {
    type: Object,
    required: false,
  },
});

const data = reactive({
  iconPreview: null,
  iconFilePath: null,
  iconUploading: false,

  isEditing: false,
  isSaving: false,
  isUploading: false,
  isRefreshingHashAndSize: false,

  errorMessage: null,
  progressMessage: null,
  successMessage: null,
  errors: null,

  progressContent: null,
  showProgressContent: false,

  gameItem: { ...props.gameItem },
  progress: props.progress,
});

watch(
  () => props.gameItem,
  () => {
    data.gameItem = { ...props.gameItem };
  }
);
watch(
  () => props.progress,
  () => {
    data.progress = props.progress;

    if (!data.progressContent) {
      data.progressContent = '';
    }

    data.progressContent += props.progress.rawOutput;
  }
);

const currentIcon = computed(() => {
  if (data.iconPreview) {
    return data.iconPreview;
  }

  if (data.gameItem.icon) {
    return `data:image/jpg;base64,${data.gameItem.icon}`;
  }

  return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
});

const hashMatch = computed(() => {
  return data.gameItem.hash === data.gameItem.localHash && data.gameItem.localHash === data.gameItem.remoteHash;
});
const hashClass = computed(() => {
  return hashMatch.value ? 'text-gray-400' : 'text-red-500';
});

const sizeMatch = computed(() => {
  return data.gameItem.sizeInBytes === data.gameItem.localSizeInBytes && data.gameItem.localSizeInBytes === data.gameItem.remoteSizeInBytes;
});
const sizeClass = computed(() => {
  return sizeMatch.value ? 'text-gray-400' : 'text-red-500';
});

const prefixHashMatch = computed(() => {
  return data.gameItem.prefixHash === data.gameItem.localPrefixHash && data.gameItem.localPrefixHash === data.gameItem.remotePrefixHash;
});
const prefixHashClass = computed(() => {
  return prefixHashMatch.value ? 'text-gray-400' : 'text-red-500';
});

const prefixSizeMatch = computed(() => {
  return data.gameItem.prefixSizeInBytes === data.gameItem.localPrefixSizeInBytes && data.gameItem.localPrefixSizeInBytes === data.gameItem.remotePrefixSizeInBytes;
});
const prefixSizeClass = computed(() => {
  return prefixSizeMatch.value ? 'text-gray-400' : 'text-red-500';
});

function formattedSize(size) {
  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;

  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const localState = computed(() => {
  const state = [];

  if (!data.gameItem.realLocalGamePath) {
    state.push('Game not found locally at any location: probably not installed');
  }

  if (!data.gameItem.realLocalPrefixPath) {
    state.push('Prefix not found locally at any location: probably not installed');
  }

  if (data.gameItem.hash === data.gameItem.localHash) {
    state.push('Local hash matches expected DB hash: game installed');
  } else {
    state.push('Local hash does not match expected DB hash: probably not installed or not fully downloaded');
  }

  if (data.gameItem.sizeInBytes === data.gameItem.localSizeInBytes) {
    state.push('Local size matches expected DB size: game installed');
  } else {
    state.push('Local size does not match expected DB size: probably not installed or not fully downloaded');
  }

  return state;
});
const remoteState = computed(() => {
  const state = [];

  if (!data.gameItem.hash) {
    state.push('No hash found in DB: game is not uploaded to remote');
  }

  if (data.gameItem.hash && data.gameItem.hash !== data.gameItem.remoteHash) {
    state.push('Remote hash does not match expected DB hash: probably noy fully uploaded');
  }

  if (data.gameItem.sizeInBytes !== data.gameItem.remoteSizeInBytes) {
    state.push('Remote size does not match expected DB size: probably noy fully uploaded');
  }

  return state;
});

const shouldShowUploadToRemoteButton = computed(() => {
  if (data.gameItem.source === 'steam') {
    return false;
  }

  if (data.gameItem.status !== 'DRAFT' && data.gameItem.status !== 'UPLOADING') {
    return false;
  }

  if (data.isEditing || data.isSaving || data.isUploading) {
    return false;
  }

  return true;
});

console.log('GameItem props:', data.gameItem);

function iconChanged(e) {
  const file = e.target.files[0];

  console.log('Icon changed:', file);

  if (file) {
    data.iconPreview = URL.createObjectURL(file);
    data.iconFilePath = webUtils.getPathForFile(file);
  }
}

async function onUploadIcon() {
  if (!data.iconFilePath) {
    console.warn('No icon file selected for upload.');
    return;
  }

  data.iconUploading = true;
  data.errorMessage = null;
  data.successMessage = null;
  data.errors = null;
  data.progressMessage = 'Uploading icon...';

  try {
    const response = await uploadIcon(props.gameItem.steamAppId, data.iconFilePath);

    if (!response) {
      console.error('No response from uploadIcon');
      data.errorMessage = 'Something went wrong while uploading the icon.';
      return;
    }

    if (!response.success) {
      console.error('Icon upload failed:', response);
      data.errorMessage = response.message || 'Something went wrong while uploading the icon.';
      return;
    }

    data.gameItem.icon = response.icon; // Assuming the response contains the new icon data
    data.iconPreview = null;
    data.iconFilePath = null;
    data.successMessage = 'Icon uploaded successfully!';

    console.log('Icon upload status:', response);
  } catch (error) {
    console.error('Error uploading icon:', error);
    data.errorMessage = 'An error occurred while uploading the icon: ' + error.message;
  } finally {
    data.iconUploading = false;
    data.progressMessage = null;
  }
}

function onActionEdit() {
  data.isEditing = true;
  data.errorMessage = null;
  data.errors = null;
  data.successMessage = null;
  data.progressMessage = null;
}

function onActionEditCancel() {
  data.isEditing = false;

  data.gameItem = { ...props.gameItem };
}

async function onActionSave() {
  data.isEditing = false;
  data.isSaving = true;
  data.errorMessage = null;
  data.errors = null;
  data.successMessage = null;
  data.progressMessage = 'Saving to DB...';

  try {
    const rawGameItem = toRaw(data.gameItem);
    delete rawGameItem.errors;
    console.log('Raw Game Item: ', rawGameItem);

    const response = await saveGameItem(props.gameItem.steamAppId, rawGameItem);
    console.log(response);

    if (!response) {
      console.error('No response from saveGameItem');
      data.errorMessage = 'Something went wrong while saving the game item.';
      return;
    }

    if (!response.success) {
      console.error('Saving game item failed:', response);
      data.errorMessage = response.message || 'Something went wrong while saving the game item.';
      data.errors = response.errors;
      return;
    }

    data.gameItem = { ...response.gameItem };

    data.successMessage = 'Game item saved successfully!';
  } catch (error) {
    console.error('Error saving the game item:', error);
    data.errorMessage = 'An error occurred while saving the game items:' + error.message;
  } finally {
    data.isSaving = false;
    data.progressMessage = null;
  }
}

async function onActionUploadGameToRemote() {
  data.isUploading = true;
  data.errorMessage = null;
  data.progressMessage = 'Uploading game to the Remote...';
  data.successMessage = null;
  data.errors = null;
  data.progress = null;
  data.progressContent = null;

  const rawGameItem = toRaw(data.gameItem);
  delete rawGameItem.errors;
  console.log('Raw Game Item: ', rawGameItem);

  const response = await uploadGameToRemote(props.gameItem.steamAppId, rawGameItem);
  console.log(response);

  data.isUploading = false;
  data.progressMessage = null;
  data.progress = null;

  if (!response) {
    data.errorMessage = 'Something went wrong while uploading the game to the remote.';
    return;
  }

  if (!response.success) {
    data.errorMessage = response.message || 'Something went wrong while uploading the game to the remote.';
    return;
  }

  data.gameItem = { ...response.gameItem };

  data.successMessage = 'Game uploaded successfully!';
}

async function onActionCancelUploadGameToRemote() {
  const response = await abortGameUpload(props.gameItem.steamAppId);

  if (!response) {
    data.errorMessage = 'Something went wrong while canceling the upload.';
    return;
  }

  if (!response.success) {
    data.errorMessage = response.message || 'Something went wrong while canceling the upload.';
    return;
  }
}

async function onActionRefreshHashAndSize() {
  data.isRefreshingHashAndSize = true;
  data.errorMessage = null;
  data.progressMessage = 'Refreshing hash and size...';
  data.successMessage = null;
  data.errors = null;

  const rawGameItem = toRaw(data.gameItem);
  delete rawGameItem.errors;

  try {
    const response = await refreshHashAndSize(props.gameItem.steamAppId, rawGameItem);

    console.log('Refresh Hash and Size Response:', response);

    data.isRefreshingHashAndSize = false;

    if (!response) {
      data.errorMessage = 'Something went wrong while refreshing the hash and size.';
      return;
    }

    if (!response.success) {
      data.errorMessage = response.message || 'Something went wrong while refreshing the hash and size.';
      return;
    }

    data.gameItem = { ...response.gameItem };
    data.successMessage = 'Hash and size refreshed successfully!';
  } catch (error) {
    console.error('Error refreshing hash and size:', error);
    data.errorMessage = 'An error occurred while refreshing the hash and size: ' + error.message;
  } finally {
    data.progressMessage = null;
    data.isRefreshingHashAndSize = false;
  }
}

// const emit = defineEmits(['openGame', 'deleteGame', 'editGame']);
// const game = ref(props.game);
</script>

<template>
  <div class="w-full flex flex-col mt-4 items-start justify-between border rounded-lg shadow-sm md:flex-row dark:border-gray-700 dark:bg-gray-800">
    <div class="w-48">
      <div class="relative w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg">
        <img class="object-cover w-full" :src="currentIcon" alt="" />

        <label v-if="data.gameItem.source == 'db'" :for="`icon-input-file-${data.gameItem.steamAppId}`" class="absolute top-0 left-0 right-0 bottom-0 block cursor-pointer">
          <svg
            class="stroke-gray-300 absolute block lef-0 right-0 m-auto top-0 bottom-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="0.4"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>

          <input :id="`icon-input-file-${data.gameItem.steamAppId}`" hidden class="" type="file" @change="iconChanged" />

          <button
            v-if="data.iconPreview"
            :disabled="data.progressMessage"
            :class="data.progressMessage ? 'disabled cursor-not-allowed' : ''"
            type="button"
            class="absolute m-auto left-0 right-0 bottom-0 block w-24 block text-white bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            @click="onUploadIcon"
          >
            Upload
          </button>
        </label>
      </div>

      <div class="mt-4">
        <button
          v-if="!data.isEditing && !data.isSaving"
          type="button"
          class="text-white w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionEdit"
        >
          Edit
        </button>

        <button
          v-if="data.gameItem.source === 'db'"
          type="button"
          class="text-white w-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 hover:bg-gradient-to-br dark:focus:ring-teal-800 shadow-lg dark:shadow-lg dark:shadow-teal-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          :disabled="data.isRefreshingHashAndSize"
          @click="onActionRefreshHashAndSize"
        >
          {{ data.isRefreshingHashAndSize ? 'Refreshing...' : 'Refresh Hash and Size' }}
        </button>

        <button
          v-if="shouldShowUploadToRemoteButton"
          type="button"
          class="text-white w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-600 hover:bg-gradient-to-br dark:focus:ring-cyan-800 shadow-lg dark:shadow-lg dark:shadow-cyan-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          @click="onActionUploadGameToRemote"
        >
          Upload Game To Remote
        </button>

        <button
          v-if="data.isUploading"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-cyan-800 shadow-lg dark:shadow-lg dark:shadow-cyan-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          @click="onActionCancelUploadGameToRemote"
        >
          Cancel Game Upload
        </button>

        <div v-if="data.isUploading && data.progress">
          <div class="mt-2 mb-2 text-base font-medium text-center text-green-700 dark:text-green-500">{{ data.progress.transferred }} | {{ data.progress.speed }}</div>
          <div class="w-full h-4 mb-4 bg-gray-200 rounded-full dark:bg-gray-700">
            <div class="h-4 dark:bg-green-500 text-xs font-medium text-center p-0.5 leading-none rounded-full" :style="{ width: data.progress.percentage }">
              {{ data.progress.percentage }}
            </div>
          </div>
        </div>

        <button
          v-if="data.progressContent"
          type="button"
          class="text-white w-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-bl dark:focus:ring-pink-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          @click="data.showProgressContent = !data.showProgressContent"
        >
          {{ data.showProgressContent ? 'Hide Progress' : 'Show Progress' }}
        </button>

        <button
          v-if="data.isSaving"
          disabled
          type="button"
          class="text-white w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
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
          Saving...
        </button>

        <button
          v-if="data.isEditing"
          type="button"
          class="text-white w-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br dark:focus:ring-green-800 shadow-lg shadow-green-500/50 dark:shadow-lg dark:shadow-green-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionSave"
        >
          Save to DB
        </button>

        <button
          v-if="data.isEditing"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-red-800 shadow-lg shadow-red-500/50 dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionEditCancel"
        >
          Cancel and Reset
        </button>
      </div>
    </div>

    <div class="flex flex-col justify-between p-4 leading-normal flex-grow relative">
      <div v-if="data.showProgressContent && data.progressContent" class="absolute top-2 left-2 right-2 bottom-2 dark:bg-gray-700 dark:text-gray-400">
        <div class="p-4 w-full h-full overflow-auto">
          <pre v-html="data.progressContent"></pre>
        </div>
      </div>

      <div class="grid gap-6 grid-cols-[20fr_80fr] mb-2">
        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Title:</span>
        <input
          v-model="data.gameItem.steamTitle"
          type="text"
          class="border text-sm rounded-lg w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />
      </div>

      <div class="grid gap-6 grid-cols-3">
        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Steam App Id: <span class="font-normal dark:text-gray-400">{{ data.gameItem.steamAppId }}</span></span
        >

        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Source: <span class="font-normal dark:text-gray-400">{{ data.gameItem.source }}</span></span
        >

        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Status: <span class="font-normal dark:text-gray-400">{{ data.gameItem.status }}</span></span
        >
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <!-- <span class="text-l font-bold tracking-tight dark:text-white">Local State:</span>
        <ul class="w-full space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
          <li v-for="state in localState" :key="state">{{ state }}</li>
        </ul>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote State:</span>
        <ul class="w-full space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
          <li v-for="state in remoteState" :key="state">{{ state }}</li>
        </ul> -->

        <span class="text-l font-bold tracking-tight dark:text-white">Errors</span>
        <ul class="space-y-1 text-gray-500 list-inside dark:text-red-500">
          <li v-for="error in data.gameItem.errors" :key="error.message" class="flex items-center">
            <svg class="shrink-0 inline w-4 h-4 me-3 mt-[2px]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
              />
            </svg>
            {{ error.message }}
          </li>
        </ul>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_30fr_20fr_30fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">DB Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.hash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">DB Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.sizeInBytes }} ({{ formattedSize(data.gameItem.sizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.localHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.localSizeInBytes }} ({{ formattedSize(data.gameItem.localSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.remoteHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.remoteSizeInBytes }} ({{ formattedSize(data.gameItem.remoteSizeInBytes) }})</span>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_30fr_20fr_30fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">DB Prefix Hash (Initial):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.prefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">DB Prefix Size (Initial):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.prefixSizeInBytes }} ({{ formattedSize(data.gameItem.prefixSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Hash (Current):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.localPrefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Size (Current):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.localPrefixSizeInBytes }} ({{ formattedSize(data.gameItem.localPrefixSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Hash (Initial):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.remotePrefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Size (Initial):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.remotePrefixSizeInBytes }} ({{ formattedSize(data.gameItem.remotePrefixSizeInBytes) }})</span>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Exe Target:</span>
        <input
          v-model="data.gameItem.steamExeTarget"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Start Dir:</span>
        <input
          v-model="data.gameItem.steamStartDir"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Launch Args:</span>
        <input
          v-model="data.gameItem.steamLaunchArgs"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Launcher:</span>
        <ul class="items-center w-full text-sm font-medium border rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <li class="w-full border-b dark:border-gray-600">
            <div class="flex items-center ps-3">
              <input
                :id="`launcher-noop-${data.gameItem.steamAppId}`"
                v-model="data.gameItem.launcher"
                value="NOOP"
                type="radio"
                :name="`launcher-${data.gameItem.steamAppId}`"
                :disabled="!data.isEditing"
                class="w-4 h-4 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 dark:bg-gray-600 dark:border-gray-500"
              />
              <label :for="`launcher-noop-${data.gameItem.steamAppId}`" class="w-full py-3 ms-2 text-sm font-medium0 dark:text-gray-300">NOOP</label>
            </div>
          </li>
          <li class="w-full border-b dark:border-gray-600">
            <div class="flex items-center ps-3">
              <input
                :id="`launcher-port-proton-${data.gameItem.steamAppId}`"
                v-model="data.gameItem.launcher"
                value="PORT_PROTON"
                type="radio"
                :name="`launcher-${data.gameItem.steamAppId}`"
                :disabled="!data.isEditing"
                class="w-4 h-4 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 dark:bg-gray-600 dark:border-gray-500"
              />
              <label :for="`launcher-port-proton-${data.gameItem.steamAppId}`" class="w-full py-3 ms-2 text-sm font-medium dark:text-gray-300">PORT_PROTON</label>
            </div>
          </li>
          <li class="w-full border-b dark:border-gray-600">
            <div class="flex items-center ps-3">
              <input
                :id="`launcher-ps2-${data.gameItem.steamAppId}`"
                v-model="data.gameItem.launcher"
                value="PS2"
                type="radio"
                :name="`launcher-${data.gameItem.steamAppId}`"
                :disabled="!data.isEditing"
                class="w-4 h-4 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 dark:bg-gray-600 dark:border-gray-500"
              />
              <label :for="`launcher-ps2-${data.gameItem.steamAppId}`" class="w-full py-3 ms-2 text-sm font-medium dark:text-gray-300">PS2</label>
            </div>
          </li>
          <li class="w-full dark:border-gray-600">
            <div class="flex items-center ps-3">
              <input
                :id="`launcher-ps3-${data.gameItem.steamAppId}`"
                v-model="data.gameItem.launcher"
                value="PS3"
                type="radio"
                :name="`launcher-${data.gameItem.steamAppId}`"
                :disabled="!data.isEditing"
                class="w-4 h-4 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 dark:bg-gray-600 dark:border-gray-500"
              />
              <label :for="`launcher-ps3-${data.gameItem.steamAppId}`" class="w-full py-3 ms-2 text-sm font-medium dark:text-gray-300">PS3</label>
            </div>
          </li>
        </ul>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Real Local Game Path:</span>
        <span v-if="data.gameItem.source === 'db'" class="font-normal py-2.5 text-gray-400">{{ data.gameItem.realLocalGamePath }}</span>
        <input
          v-if="data.gameItem.source === 'steam'"
          v-model="data.gameItem.realLocalGamePath"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Real Local Prefix Path:</span>
        <span class="font-normal py-2.5 text-gray-400">{{ data.gameItem.realLocalPrefixPath }}</span>

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Remote Location:</span>
        <input
          v-model="data.gameItem.remoteLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Local Location:</span>
        <input
          v-model="data.gameItem.localLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Prefix Location:</span>
        <input
          v-model="data.gameItem.prefixLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />
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
    v-if="data.progressMessage"
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
      {{ data.progressMessage }}
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
