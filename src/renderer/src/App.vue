<script setup>
import Config from './components/Config.vue';
import Tabs from './components/Tabs.vue';
import Tab from './components/Tab.vue';
</script>

<template>
  <div>
    <Tabs>
      <Tab title="Config" name="config"><Config /></Tab>
      <Tab title="Remote Game Library" name="remote-game-lib">Remote Game lib content</Tab>
      <Tab title="Local Game Library" name="local-game-lib">Local Game lib content</Tab>
    </Tabs>
  </div>
</template>
