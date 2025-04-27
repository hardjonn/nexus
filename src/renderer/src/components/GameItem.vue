<script setup>
import { computed, reactive } from 'vue';
const { webUtils } = require('electron');
import { uploadIcon } from '../games.js';

const props = defineProps({
  gameItem: {
    type: Object,
    required: true,
  },
});

const data = reactive({
  iconPreview: null,
  iconFilePath: null,
  iconUploading: false,

  isEditing: false,

  errorMessage: null,
  progressMessage: null,
  successMessage: null,

  gameItem: props.gameItem,
});

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
const formatSize = computed(() => {
  if (data.gameItem.sizeInBytes < 1024) return `${data.gameItem.sizeInBytes} B`;

  if (data.gameItem.sizeInBytes < 1024 * 1024) return `${(data.gameItem.sizeInBytes / 1024).toFixed(2)} KB`;

  if (data.gameItem.sizeInBytes < 1024 * 1024 * 1024) return `${(data.gameItem.sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;

  return `${(data.gameItem.sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
    data.errorMessage = 'An error occurred while uploading the icon:' + error.message;
  } finally {
    data.iconUploading = false;
    data.progressMessage = null;
  }
}

// const emit = defineEmits(['openGame', 'deleteGame', 'editGame']);
// const game = ref(props.game);
</script>

<template>
  <div class="w-full flex flex-col mt-4 items-start justify-between border rounded-lg shadow-sm md:flex-row dark:border-gray-700 dark:bg-gray-800">
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

    <div class="flex flex-col justify-between p-4 leading-normal flex-grow">
      <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
        >Steam Title: <span class="font-normal text-gray-700 dark:text-gray-400">{{ data.gameItem.steamTitle }}</span></span
      >

      <div class="grid gap-6 grid-cols-3">
        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Steam App Id: <span class="font-normal text-gray-700 dark:text-gray-400">{{ data.gameItem.steamAppId }}</span></span
        >

        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Source: <span class="font-normal text-gray-700 dark:text-gray-400">{{ data.gameItem.source }}</span></span
        >

        <span class="mb-2 text-l font-bold tracking-tight dark:text-white"
          >Status: <span class="font-normal text-gray-700 dark:text-gray-400">{{ data.gameItem.status }}</span></span
        >
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[13fr_37fr_13fr_37fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">DB Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.hash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">DB Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.sizeInBytes }} ({{ formatSize }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.localHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.localSizeInBytes }} ({{ formatSize }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.remoteHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.remoteSizeInBytes }} ({{ formatSize }})</span>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">Steam Exe Target:</span>
        <input
          v-model="data.gameItem.steamExeTarget"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight dark:text-white">Steam Start Dir:</span>
        <input
          v-model="data.gameItem.steamStartDir"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight dark:text-white">Steam Launch Args:</span>
        <input
          v-model="data.gameItem.steamLaunchArgs"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight dark:text-white">Launcher:</span>
        <ul class="items-center w-full text-sm font-medium border rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <li class="w-full border-b dark:border-gray-600">
            <div class="flex items-center ps-3">
              <input
                :id="`launcher-noop-${data.gameItem.steamAppId}`"
                v-model="data.gameItem.launcher"
                value="NOOP"
                type="radio"
                name="launcher"
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
                name="launcher"
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
                name="launcher"
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
                name="launcher"
                :disabled="!data.isEditing"
                class="w-4 h-4 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 dark:bg-gray-600 dark:border-gray-500"
              />
              <label :for="`launcher-ps3-${data.gameItem.steamAppId}`" class="w-full py-3 ms-2 text-sm font-medium dark:text-gray-300">PS3</label>
            </div>
          </li>
        </ul>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">Real Local Full Path:</span>
        <span class="font-normal text-gray-400">{{ data.gameItem.realLocalPath }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">NAS Location:</span>
        <input
          v-model="data.gameItem.nasLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight dark:text-white">Client Location:</span>
        <input
          v-model="data.gameItem.clientLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />

        <span class="text-l font-bold tracking-tight dark:text-white">Prefix Location:</span>
        <input
          v-model="data.gameItem.prefixLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!data.isEditing"
        />
      </div>
    </div>

    <div class="flex flex-col justify-between p-4 w-s">Actions</div>
  </div>

  <div
    v-if="data.errorMessage"
    id="alert-border-2"
    class="flex w-full items-center p-4 mb-4 text-red-800 border-t-4 border-red-300 bg-red-50 dark:text-red-400 dark:bg-gray-800 dark:border-red-800"
    role="alert"
  >
    <svg class="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"
      />
    </svg>
    <div class="ms-3 text-sm font-medium">
      {{ data.errorMessage }}
    </div>
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
