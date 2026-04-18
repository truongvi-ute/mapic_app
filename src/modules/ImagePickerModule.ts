import { NativeModules } from 'react-native';

interface ImagePickerModuleInterface {
  pickImage(): Promise<{ uri: string }>;
}

const { ImagePickerModule } = NativeModules;

export default ImagePickerModule as ImagePickerModuleInterface;
