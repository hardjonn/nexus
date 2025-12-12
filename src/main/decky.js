import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from './conf';

// Promisify the standard 'exec' function for use with async/await
const execPromise = promisify(exec);

async function getDeckyThemes() {
  console.log('decky::getDeckyThemes');
  try {
    const config = getConfig();

    // get Decky base path from the app config
    const deckyThemesBasePath = config.decky.theme.path;
    console.log('decky::getDeckyThemes: deckyThemesBasePath', deckyThemesBasePath);

    const themes = [];
    for (const repo of config.decky.theme.repos) {
      const theme = getThemeFromLocalFolder(deckyThemesBasePath, repo.url, repo.folder);

      if (!theme) {
        continue;
      }

      themes.push(theme);
    }

    console.log('decky::getDeckyThemes: themes', themes);
    return {
      status: 'success',
      themes,
    };
  } catch (error) {
    console.error('Error getting decky themes:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

function getThemeFromLocalFolder(deckyThemesBasePath, repoUrl, repoFolder) {
  console.log('decky::getThemeFromLocalFolder: repoFolder', repoFolder);

  const themePath = path.join(deckyThemesBasePath, repoFolder);
  console.log('decky::getThemeFromLocalFolder: themePath', themePath);

  const baseTheme = {
    fullPath: themePath,
    repoUrl,
    repoFolder,
  };

  if (!fs.existsSync(themePath)) {
    console.log('decky::getThemeForRepoLink: themePath does not exist', themePath);
    return baseTheme;
  }

  const theme = fs.readJsonSync(path.join(themePath, 'theme.json'));
  console.log('decky::getThemeForRepoLink: theme', theme);

  return {
    ...baseTheme,
    ...theme,
  };
}

async function updateDeckyTheme(theme) {
  console.log('decky::updateDeckyTheme: ', theme);
  try {
    const config = getConfig();

    // get Decky base path from the app config
    const deckyThemesBasePath = config.decky.theme.path;
    console.log('decky::updateThemeForRepoLink: deckyThemesBasePath', deckyThemesBasePath);

    await cloneRepoIntoTargetLocalFolder(deckyThemesBasePath, theme.repoUrl, theme.repoFolder);

    const updatedTheme = getThemeFromLocalFolder(deckyThemesBasePath, theme.repoUrl, theme.repoFolder);

    return {
      status: 'success',
      theme: updatedTheme,
    };
  } catch (error) {
    console.error('Error updating decky theme:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

async function installDeckyTheme(theme) {
  console.log('decky::installDeckyTheme: ', theme);
  try {
    const config = getConfig();

    // get Decky base path from the app config
    const deckyThemesBasePath = config.decky.theme.path;
    console.log('decky::installThemeForRepoLink: deckyThemesBasePath', deckyThemesBasePath);

    await cloneRepoIntoTargetLocalFolder(deckyThemesBasePath, theme.repoUrl, theme.repoFolder);

    const installedTheme = getThemeFromLocalFolder(deckyThemesBasePath, theme.repoUrl, theme.repoFolder);

    return {
      status: 'success',
      theme: installedTheme,
    };
  } catch (error) {
    console.error('Error installing decky theme:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

async function cloneRepoIntoTargetLocalFolder(themeBasePath, repoUrl, repoFolder) {
  console.log('decky::cloneRepoIntoTargetLocalFolder: themeBasePath', themeBasePath);
  console.log('decky::cloneRepoIntoTargetLocalFolder: repoUrl', repoUrl);
  console.log('decky::cloneRepoIntoTargetLocalFolder: repoFolder', repoFolder);

  // we need to clone the repo into a temp folder first
  // and then move it to the target folder
  const tempDirFullPath = path.resolve('/tmp/decky-theme');
  const sourcePath = path.join(tempDirFullPath, repoFolder);
  const targetPath = path.resolve(themeBasePath, repoFolder);
  console.log('decky::cloneRepoIntoTargetLocalFolder: tempDirFullPath', tempDirFullPath);
  console.log('decky::cloneRepoIntoTargetLocalFolder: sourcePath', sourcePath);
  console.log('decky::cloneRepoIntoTargetLocalFolder: targetPath', targetPath);

  try {
    // 1. Clean up and create the temporary directory
    await fs.rm(tempDirFullPath, { recursive: true, force: true });
    await fs.mkdir(tempDirFullPath, { recursive: true });

    // 2. Initialize and configure sparse checkout in the temporary folder
    console.log('decky::cloneRepoIntoTargetLocalFolder: Initializing repository...');
    await runGitCommand(`git init`, tempDirFullPath);
    await runGitCommand(`git remote add origin ${repoUrl}`, tempDirFullPath);
    await runGitCommand(`git config core.sparseCheckout true`, tempDirFullPath);

    // 3. Define the desired subdirectory in the sparse-checkout file
    const gitDirInfo = path.join(tempDirFullPath, '.git', 'info');
    await fs.mkdir(gitDirInfo, { recursive: true });

    // Write the subdirectory path to the sparse-checkout file
    await fs.writeFile(
      path.join(gitDirInfo, 'sparse-checkout'),
      `${repoFolder}/*\n` // Only include the contents of the subdirectory
    );

    // 4. Fetch and checkout (only the sparse content will be downloaded)
    console.log('decky::cloneRepoIntoTargetLocalFolder: Pulling sparse content...');
    // We use `pull` here for simplicity, which combines fetch and merge/checkout
    await runGitCommand(`git pull origin HEAD`, tempDirFullPath);

    console.log(`decky::cloneRepoIntoTargetLocalFolder: Successfully checked out ${repoFolder} into temporary location.`);

    // 5. Move the cloned subdirectory content to the target folder
    await fs.mkdir(targetPath, { recursive: true });

    // Get contents of the source folder (the subdirectory inside the temp clone)
    const items = await fs.readdir(sourcePath, { withFileTypes: true });

    console.log(`decky::cloneRepoIntoTargetLocalFolder: Moving contents to ${targetPath}...`);
    for (const item of items) {
      const src = path.join(sourcePath, item.name);
      const dest = path.join(targetPath, item.name);

      // fs.rename is an atomic operation and acts as a move
      await fs.rename(src, dest);
    }

    console.log(`decky::cloneRepoIntoTargetLocalFolder: Success! Contents moved to: ${targetPath}`);
  } catch (error) {
    console.error('decky::cloneRepoIntoTargetLocalFolder: An error occurred during the process:', error.message);
  } finally {
    // 6. Clean up the temporary folder
    console.log(`decky::cloneRepoIntoTargetLocalFolder: Cleaning up temporary directory: ${tempDirFullPath}`);
    await fs.rm(tempDirFullPath, { recursive: true, force: true });
  }
}

/**
 * Executes a shell command and logs any errors.
 * @param {string} command The command to execute.
 * @param {string} cwd The current working directory for the command.
 */
async function runGitCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execPromise(command, { cwd: cwd });
    if (stderr) {
      console.error(`[GIT-WARN] ${stderr.trim()}`);
    }
  } catch (error) {
    throw new Error(`Command failed: ${command}\nError: ${error.message}`);
  }
}

export { getDeckyThemes, updateDeckyTheme, installDeckyTheme };
