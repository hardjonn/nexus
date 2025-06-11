import path from 'path';
import os from 'os';
import fs from 'fs-extra';

// currently supported only on Linux in the AppImage mode
async function addDesktopEntry() {
  try {
    console.log('integration::addDesktopEntry: adding desktop entry');

    if (process.platform !== 'linux') {
      throw new Error('Integration is currently supported on Linux only');
    }

    const homeDir = os.homedir();
    console.log('integration::addDesktopEntry: homeDir', homeDir);

    const desktopPath = path.join(homeDir, 'Desktop');
    const desktopEntryPath = path.join(desktopPath, 'Nexus.desktop');
    console.log('integration::addDesktopEntry: desktopPath', desktopPath);
    console.log('integration::addDesktopEntry: desktopEntryPath', desktopEntryPath);

    // get the desktop entry file from the resources folder
    const desktopResourcePath = path.resolve(__dirname, '../../resources/Nexus.desktop');
    const desktopResourceContent = fs.readFileSync(desktopResourcePath, 'utf-8');
    console.log('integration::addDesktopEntry: desktopResourcePath', desktopResourcePath);
    console.log('integration::addDesktopEntry: desktopResourceContent', desktopResourceContent);

    // NOTE:not available in the dev mode
    const appImagePath = process.env.APPIMAGE;
    console.log('integration::addDesktopEntry: appImagePath', appImagePath);

    if (!appImagePath) {
      throw new Error('APPIMAGE environment variable is not set');
    }

    const appMountDir = process.env.APPDIR;
    console.log('integration::addDesktopEntry: appMountDir', appMountDir);

    // when AppImage is created it puts the .DirIcon link in the AppDir root folder
    // that point to the icon in the AppDir usr folder
    const dirIconLinkPath = path.resolve(appMountDir, '.DirIcon');
    console.log('integration::addDesktopEntry: dirIconLinkPath', dirIconLinkPath);

    const dirIconLinkTarget = fs.readlinkSync(dirIconLinkPath);
    console.log('integration::addDesktopEntry: dirIconLinkTarget', dirIconLinkTarget);

    const homeLocalDir = path.join(homeDir, '.local');
    console.log('integration::addDesktopEntry: homeLocalDir', homeLocalDir);

    const fullIconPath = dirIconLinkTarget.replace('usr/', homeLocalDir + '/');
    console.log('integration::addDesktopEntry: fullIconPath', fullIconPath);

    // copy icon in the ~/.local/share/icons folder
    // create the folders recursively if does not exist
    fs.mkdirSync(path.dirname(fullIconPath), { recursive: true });

    const sourceIconPath = path.resolve(appMountDir, dirIconLinkTarget);
    console.log('integration::addDesktopEntry: sourceIconPath', sourceIconPath);

    fs.copySync(sourceIconPath, fullIconPath);

    const desktopEntryContent = desktopResourceContent.replace('%EXEC%', appImagePath).replace('%ICON%', fullIconPath);
    console.log('integration::addDesktopEntry: desktopEntryContent', desktopEntryContent);

    if (fs.existsSync(desktopEntryPath)) {
      console.log('integration::addDesktopEntry: desktop entry already exists');
    }

    fs.writeFileSync(desktopEntryPath, desktopEntryContent);

    return {
      status: 'success',
      desktopEntryContent,
    };
  } catch (error) {
    console.error('Error adding desktop entry:', error);
    return {
      status: 'error',
      error: {
        message: error.message,
      },
    };
  }
}

export { addDesktopEntry };
