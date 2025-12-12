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

const onQuit = () => {
  window.close();
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
    <button
      type="button"
      class="text-white bg-violet-700 hover:bg-violet-800 focus:ring-4 focus:outline-none focus:ring-violet-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-violet-600 dark:hover:bg-violet-700 dark:focus:ring-violet-800"
      @click="onQuit"
    >
      Quit
    </button>
  </div>
  <div>
    <slot />
  </div>
</template>
