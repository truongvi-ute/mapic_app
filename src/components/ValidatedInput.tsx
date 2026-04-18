import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ValidatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  showError?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  errorStyle?: any;
  isPassword?: boolean;
}

export default function ValidatedInput({
  label,
  error,
  showError = true,
  containerStyle,
  inputStyle,
  errorStyle,
  isPassword = false,
  ...textInputProps
}: ValidatedInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error && showError;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            hasError && styles.inputError,
            inputStyle,
          ]}
          placeholderTextColor="#C7C7CD"
          secureTextEntry={isPassword && !showPassword}
          {...textInputProps}
        />
        
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color="#8E8E93" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {hasError && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
});
