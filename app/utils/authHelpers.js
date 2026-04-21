function validateEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { valid: false, message: 'El correo es requerido' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Formato de correo inválido' };
  }

  return { valid: true, message: '' };
}

function validatePasswordRules(password, isRegistering) {
  if (!password) {
    return { valid: false, message: 'La contraseña es requerida' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }

  if (isRegistering && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Debe contener mayúscula, minúscula y número' };
  }

  return { valid: true, message: '' };
}

module.exports = {
  validateEmailFormat,
  validatePasswordRules,
};
