// ================================================================
// Pool de conexiones PostgreSQL para el Product Service
// Trabaja con schemas: inventory, auth, rbac, public
// ================================================================
import pg     from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

pool.on('connect', () => {
  console.log('✅ [Product Service] PostgreSQL conectado')
})

pool.on('error', (err) => {
  console.error('❌ [Product Service] Error en pool PostgreSQL:', err.message)
  process.exit(1)
})

export default pool
