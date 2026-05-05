// ================================================================
// Caso → Fase 1 completa: Registro, Login, MFA Setup, MFA Verify
// Cubre requisitos:
//   - Registro con validación de contraseña segura
//   - Login con bloqueo tras 5 intentos fallidos
//   - Generación de TOTP secret + QR para Google Authenticator
//   - Verificación TOTP y emisión de JWT completo
// ================================================================
import pool                from '../config/db.js'
import { hashPassword, verifyPassword }     from '../utils/password.utils.js'
import { generateTempToken, generateAccessToken } from '../utils/jwt.utils.js'
import {
  generateTotpSecret,
  generateOtpauthUrl,
  generateQRCode,
  verifyTotpCode
} from '../utils/totp.utils.js'

// ────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Caso → Fase 1 - Parte 1: Registro de usuarios
// Crea usuario, genera TOTP secret, devuelve QR para escanear
// ────────────────────────────────────────────────────────────────
export async function register(req, res) {
  const client = await pool.connect()

  try {
    const { email, password, nombreCompleto, tiendaId } = req.body

    await client.query('BEGIN')

    // Verificar si el email ya existe
    const existingUser = await client.query(
      'SELECT id FROM auth.usuarios WHERE email = $1',
      [email]
    )
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      })
    }

    // Verificar que la tienda existe (si se proporcionó)
    if (tiendaId) {
      const tienda = await client.query(
        'SELECT id FROM public.tiendas WHERE id = $1 AND activo = true',
        [tiendaId]
      )
      if (tienda.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: 'La tienda especificada no existe'
        })
      }
    }

    // Hashear contraseña con bcrypt (saltRounds=12)
    const passwordHash = await hashPassword(password)

    // Generar TOTP secret para Google Authenticator
    // Caso → MFA Opción A: TOTP
    const totpSecret = generateTotpSecret()

    // Insertar usuario en DB
    const result = await client.query(
      `INSERT INTO auth.usuarios
         (email, password_hash, nombre_completo, tienda_id, mfa_secret, mfa_habilitado)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, email, nombre_completo, tienda_id`,
      [email, passwordHash, nombreCompleto, tiendaId || null, totpSecret]
    )

    const newUser = result.rows[0]

    // Asignar rol Empleado por defecto
    await client.query(
      `INSERT INTO rbac.usuario_roles (usuario_id, rol_id)
       SELECT $1, id FROM rbac.roles WHERE nombre = 'Empleado'`,
      [newUser.id]
    )

    await client.query('COMMIT')

    // Generar QR code para que el usuario escanee con Google Authenticator
    const otpauthUrl = generateOtpauthUrl(totpSecret, email)
    const qrCodeBase64 = await generateQRCode(otpauthUrl)

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado. Escanea el QR con Google Authenticator para activar MFA.',
      data: {
        userId:        newUser.id,
        email:         newUser.email,
        nombreCompleto: newUser.nombre_completo,
        mfa: {
          qrCode:     qrCodeBase64,
          secret:     totpSecret,   // mostrar solo en registro para backup
          setupRequired: true
        }
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Auth] Error en register:', error)
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  } finally {
    client.release()
  }
}

// ────────────────────────────────────────────────────────────────
// POST /api/auth/mfa/setup/confirm
// Caso → Flujo MFA: confirmar primer código tras escanear QR
// Activa MFA en la cuenta del usuario
// ────────────────────────────────────────────────────────────────
export async function confirmMfaSetup(req, res) {
  try {
    const { userId, totpCode } = req.body

    const result = await pool.query(
      'SELECT mfa_secret, mfa_habilitado FROM auth.usuarios WHERE id = $1 AND activo = true',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const { mfa_secret, mfa_habilitado } = result.rows[0]

    if (mfa_habilitado) {
      return res.status(400).json({
        success: false,
        message: 'MFA ya está activado en esta cuenta'
      })
    }

    // Verificar primer código TOTP
    const isValid = verifyTotpCode(totpCode, mfa_secret)
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido. Verifica que el QR fue escaneado correctamente.'
      })
    }

    // Activar MFA en la cuenta
    await pool.query(
      'UPDATE auth.usuarios SET mfa_habilitado = true WHERE id = $1',
      [userId]
    )

    return res.json({
      success: true,
      message: 'MFA activado correctamente. Tu cuenta ahora está protegida con Google Authenticator.'
    })

  } catch (error) {
    console.error('[Auth] Error en confirmMfaSetup:', error)
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
}

// ────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Caso → Fase 1 - Parte 1: Login básico
// Valida credenciales, gestiona intentos fallidos y bloqueo
// Si es correcto emite tempToken y solicita código MFA
// ────────────────────────────────────────────────────────────────
export async function login(req, res) {
  try {
    const { email, password } = req.body

    // Buscar usuario con su rol
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.password_hash,
         u.nombre_completo,
         u.tienda_id,
         u.mfa_habilitado,
         u.mfa_secret,
         u.intentos_fallidos,
         u.bloqueado_hasta,
         u.activo,
         r.nombre AS rol
       FROM auth.usuarios u
       LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN rbac.roles r ON r.id = ur.rol_id
       WHERE u.email = $1`,
      [email]
    )

    // Respuesta genérica para no revelar si el email existe
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    const user = result.rows[0]

    // Verificar si la cuenta está activa
    if (!user.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.'
      })
    }

    // Verificar bloqueo por intentos fallidos
    // Caso → Login: bloqueo después de 5 intentos
    if (user.bloqueado_hasta && new Date() < new Date(user.bloqueado_hasta)) {
      const minutosRestantes = Math.ceil(
        (new Date(user.bloqueado_hasta) - new Date()) / 60000
      )
      return res.status(423).json({
        success: false,
        message: `Cuenta bloqueada. Intenta en ${minutosRestantes} minuto(s).`
      })
    }

    // Verificar contraseña
    const passwordOk = await verifyPassword(password, user.password_hash)

    if (!passwordOk) {
      // Incrementar intentos fallidos
      const nuevosIntentos = user.intentos_fallidos + 1
      const bloqueado = nuevosIntentos >= 5

      await pool.query(
        `UPDATE auth.usuarios
         SET intentos_fallidos = $1,
             bloqueado_hasta   = $2
         WHERE id = $3`,
        [
          bloqueado ? 0 : nuevosIntentos,
          bloqueado ? new Date(Date.now() + 15 * 60 * 1000) : null,
          user.id
        ]
      )

      if (bloqueado) {
        return res.status(423).json({
          success: false,
          message: 'Cuenta bloqueada por 15 minutos tras 5 intentos fallidos.'
        })
      }

      return res.status(401).json({
        success: false,
        message: `Credenciales inválidas. Intentos restantes: ${5 - nuevosIntentos}`
      })
    }

    // Credenciales correctas → resetear intentos fallidos
    await pool.query(
      'UPDATE auth.usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
      [user.id]
    )

    // Si MFA no está habilitado aún (usuario recién registrado)
    if (!user.mfa_habilitado) {
      return res.status(200).json({
        success: true,
        message: 'Debes activar MFA antes de continuar.',
        data: {
          mfaSetupRequired: true,
          userId: user.id
        }
      })
    }

    // MFA habilitado → emitir tempToken y solicitar código TOTP
    // Caso → Flujo MFA paso 2: sistema solicita código MFA
    const tempToken = generateTempToken(user.id)

    return res.status(200).json({
      success: true,
      message: 'Credenciales válidas. Ingresa el código de Google Authenticator.',
      data: {
        mfaRequired: true,
        tempToken
      }
    })

  } catch (error) {
    console.error('[Auth] Error en login:', error)
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
}

// ────────────────────────────────────────────────────────────────
// POST /api/auth/mfa/verify
// Caso → Flujo MFA pasos 3-6: verificar código TOTP
// Si es correcto emite JWT completo con rol y tiendaId
// ────────────────────────────────────────────────────────────────
export async function verifyMfa(req, res) {
  try {
    const { tempToken, totpCode } = req.body

    // Importar verifyToken aquí para evitar dependencia circular
    const { verifyToken } = await import('../utils/jwt.utils.js')

    // Verificar tempToken
    let decoded
    try {
      decoded = verifyToken(tempToken)
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token temporal inválido o expirado. Inicia sesión nuevamente.'
      })
    }

    if (!decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido para verificación MFA'
      })
    }

    // Obtener datos completos del usuario con su rol
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.nombre_completo,
         u.tienda_id,
         u.mfa_secret,
         u.mfa_habilitado,
         r.nombre AS rol
       FROM auth.usuarios u
       LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN rbac.roles r ON r.id = ur.rol_id
       WHERE u.id = $1 AND u.activo = true`,
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    const user = result.rows[0]

    // Verificar código TOTP con Google Authenticator
    // Caso → Flujo MFA paso 5: usuario ingresa código MFA
    const isValid = verifyTotpCode(totpCode, user.mfa_secret)

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Código MFA inválido o expirado. Intenta con el código actual.'
      })
    }

    // Código correcto → emitir JWT completo
    // Caso → Flujo MFA paso 6: acceso concedido + token JWT completo
    const accessToken = generateAccessToken({
      userId:         user.id,
      email:          user.email,
      rol:            user.rol,
      tiendaId:       user.tienda_id,
      nombreCompleto: user.nombre_completo
    })

    return res.status(200).json({
      success: true,
      message: 'Autenticación completada exitosamente.',
      data: {
        accessToken,
        user: {
          id:             user.id,
          email:          user.email,
          nombreCompleto: user.nombre_completo,
          rol:            user.rol,
          tiendaId:       user.tienda_id
        }
      }
    })

  } catch (error) {
    console.error('[Auth] Error en verifyMfa:', error)
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
}

// ────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Retorna datos del usuario autenticado desde el JWT
// ────────────────────────────────────────────────────────────────
export async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.nombre_completo,
         u.tienda_id,
         u.mfa_habilitado,
         u.activo,
         u.fecha_creacion,
         r.nombre  AS rol,
         t.nombre  AS tienda_nombre
       FROM auth.usuarios u
       LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN rbac.roles r ON r.id = ur.rol_id
       LEFT JOIN public.tiendas t ON t.id = u.tienda_id
       WHERE u.id = $1`,
      [req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    return res.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('[Auth] Error en getMe:', error)
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
}

// ────────────────────────────────────────────────────────────────
// GET /api/auth/mfa/setup/:userId
// Genera TOTP secret si el usuario no tiene uno y devuelve QR
// Permite que usuarios creados via seed/admin configuren MFA
// ────────────────────────────────────────────────────────────────
export async function getMfaSetup(req, res) {
  try {
    const { userId } = req.params

    const result = await pool.query(
      'SELECT id, email, mfa_secret, mfa_habilitado FROM auth.usuarios WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    const user = result.rows[0]

    if (user.mfa_habilitado) {
      return res.status(400).json({ success: false, message: 'MFA ya está activado' })
    }

    // Si no tiene secret, generarlo ahora
    let secret = user.mfa_secret
    if (!secret) {
      secret = generateTotpSecret()
      await pool.query(
        'UPDATE auth.usuarios SET mfa_secret = $1 WHERE id = $2',
        [secret, userId]
      )
    }

    const otpauthUrl  = generateOtpauthUrl(secret, user.email)
    const qrCodeBase64 = await generateQRCode(otpauthUrl)

    return res.json({
      success: true,
      data: {
        userId: user.id,
        email:  user.email,
        qrCode: qrCodeBase64,
        secret
      }
    })
  } catch (error) {
    console.error('[Auth] Error en getMfaSetup:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}
