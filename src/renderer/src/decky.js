function getDeckyThemes() {
  return window.deckyAPI.getDeckyThemes();
}

function updateDeckyTheme(theme) {
  return window.deckyAPI.updateDeckyTheme(theme);
}

function installDeckyTheme(theme) {
  return window.deckyAPI.installDeckyTheme(theme);
}

export { getDeckyThemes, updateDeckyTheme, installDeckyTheme };
