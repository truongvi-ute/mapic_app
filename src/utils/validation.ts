export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => ValidationResult;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEmailDetailed = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email không được để trống' };
  }
  if (!validateEmail(email)) {
    return { isValid: false, error: 'Email không hợp lệ' };
  }
  return { isValid: true };
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validatePasswordDetailed = (password: string): ValidationResult => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Mật khẩu không được để trống' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }
  return { isValid: true };
};

export const validateUsername = (username: string): ValidationResult => {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Username không được để trống' };
  }
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return { isValid: false, error: 'Username phải có ít nhất 3 ký tự' };
  }
  return { isValid: true };
};

export const validateOTP = (otp: string): ValidationResult => {
  if (!otp || otp.trim() === '') {
    return { isValid: false, error: 'Mã OTP không được để trống' };
  }
  if (!/^\d{6}$/.test(otp)) {
    return { isValid: false, error: 'Mã OTP phải là 6 chữ số' };
  }
  return { isValid: true };
};

export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return { isValid: false, error: 'Vui lòng xác nhận mật khẩu' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Mật khẩu xác nhận không khớp' };
  }
  return { isValid: true };
};
