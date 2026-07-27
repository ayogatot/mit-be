import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from 'hono/bun'
import type { Context, Next } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { errorResponse } from './infrastructure/utils/response'
import authRoutes from './interface-adapters/routes/auth.routes'
import recommendationRoutes from './interface-adapters/routes/recommendation.routes'
import swipeRoutes from './interface-adapters/routes/swipe.routes'
import locationRoutes from './interface-adapters/routes/location.routes'
import adminRoutes from './interface-adapters/routes/admin.routes'
import meRoutes from './interface-adapters/routes/me.routes'
import meetsRoutes from './interface-adapters/routes/meets.routes'
import matchesRoutes from './interface-adapters/routes/matches.routes'
import messagesRoutes from './interface-adapters/routes/messages.routes'
import reportsRoutes from './interface-adapters/routes/reports.routes'
import mediaRoutes from './interface-adapters/routes/media.routes'
import lookupsRoutes from './interface-adapters/routes/lookups.routes'
import { jwtMiddleware } from './interface-adapters/middleware/jwtMiddleware'
import { successResponse } from './infrastructure/utils/response'

const apiRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const apiRateLimit = async (c: Context, next: Next) => {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  const now = Date.now()
  const entry = apiRateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    apiRateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
  } else {
    entry.count++
    if (entry.count > 200) {
      return c.json({ ok: false, message: 'Too many requests' }, 429)
    }
  }
  return next()
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env var must be set. Refusing to start without it.')
}

if (!process.env.BASE_URL) {
  console.warn('[WARN] BASE_URL env var not set. Media URLs stored in DB will use localhost fallback and will be unreachable from external clients.')
}

const app = new Hono()

app.use('/*', honoLogger())
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('/*', secureHeaders())
app.use('/uploads/*', serveStatic({ root: './' }))

app.onError((err, c) => {
  console.error('[ERROR]', err.message, err.stack)
  return errorResponse(c, 'Internal Server Error', 500)
})

// Health check
app.get('/', (c) => successResponse(c, null, 'Hello Mit-BE Dating App!'))
app.get('/health', (c) => successResponse(c, { status: 'ok' }, 'Service is healthy'))

// Auth routes (rate-limited internally)
app.route('/auth', authRoutes)

// Public lookup routes (JWT protected, not admin restricted)
const protectedRoutes = new Hono()
protectedRoutes.use('/*', jwtMiddleware)
protectedRoutes.use('/*', apiRateLimit)

protectedRoutes.route('/profiles', recommendationRoutes)
protectedRoutes.route('/swipes', swipeRoutes)
protectedRoutes.route('/locations', locationRoutes)
protectedRoutes.route('/admin', adminRoutes)
protectedRoutes.route('/me', meRoutes)
protectedRoutes.route('/meets', meetsRoutes)
protectedRoutes.route('/matches', matchesRoutes)
protectedRoutes.route('/messages', messagesRoutes)
protectedRoutes.route('/reports', reportsRoutes)
protectedRoutes.route('/media', mediaRoutes)
protectedRoutes.route('/lookups', lookupsRoutes)

app.route('/api', protectedRoutes)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
