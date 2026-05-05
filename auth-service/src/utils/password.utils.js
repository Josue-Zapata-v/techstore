// ================================================================
// Caso → Fase 1: Validaciones de contraseña segura
// Requisito: mínimo 8 chars, mayúscula, número, carácter especial
// ================================================================
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

// Hashea una contraseña en texto plano
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS)
}

// Compara contraseña plana con hash almacenado
export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash)
}

// Valida que la contraseña cumpla los requisitos del caso
// Caso → Registro: mínimo 8 chars, mayúscula, número, carácter especial
export function validatePasswordStrength(password) {
  const errors = []

  if (password.length < 8)
    errors.push('Mínimo 8 caracteres')

  if (!/[A-Z]/.test(password))
    errors.push('Al menos una letra mayúscula')

  if (!/[0-9]/.test(password))
    errors.push('Al menos un número')

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push('Al menos un carácter especial (!@#$%...)')

  return {
    valid:  errors.length === 0,
    errors
  }
}
