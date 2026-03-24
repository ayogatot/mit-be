import { Hono } from 'hono'
import authRoutes from './interface-adapters/routes/auth.routes'
import recommendationRoutes from './interface-adapters/routes/recommendation.routes'
import swipeRoutes from './interface-adapters/routes/swipe.routes'
import locationRoutes from './interface-adapters/routes/location.routes'
import adminRoutes from './interface-adapters/routes/admin.routes'
import { jwtMiddleware } from './interface-adapters/middleware/jwtMiddleware'
import { successResponse } from './infrastructure/utils/response'

const app = new Hono()

// Health check
app.get('/', (c) => successResponse(c, null, 'Hello Mit-BE Dating App!'))
app.get('/health', (c) => successResponse(c, { status: 'ok' }, 'Service is healthy'))

// Register Routes
app.route('/auth', authRoutes)

// Protected Routes
const protectedRoutes = new Hono()
protectedRoutes.use('/*', jwtMiddleware)

// Mounting logic behind JWT
protectedRoutes.route('/profiles', recommendationRoutes)
protectedRoutes.route('/swipes', swipeRoutes)
protectedRoutes.route('/locations', locationRoutes)
protectedRoutes.route('/admin', adminRoutes)

app.route('/api', protectedRoutes)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
