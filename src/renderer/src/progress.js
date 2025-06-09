import { reactive } from 'vue';

const progress = reactive({});

window.gamesAPI.subscribeToProgressUpdates((data) => {
  console.log('progress subscription:', data);

  if (!data || !data.progressId) {
    console.error('progress subscription: invalid data:', data);
    return;
  }

  const progressId = data.progressId;
  progress[progressId] = data;
});

export { progress };
