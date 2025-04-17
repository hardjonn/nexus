<script setup>
import { useSlots } from 'vue';
import { store } from './../store.js';

const slots = useSlots().default();

const markActive = (tabName) => {
  // store the active tab in the store
  // this will be used to show the active tab in the UI
  // and to load the correct tab when the app is restarted
  store.setActiveTab(tabName);
};
</script>

<template>
  <div class="text-sm font-medium text-center text-gray-500 rounded-lg shadow-sm sm:flex dark:divide-gray-700 dark:text-gray-400">
    <span v-for="(slot, index) in slots" :key="index" class="w-full focus-within:z-10" @click="markActive(slot.props.name)">
      <a
        href="#"
        class="inline-block border-2 w-full p-4 text-gray-900 border-gray-200 dark:border-gray-700 dark:text-white"
        :class="{
          'text-gray-900 bg-blue-700 active dark:bg-blue-700 dark:hover:bg-blue-600 active': slot.props.name === store.app.active_tab,
          'dark:bg-gray-800 dark:hover:bg-gray-700': slot.props.name !== store.app.active_tab,
        }"
        aria-current="page"
        >{{ slot.props.title }}</a
      >
    </span>
  </div>
  <div>
    <slot />
  </div>
</template>
