<script setup>
import { store } from './../store.js';

defineProps({
  title: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <!-- tab component needs a single root to be movable -->
  <div>
    <div v-show="store.app.active_tab == name" class="flex flex-col">
      <slot />
    </div>
  </div>
</template>
