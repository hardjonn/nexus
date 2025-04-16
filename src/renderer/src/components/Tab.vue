<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <!-- tab component needs a single root to be movable -->
  <div>
    <slot />
  </div>
</template>
