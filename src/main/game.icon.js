import fs from 'fs-extra';
import { Jimp } from 'jimp';

// DB stores/saves icons as raw binary, it's not a base64 encoded string
// and for displaying it in the UI we need to convert it to a base64 string

function loadIconFromPath(iconPath) {
  try {
    // Load the icon from the given path
    // the icon will be stored in the database as a blob

    console.log('game.icon::loadIconFromPath: Loading icon from path:', iconPath);
    // check if the icon path is a valid file
    if (!fs.existsSync(iconPath)) {
      console.error('game.icon::loadIconFromPath: Icon path does not exist: ', iconPath);
      return null;
    }

    const iconBuffer = fs.readFileSync(iconPath);
    return iconBuffer.toString('base64');
  } catch (error) {
    console.error('game.icon::loadIconFromPath: Error loading icon from path:', error);
    return null;
  }
}

async function makeIconFromPath(iconPath) {
  try {
    if (!iconPath) {
      throw new Error('game.icon::makeIconFromPath: Icon path is required');
    }

    const image = await Jimp.read(iconPath);
    // we need to convert image to a 192x192 JPG
    const resizedImage = (await image.resize({ w: 192 }).getBuffer('image/jpeg', { quality: 60 })).toString('base64');
    console.log('game.icon::makeIconFromPath: Resized image buffer:', resizedImage.length);

    return resizedImage;
  } catch (error) {
    console.error('game.icon::makeIconFromPath: Error making icon from path:', error);
    throw error;
  }
}

async function makeIconFromLoadedSteamIcon(icon) {
  try {
    if (!icon) {
      return null;
    }

    // try to use the steam icon when the record is created for the first time
    const iconBuffer = Buffer.from(icon, 'base64');
    const image = await Jimp.fromBuffer(iconBuffer);

    // we need to convert image to a 192x192 JPG
    const resizedImage = (await image.resize({ w: 192 }).getBuffer('image/jpeg', { quality: 60 })).toString('base64');
    return resizedImage;
  } catch (error) {
    console.error('game.icon::makeIconFromLoadedSteamIcon: Error making icon from loaded steam icon:', error);
    return null;
  }
}

export { loadIconFromPath, makeIconFromPath, makeIconFromLoadedSteamIcon };
