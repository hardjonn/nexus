<script setup>
import { store } from './../store.js';

console.log('Config component loaded: ', store);

// Load initial values from the store
// Object.keys(options).forEach((key) => {
//   window.store.get(key).then((value) => {
//     if (value !== undefined) options[key] = value;
//   });
// });

// const saveOptions = () => {
//   Object.entries(options).forEach(([key, value]) => {
//     window.store.set(key, value);
//   });
//   alert('Options saved successfully!');
// };
</script>

<template>
  <div>
    <h1>Application Options</h1>
    <form @submit.prevent="saveOptions">
      <section>
        <h2>Database Options</h2>
        <label>
          Host:
          <input v-model="store.db.host" type="text" />
        </label>
        <label>
          Port:
          <input v-model.number="store.db.port" type="number" />
        </label>
        <label>
          User:
          <input v-model="store.db.user" type="text" />
        </label>
        <label>
          Password:
          <input v-model="store.db.pass" type="text" />
        </label>
        <label>
          Database Name:
          <input v-model="store.db.base" type="text" />
        </label>
      </section>

      <!-- <section>
        <h2>Steam Options</h2>
        <label>
          User ID:
          <input v-model="options.steam_user_id" type="text" />
        </label>
        <label>
          User Name:
          <input v-model="options.steam_user_name" type="text" />
        </label>
        <label>
          Config Path:
          <input v-model="options.steam_user_config_path" type="text" />
        </label>
        <label>
          Shortcuts Filename:
          <input v-model="options.steam_shortcuts_filename" type="text" />
        </label>
      </section>

      <section>
        <h2>NAS Options</h2>
        <label>
          Host:
          <input v-model="options.nas_host" type="text" />
        </label>
        <label>
          Games Library Path:
          <input v-model="options.nas_games_lib_path" type="text" />
        </label>
        <label>
          Prefixes Path:
          <input v-model="options.nas_prefixes_path" type="text" />
        </label>
      </section>

      <section>
        <h2>Client Options</h2>
        <label>
          Games Library Path:
          <input v-model="options.client_games_lib_path" type="text" />
        </label>
        <label>
          Prefixes Path:
          <input v-model="options.client_prefixes_path" type="text" />
        </label>
      </section> -->

      <button type="submit">Save Options</button>
    </form>
  </div>
</template>
