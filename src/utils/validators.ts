export const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPincode = (pincode: string): boolean => {
  const cleanPin = pincode.replace(/\D/g, '');
  return cleanPin.length === 6;
};

export const isNotEmpty = (val?: string): boolean => {
  return typeof val === 'string' && val.trim().length > 0;
};
