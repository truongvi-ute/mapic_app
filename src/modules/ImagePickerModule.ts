import { NativeModules } from 'react-native';

interface ImagePickerModuleInterface {
  pickImage(): Promise<{ uri: string }>;
}

const { ImagePickerModule } = NativeModules;

// Debug logging
console.log('[ImagePickerModule] Available native modules:', Object.keys(NativeModules));
console.log('[ImagePickerModule] ImagePickerModule:', ImagePickerModule);

if (!ImagePickerModule) {
  console.error('[ImagePickerModule] Module not found! Make sure you have rebuilt the app with "npx expo run:android"');
}

export default ImagePickerModule as ImagePickerModuleInterface;
