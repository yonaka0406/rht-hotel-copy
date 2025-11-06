export const validatePhone = (phone) => {
    if (!phone) return true; // Allow empty phone numbers
    const phoneRegex = /^[+]?[\d\s()-]+$/;
    return phoneRegex.test(phone);
};

export const validateEmail = (email) => {
    if (!email) return true; // Allow empty email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
