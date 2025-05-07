import { reactive } from 'vue';

const progress = reactive({});

window.gamesAPI.subscribeToProgressUpdates((data) => {
  console.log('progress subscription:', data);

  const progressId = data.progressId;
  progress[progressId] = data;
});

export { progress };
