// ================================================================
// Entry point del RBAC Service
// ================================================================
import express    from 'express'
import helmet     from 'helmet'
import dotenv     from 'dotenv'
import rolesRoutes from './routes/roles.routes.js'
import usersRoutes from './routes/users.routes.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3002

app.use(helmet())
app.use(express.json({ limit: '10kb' }))

app.use('/api/roles', rolesRoutes)
app.use('/api/users', usersRoutes)

app.get('/health', (_req, res) => {
  res.json({ service: 'rbac-service', status: 'ok', timestamp: new Date().toISOString() })
})

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

app.listen(PORT, () => {
  console.log(`👥 [RBAC Service] corriendo en puerto ${PORT}`)
})
