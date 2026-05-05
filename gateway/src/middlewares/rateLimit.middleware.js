// ================================================================
// Rate limiting global centralizado en el Gateway
// ================================================================
import rateLimit from 'express-rate-limit'

// Límite general para todas las rutas
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta en 15 minutos.'
  }
})

// Límite estricto para rutas de autenticación
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intenta en 15 minutos.'
  }
})
