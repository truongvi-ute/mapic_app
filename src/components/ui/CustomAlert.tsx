import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';

const { width } = Dimensions.get('window');

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
}) => {
  const handleButtonPress = (onPress?: () => void) => {
    onClose();
    if (onPress) {
      setTimeout(onPress, 50);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onDismiss={onClose}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.alertContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          
          <View style={styles.footer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              
              return (
                <View key={index} style={styles.buttonWrapper}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleButtonPress(button.onPress)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveText,
                        isCancel && styles.cancelText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: width * 0.75,
    maxWidth: 320,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#050505',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
  },
  buttonWrapper: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1877F2',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  cancelText: {
    color: '#65676B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E6EB',
  },
});

export default CustomAlert;
