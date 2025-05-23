<script setup>
import { computed, reactive, toRaw, watch, ref } from 'vue';
const { webUtils } = require('electron');
import { uploadIcon, saveGameItem, uploadGameToRemote, abortGameUpload, refreshHashAndSize, deleteGameFromLocal, requestDownloadDetails } from '../games.js';

const processingActions = {
  uploadingIcon: 'Uploading icon...',
  editingGameItem: 'Editing game item... Make changes and save',
  savingGameItem: 'Saving game item...',
  uploadingGameToRemote: 'Uploading game to remote...',
  abortingGameUpload: 'Aborting game upload...',
  refreshingHashAndSize: 'Refreshing hash and size...',
  initGameDeletion: 'Initiating game deletion...',
  deletingGameFromLocal: 'Deleting game from local...',
  initGameDownload: 'Initiating game download...',
  downloadingGameFromRemote: 'Downloading game from remote...',
  requestingDownloadDetails: 'Requesting download details...',
};

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

const emit = defineEmits(['update-game-item']);

const data = reactive({
  processingAction: null,

  iconPreview: null,
  iconFilePath: null,

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

  deletePrefix: false,
  availablePrefixes: [],

  gameItem: { ...props.gameItem },
  progress: props.progress,
});

const prefixSelected = ref('NONE');

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
  return data.gameItem.gameHash === data.gameItem.localGameHash && data.gameItem.localGameHash === data.gameItem.remoteGameHash;
});
const hashClass = computed(() => {
  return hashMatch.value ? 'text-gray-400' : 'text-red-500';
});

const sizeMatch = computed(() => {
  return data.gameItem.gameSizeInBytes === data.gameItem.localGameSizeInBytes && data.gameItem.localGameSizeInBytes === data.gameItem.remoteGameSizeInBytes;
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

const isDownloading = computed(() => {
  return data.gameItem.localState.isDownloading;
});

const gameState = computed(() => {
  if (data.gameItem.source === 'steam') {
    return 'In Steam Only --> Has to be added to Nexus Library';
  }

  if (data.gameItem.status === 'DRAFT') {
    let state = 'Game In Nexus Library --> Not Uploaded';

    if (data.gameItem.launcher === 'PORT_PROTON') {
      state += ' --> Prefix is Required';
    }

    return state;
  }

  if (data.gameItem.status === 'UPLOADING') {
    return 'Not Fully Uploaded Yet --> Resume Upload';
  }

  if (data.gameItem.status !== 'ACTIVE') {
    return data.gameItem.status;
  }

  if (!data.gameItem.realLocalGamePath) {
    return 'Game Not Found Locally --> Can Be Downloaded';
  }

  if (data.gameItem.localState.isDownloading) {
    return "Game is being downloaded --> Can Be Removed After it's Downloaded";
  }

  return 'Game Installed Locally --> Can Be Removed';
});

// const localState = computed(() => {
//   const state = [];

//   if (!data.gameItem.realLocalGamePath) {
//     state.push('Game not found locally at any location: probably not installed');
//   }

//   if (!data.gameItem.realLocalPrefixPath) {
//     state.push('Prefix not found locally at any location: probably not installed');
//   }

//   if (data.gameItem.hash === data.gameItem.localHash) {
//     state.push('Local hash matches expected DB hash: game installed');
//   } else {
//     state.push('Local hash does not match expected DB hash: probably not installed or not fully downloaded');
//   }

//   if (data.gameItem.sizeInBytes === data.gameItem.localSizeInBytes) {
//     state.push('Local size matches expected DB size: game installed');
//   } else {
//     state.push('Local size does not match expected DB size: probably not installed or not fully downloaded');
//   }

//   return state;
// });
// const remoteState = computed(() => {
//   const state = [];

//   if (!data.gameItem.hash) {
//     state.push('No hash found in DB: game is not uploaded to remote');
//   }

//   if (data.gameItem.hash && data.gameItem.hash !== data.gameItem.remoteHash) {
//     state.push('Remote hash does not match expected DB hash: probably noy fully uploaded');
//   }

//   if (data.gameItem.sizeInBytes !== data.gameItem.remoteSizeInBytes) {
//     state.push('Remote size does not match expected DB size: probably noy fully uploaded');
//   }

//   return state;
// });

const shouldShowUploadToRemoteButton = computed(() => {
  if (data.gameItem.source === 'steam') {
    return false;
  }

  if (data.gameItem.status !== 'DRAFT' && data.gameItem.status !== 'UPLOADING') {
    return false;
  }

  if (isProcessingAction(processingActions.editingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.savingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.uploadingGameToRemote)) {
    return false;
  }

  if (isProcessingAction(processingActions.refreshingHashAndSize)) {
    return false;
  }

  if (isProcessingAction(processingActions.deletingGameFromLocal)) {
    return false;
  }

  return true;
});

const shouldShowRefreshHashAndSizeButton = computed(() => {
  if (data.gameItem.source === 'steam') {
    return false;
  }

  if (data.gameItem.status !== 'DRAFT' && data.gameItem.status !== 'UPLOADING' && data.gameItem.status !== 'ACTIVE') {
    return false;
  }

  if (isProcessingAction(processingActions.editingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.savingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.uploadingGameToRemote)) {
    return false;
  }

  if (isProcessingAction(processingActions.deletingGameFromLocal)) {
    return false;
  }

  if (isProcessingAction(processingActions.initGameDeletion)) {
    return false;
  }

  return true;
});

const shouldShowDeleteGameFromLocalButton = computed(() => {
  if (data.gameItem.source === 'steam') {
    return false;
  }

  if (data.gameItem.status !== 'ACTIVE') {
    return false;
  }

  if (isProcessingAction(processingActions.editingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.savingGameItem)) {
    return false;
  }

  if (isProcessingAction(processingActions.uploadingGameToRemote)) {
    return false;
  }

  if (isProcessingAction(processingActions.refreshingHashAndSize)) {
    return false;
  }

  if (isProcessingAction(processingActions.initGameDeletion)) {
    return false;
  }

  if (isProcessingAction(processingActions.deletingGameFromLocal)) {
    return false;
  }

  if (data.gameItem.localState.isDownloading) {
    return false;
  }

  if (data.gameItem.realLocalPrefixPath && data.gameItem.launcher === 'PORT_PROTON') {
    return true;
  }

  if (!data.gameItem.realLocalGamePath) {
    return false;
  }

  return true;
});

const shouldShowDownloadGameButton = computed(() => {
  return true;
});

function activateProcessingAction(action) {
  data.processingAction = action;

  data.errorMessage = null;
  data.successMessage = null;
  data.errors = null;
  data.progress = null;
  data.progressContent = null;
}

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

  activateProcessingAction(processingActions.uploadingIcon);

  try {
    const response = await uploadIcon(data.gameItem.steamAppId, data.iconFilePath);

    if (!response) {
      console.error('No response from uploadIcon');
      data.errorMessage = 'Something went wrong while uploading the icon.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Icon upload failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while uploading the icon.';
      return;
    }

    data.iconPreview = null;
    data.iconFilePath = null;
    data.successMessage = 'Icon uploaded successfully!';

    emit('update-game-item', response.gameItem);

    console.log('Icon upload status:', response);
  } catch (error) {
    console.error('Error uploading icon:', error);
    data.errorMessage = 'An error occurred while uploading the icon: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

function isProcessingAction(action) {
  return data.processingAction === action;
}

function onActionEdit() {
  activateProcessingAction(processingActions.editingGameItem);
}

function onActionEditCancel() {
  data.processingAction = null;

  data.gameItem = { ...props.gameItem };
}

async function onActionSave() {
  activateProcessingAction(processingActions.savingGameItem);

  try {
    const rawGameItem = makeRawGameItem();
    console.log('onActionSave: Raw Game Item: ', rawGameItem);

    const response = await saveGameItem(data.gameItem.steamAppId, rawGameItem);
    console.log('onActionSave: Response: ', response);

    if (!response) {
      console.error('No response from saveGameItem');
      data.errorMessage = 'Something went wrong while saving the game item.';
      return;
    }

    if (response.status !== 'success') {
      console.error('Saving game item failed:', response);
      data.errorMessage = response.error.message || 'Something went wrong while saving the game item.';
      data.errors = response.error.errors;
      return;
    }

    data.successMessage = 'Game item saved successfully!';

    emit('update-game-item', response.gameItem);
  } catch (error) {
    console.error('Error saving the game item:', error);
    data.errorMessage = 'An error occurred while saving the game item:' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionUploadGameToRemote() {
  activateProcessingAction(processingActions.uploadingGameToRemote);

  try {
    const rawGameItem = makeRawGameItem();
    console.log('Raw Game Item: ', rawGameItem);

    const response = await uploadGameToRemote(props.gameItem.steamAppId, rawGameItem);
    console.log(response);

    if (!response) {
      data.errorMessage = 'Something went wrong while uploading the game to the remote.';
      return;
    }

    if (response.status !== 'success') {
      data.errorMessage = response.error.message || 'Something went wrong while uploading the game to the remote.';
      data.errors = response.error.errors;

      if (response.gameItem) {
        emit('update-game-item', response.gameItem);
      }

      return;
    }

    data.successMessage = 'Game uploaded successfully!';

    emit('update-game-item', response.gameItem);
  } catch (error) {
    console.error('Error uploading the game to the remote:', error);
    data.errorMessage = 'An error occurred while uploading the game to the remote:' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionCancelUploadGameToRemote() {
  activateProcessingAction(processingActions.abortingGameUpload);

  try {
    const response = await abortGameUpload(props.gameItem.steamAppId);

    if (!response) {
      data.errorMessage = 'Something went wrong while canceling the upload.';
      return;
    }

    if (response.status !== 'success') {
      data.errorMessage = response.error.message || 'Something went wrong while canceling the upload.';
      data.errors = response.error.errors;
      return;
    }

    data.successMessage = 'Game upload canceled successfully!';
  } catch (error) {
    console.error('Error canceling the upload:', error);
    data.errorMessage = 'An error occurred while canceling the upload:' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionRefreshHashAndSize() {
  activateProcessingAction(processingActions.refreshingHashAndSize);

  const rawGameItem = makeRawGameItem();

  try {
    const response = await refreshHashAndSize(data.gameItem.steamAppId, rawGameItem);

    console.log('Refresh Hash and Size Response:', response);

    if (!response) {
      data.errorMessage = 'Something went wrong while refreshing the hash and size.';
      return;
    }

    if (response.status !== 'success') {
      data.errorMessage = response.error.message || 'Something went wrong while refreshing the hash and size.';
      data.errors = response.error.errors;
      return;
    }

    data.successMessage = 'Hash and size refreshed successfully!';
    data.errorMessage = response.error.message;
    data.errors = response.error.errors;

    emit('update-game-item', response.gameItem);
  } catch (error) {
    console.error('Error refreshing hash and size:', error);
    data.errorMessage = 'An error occurred while refreshing the hash and size: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionInitGameDeletion() {
  activateProcessingAction(processingActions.initGameDeletion);
}

async function onActionCancelGameDeletion() {
  data.processingAction = null;
}

async function onActionConfirmGameDeletion() {
  console.log('Confirming game deletion with prefix deletion:', data.deletePrefix);

  activateProcessingAction(processingActions.deletingGameFromLocal);

  const rawGameItem = makeRawGameItem();

  try {
    const response = await deleteGameFromLocal(data.gameItem.steamAppId, rawGameItem, data.deletePrefix);

    console.log('Delete Game From Local Response:', response);

    if (!response) {
      data.errorMessage = 'Something went wrong while deleting the game from local.';
      return;
    }

    if (response.status !== 'success') {
      data.errorMessage = response.error.message || 'Something went wrong while deleting the game from local.';
      data.errors = response.error.errors;
      return;
    }

    data.successMessage = 'Game deleted successfully!';
    data.errorMessage = response.error.message;
    data.errors = response.error.errors;

    emit('update-game-item', response.gameItem);
  } catch (error) {
    console.error('Error deleting the game from local:', error);
    data.errorMessage = 'An error occurred while deleting the game from local: ' + error.message;
  } finally {
    data.processingAction = null;
  }
}

async function onActionInitGameDownload() {
  activateProcessingAction(processingActions.initGameDownload);
}

async function onActionCancelGameDownload() {
  data.processingAction = null;
}

async function onActionRequestDownloadDetails() {
  activateProcessingAction(processingActions.requestingDownloadDetails);
  data.availablePrefixes = [];

  const rawGameItem = makeRawGameItem();

  try {
    const response = await requestDownloadDetails(data.gameItem.steamAppId, rawGameItem);

    console.log('Request Download Details Response:', response);

    if (!response) {
      data.errorMessage = 'Something went wrong while requesting the download details.';
      return;
    }

    if (response.status !== 'success') {
      data.errorMessage = response.error.message || 'Something went wrong while requesting the download details.';
      data.errors = response.error.errors;
      return;
    }

    data.successMessage = 'Download details requested successfully!';
    data.availablePrefixes = response.downloadDetails.prefixes;
    onActionInitGameDownload();
  } catch (error) {
    console.error('Error requesting download details:', error);
    data.errorMessage = 'An error occurred while requesting the download details: ' + error.message;
    data.processingAction = null;
  }
}

async function onActionConfirmGameDownload() {}

function makeRawGameItem() {
  const rawGameItem = toRaw(data.gameItem);

  if (!data.gameItem.localState) {
    return rawGameItem;
  }

  const rawLocalState = toRaw(data.gameItem.localState);

  rawGameItem.localState = rawLocalState;

  return rawGameItem;
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
            :disabled="isProcessingAction(processingActions.uploadingIcon)"
            :class="isProcessingAction(processingActions.uploadingIcon) ? 'disabled cursor-not-allowed' : ''"
            type="button"
            class="absolute m-auto left-0 right-0 bottom-0 block w-24 block text-white bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
            @click="onUploadIcon"
          >
            {{ isProcessingAction(processingActions.uploadingIcon) ? 'Uploading...' : 'Upload' }}
          </button>
        </label>
      </div>

      <div class="mt-4">
        <button
          v-if="!isProcessingAction(processingActions.editingGameItem) && !data.processingAction"
          type="button"
          class="text-white w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br dark:focus:ring-purple-800 shadow-lg dark:shadow-lg dark:shadow-purple-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionEdit"
        >
          Edit
        </button>

        <button
          v-if="shouldShowRefreshHashAndSizeButton"
          type="button"
          class="text-white w-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 hover:bg-gradient-to-br dark:focus:ring-teal-800 shadow-lg dark:shadow-lg dark:shadow-teal-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          :disabled="isProcessingAction(processingActions.refreshingHashAndSize)"
          @click="onActionRefreshHashAndSize"
        >
          {{ isProcessingAction(processingActions.refreshingHashAndSize) ? 'Refreshing...' : 'Refresh Hash and Size' }}
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
          v-if="isProcessingAction(processingActions.uploadingGameToRemote)"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-cyan-800 shadow-lg dark:shadow-lg dark:shadow-cyan-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          @click="onActionCancelUploadGameToRemote"
        >
          Cancel Game Upload
        </button>

        <div v-if="isProcessingAction(processingActions.uploadingGameToRemote) && data.progress">
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
          v-if="isProcessingAction(processingActions.savingGameItem)"
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
          v-if="isProcessingAction(processingActions.editingGameItem)"
          type="button"
          class="text-white w-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:bg-gradient-to-br dark:focus:ring-green-800 shadow-lg shadow-green-500/50 dark:shadow-lg dark:shadow-green-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionSave"
        >
          Save to DB
        </button>

        <button
          v-if="isProcessingAction(processingActions.editingGameItem)"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-red-800 shadow-lg dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm py-2.5 text-center mb-2"
          @click="onActionEditCancel"
        >
          Cancel and Reset
        </button>

        <button
          v-if="shouldShowDeleteGameFromLocalButton"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-red-800 dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          @click="onActionInitGameDeletion"
        >
          Delete Game From Local
        </button>

        <button
          v-if="isProcessingAction(processingActions.deletingGameFromLocal)"
          type="button"
          class="text-white w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-red-800 dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
        >
          Deleting Game From Local...
        </button>

        <button
          v-if="shouldShowDownloadGameButton"
          type="button"
          class="text-white w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br dark:focus:ring-blue-800 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          :disabled="isProcessingAction(processingActions.requestingDownloadDetails)"
          @click="onActionRequestDownloadDetails"
        >
          {{ isProcessingAction(processingActions.requestingDownloadDetails) ? 'Requesting Download Details...' : 'Download Game' }}
        </button>
      </div>
    </div>

    <div class="flex flex-col justify-between p-4 leading-normal flex-grow relative">
      <div v-if="data.showProgressContent && data.progressContent" class="absolute top-2 left-2 right-2 bottom-2 dark:bg-gray-700 dark:text-gray-400">
        <div class="p-4 w-full h-full overflow-auto">
          <pre v-html="data.progressContent"></pre>
        </div>
      </div>

      <div v-if="isProcessingAction(processingActions.initGameDownload)" class="absolute top-2 left-2 right-2 bottom-2 dark:bg-gray-700 dark:text-gray-400 opacity-98">
        <div class="p-4 w-full h-full overflow-auto">
          <div v-if="data.availablePrefixes.length > 0" class="p-2 mb-2">
            <h3 class="text-lg font-semibold mb-4">Please select a prefix to download with the game</h3>

            <ul class="grid w-full gap-6 md:grid-cols-3">
              <li>
                <input
                  :id="'prefix-none-' + data.gameItem.steamAppId"
                  v-model="prefixSelected"
                  value="NONE"
                  checked
                  type="radio"
                  name="prefix-selected"
                  class="hidden peer"
                  required
                />
                <label
                  :for="'prefix-none-' + data.gameItem.steamAppId"
                  class="inline-flex items-center justify-between w-full h-full p-5 border-4 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 dark:peer-checked:text-blue-500 dark:peer-checked:border-blue-600 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-900"
                >
                  <div class="block">
                    <div class="w-full text-lg font-semibold inline-flex items-center justify-between">
                      None
                      <svg
                        v-if="prefixSelected === 'NONE'"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-6"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div class="w-full">Prefix will not be downloaded</div>
                  </div>
                </label>
              </li>

              <li v-for="prefix in data.availablePrefixes" :key="prefix.alias">
                <input
                  :id="'prefix-' + prefix.alias + '-' + data.gameItem.steamAppId"
                  v-model="prefixSelected"
                  :value="prefix.alias"
                  type="radio"
                  name="prefix-selected"
                  class="hidden peer"
                  required
                />
                <label
                  :for="'prefix-' + prefix.alias + '-' + data.gameItem.steamAppId"
                  class="inline-flex text-wrap break-all items-center justify-between w-full h-full p-5 border-4 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 dark:peer-checked:text-blue-500 dark:peer-checked:border-blue-600 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-900"
                >
                  <div class="block">
                    <div class="w-full text-lg font-semibold inline-flex items-center justify-between">
                      {{ prefix.alias }}
                      <svg
                        v-if="prefixSelected === prefix.alias"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-6"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div class="w-full">{{ prefix.path }}</div>
                  </div>
                </label>
              </li>
            </ul>
          </div>

          <div class="grid w-full md:grid-cols-2 mt-4">
            <div class="grid w-full md:grid-cols-2 gap-12">
              <button
                type="button"
                class="text-white bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 hover:bg-gradient-to-br dark:focus:ring-blue-800 shadow-lg dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
                @click="onActionConfirmGameDownload"
              >
                Start Download
              </button>

              <button
                type="button"
                class="text-white bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:bg-gradient-to-br dark:focus:ring-red-800 dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
                @click="onActionCancelGameDownload"
              >
                Cancel Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isProcessingAction(processingActions.initGameDeletion)" class="absolute top-2 left-2 right-2 bottom-2 dark:bg-gray-700 dark:text-gray-400 opacity-98">
        <div class="p-4 w-full h-full overflow-auto">
          <div class="p-2 mb-2">
            <p>Are you sure you want to delete this game from your local library?</p>
            <p>No worries, it can re-downloaded again</p>
          </div>

          <div v-if="data.gameItem.realLocalPrefixPath && data.gameItem.launcher === 'PORT_PROTON'" class="grid w-full md:grid-cols-2">
            <input id="delete-prefix" v-model="data.deletePrefix" type="checkbox" class="hidden peer" />
            <label
              for="delete-prefix"
              class="flex flex-col items-start justify-between w-full p-5 text-gray-500 border-4 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-600 dark:peer-checked:border-yellow-600 dark:peer-checked:text-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-600"
            >
              <div class="flex">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-7 stroke-red-500 mr-2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>

                <span class="w-full text-lg font-semibold">Delete Prefix?</span>
              </div>

              <div class="w-full text-sm text-wrap break-all mt-3">{{ data.gameItem.realLocalPrefixPath }}</div>
            </label>
          </div>

          <div class="grid w-full md:grid-cols-2 mt-4">
            <div class="grid w-full md:grid-cols-2 gap-12">
              <button
                type="button"
                class="text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br dark:focus:ring-red-800 shadow-lg dark:shadow-lg dark:shadow-red-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
                @click="onActionConfirmGameDeletion"
              >
                Delete
              </button>

              <button
                type="button"
                class="text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br dark:focus:ring-blue-800 dark:shadow-lg dark:shadow-blue-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
                @click="onActionCancelGameDeletion"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 grid-cols-[20fr_80fr] mb-2">
        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Title:</span>
        <input
          v-model="data.gameItem.steamTitle"
          type="text"
          class="border text-sm rounded-lg w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
        <span class="text-l font-bold tracking-tight dark:text-white">Game State:</span>
        <span class="font-normal dark:text-yellow-400">{{ gameState }}</span>

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
        <span class="font-normal" :class="hashClass">{{ data.gameItem.gameHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">DB Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.gameSizeInBytes }} ({{ formattedSize(data.gameItem.gameSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.localGameHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.localGameSizeInBytes }} ({{ formattedSize(data.gameItem.localGameSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Hash:</span>
        <span class="font-normal" :class="hashClass">{{ data.gameItem.remoteGameHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Size:</span>
        <span class="font-normal" :class="sizeClass">{{ data.gameItem.remoteGameSizeInBytes }} ({{ formattedSize(data.gameItem.remoteGameSizeInBytes) }})</span>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_30fr_20fr_30fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight dark:text-white">DB Prefix Hash (Default):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.prefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">DB Prefix Size (Default):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.prefixSizeInBytes }} ({{ formattedSize(data.gameItem.prefixSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Hash (Current):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.localPrefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Local Size (Current):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.localPrefixSizeInBytes }} ({{ formattedSize(data.gameItem.localPrefixSizeInBytes) }})</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Hash (Default):</span>
        <span class="font-normal" :class="prefixHashClass">{{ data.gameItem.remotePrefixHash }}</span>

        <span class="text-l font-bold tracking-tight dark:text-white">Remote Size (Default):</span>
        <span class="font-normal" :class="prefixSizeClass">{{ data.gameItem.remotePrefixSizeInBytes }} ({{ formattedSize(data.gameItem.remotePrefixSizeInBytes) }})</span>
      </div>

      <div class="grid mb-4 gap-2 grid-cols-[20fr_80fr] p-2 border border-gray-600 rounded-lg">
        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Exe Target:</span>
        <input
          v-model="data.gameItem.steamExeTarget"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
        />

        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Start Dir:</span>
        <input
          v-model="data.gameItem.steamStartDir"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
        />

        <span class="text-l font-bold tracking-tight py-2.5 dark:text-white">Steam Launch Args:</span>
        <input
          v-model="data.gameItem.steamLaunchArgs"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
                :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
                :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
                :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
                :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
        />

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Real Local Prefix Path:</span>
        <span class="font-normal py-2.5 text-gray-400">{{ data.gameItem.realLocalPrefixPath }}</span>

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Game Location:</span>
        <input
          v-model="data.gameItem.gameLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
        />

        <span class="text-l font-bold py-2.5 tracking-tight dark:text-white">Prefix Location:</span>
        <input
          v-model="data.gameItem.prefixLocation"
          type="text"
          class="border text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          :disabled="!isProcessingAction(processingActions.editingGameItem)"
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
