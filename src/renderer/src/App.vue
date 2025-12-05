<script setup>
import Config from './components/Config.vue';
import Tabs from './components/Tabs.vue';
import Tab from './components/Tab.vue';
import GamesList from './components/GamesList.vue';
import Backup from './components/Backup.vue';
import About from './components/About.vue';
import Logs from './components/Logs.vue';
</script>

<template>
  <div>
    <Tabs>
      <Tab title="Config" name="config"><Config /></Tab>
      <Tab title="Games Library" name="games-lib">
        <Suspense>
          <GamesList />
          <template #fallback> Loading games... </template>
        </Suspense>
      </Tab>
      <Tab title="Backup" name="backup"><Backup /></Tab>
      <Tab title="About" name="about"><About /></Tab>
      <Tab title="Logs" name="logs"><Logs /></Tab>
    </Tabs>
  </div>
</template>
