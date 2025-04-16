<script setup>
// import { ref } from 'vue';
import Config from './components/Config.vue';
import Tabs from './components/Tabs.vue';
import Tab from './components/Tab.vue';

// const activeTab = ref(0);

// const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <div>
    <Tabs>
      <Tab title="Config"><Config /></Tab>
      <Tab title="Remote Game Library">Remote Game lib</Tab>
      <Tab title="Local Game Library">Local Game lib</Tab>
    </Tabs>
  </div>
</template>
