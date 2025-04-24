<script setup>
const props = defineProps({
  gameItem: {
    type: Object,
    required: true,
  },
});

console.log('GameItem props:', props.gameItem);

// const emit = defineEmits(['openGame', 'deleteGame', 'editGame']);
// const game = ref(props.game);
</script>

<template>
  <div
    class="w-full flex flex-col mt-4 items-start justify-between bg-white border border-gray-200 rounded-lg shadow-sm md:flex-row hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
  >
    <img
      v-if="gameItem.icon"
      class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg"
      :src="`data:image/png;base64,${gameItem.icon}`"
      alt=""
    />
    <img
      v-if="!gameItem.icon"
      class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg"
      src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
      alt=""
    />

    <div class="flex flex-col justify-between p-4 leading-normal flex-grow">
      <span class="mb-2 text-l font-bold tracking-tight text-gray-900 dark:text-white"
        >Steam App Id: <span class="font-normal text-gray-700 dark:text-gray-400">{{ gameItem.steamAppId }}</span></span
      >
      <span class="mb-2 text-l font-bold tracking-tight text-gray-900 dark:text-white"
        >Steam Title: <span class="font-normal text-gray-700 dark:text-gray-400">{{ gameItem.steamTitle }}</span></span
      >
    </div>

    <div class="flex flex-col justify-between p-4 w-s">Actions</div>
  </div>
</template>
