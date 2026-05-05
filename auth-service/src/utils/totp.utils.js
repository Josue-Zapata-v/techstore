// ================================================================
// Caso → Fase 1 - Parte 2: Autenticación Multi-Factor (MFA)
// Opción A: TOTP - Time-based One-Time Password
// Librería: otplib (implementa RFC 6238)
// Compatible con Google Authenticator
// ================================================================
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Configuración del autenticador
// window: 1 permite un código anterior/siguiente (tolerancia de reloj)
authenticator.options = {
  window: 1,
  step:   30   // código cambia cada 30 segundos
}

const APP_NAME = 'TechStore'

// Genera un nuevo secret TOTP para un usuario
// Se almacena en auth.usuarios.mfa_secret (encriptado en DB)
export function generateTotpSecret() {
  return authenticator.generateSecret()
}

// Genera la URL otpauth:// que Google Authenticator puede leer
export function generateOtpauthUrl(secret, userEmail) {
  return authenticator.keyuri(userEmail, APP_NAME, secret)
}

// Genera el QR code como base64 para mostrar en el frontend
// El usuario lo escanea con Google Authenticator
export async function generateQRCode(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl)
}

// Verifica el código de 6 dígitos ingresado por el usuario
// Caso → Flujo MFA paso 5: usuario ingresa código MFA
export function verifyTotpCode(token, secret) {
  return authenticator.verify({ token, secret })
}
