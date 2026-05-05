// ================================================================
// Caso → Fase 1: Manejo de sesiones con JWT
// Dos tipos de token:
//   - tempToken: después del login, antes de verificar MFA (5 min)
//   - accessToken: JWT completo tras MFA exitoso (8h)
// ================================================================
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET

// Token temporal: solo contiene userId y flag mfaPending
// Se emite tras login exitoso, antes de verificar TOTP
export function generateTempToken(userId) {
  return jwt.sign(
    { userId, mfaPending: true },
    SECRET,
    { expiresIn: process.env.JWT_MFA_TEMP_EXPIRES_IN || '5m' }
  )
}

// Token completo: contiene toda la info necesaria para RBAC y ABAC
// Se emite solo tras verificación TOTP exitosa
// Caso → Flujo MFA paso 6: acceso concedido + token JWT completo
export function generateAccessToken(payload) {
  const { userId, email, rol, tiendaId, nombreCompleto } = payload
  return jwt.sign(
    { userId, email, rol, tiendaId, nombreCompleto },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )
}

// Verifica y decodifica cualquier token
export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}
