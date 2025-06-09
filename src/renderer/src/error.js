import { reactive } from 'vue';

const error = reactive({});

window.errorAPI.subscribeToErrorUpdates((data) => {
  console.log('error subscription:', data);

  if (!data || !data.errorId) {
    console.error('error subscription: invalid data:', data);
    return;
  }

  const errorId = data.errorId;
  error[errorId] = data.error;
});

export { error };
