import { reactive } from 'vue';

const consoleLog = reactive({});

window.consoleAPI.subscribeToConsoleLogUpdates((data) => {
  console.log('console log subscription:', data);

  consoleLog.data = data;
});

export { consoleLog };
