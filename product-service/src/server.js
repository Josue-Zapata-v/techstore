// ================================================================
// Entry point del Product Service
// ================================================================
import express         from 'express'
import helmet          from 'helmet'
import dotenv          from 'dotenv'
import productsRoutes  from './routes/products.routes.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3003

app.use(helmet())
app.use(express.json({ limit: '10kb' }))

app.use('/api/products', productsRoutes)

app.get('/health', (_req, res) => {
  res.json({ service: 'product-service', status: 'ok', timestamp: new Date().toISOString() })
})

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

app.listen(PORT, () => {
  console.log(`📦 [Product Service] corriendo en puerto ${PORT}`)
})
