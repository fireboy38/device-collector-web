# ==============================
# Stage 1: Dependencies
# ==============================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bun run db:generate

# ==============================
# Stage 2: Build
# ==============================
FROM node:20-alpine AS builder
WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client again for build
RUN bun run db:generate

# Build the Next.js application
# Note: ignoreBuildErrors is set in next.config.ts
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ==============================
# Stage 3: Production
# ==============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for runtime DB setup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:./data/device-collector.db"

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
set -e

# Run database migrations/push
cd /app
npx prisma db push --skip-generate 2>/dev/null || true

# Start the application
exec node server.js
EOF

RUN chmod +x /app/start.sh && chown nextjs:nodejs /app/start.sh

USER nextjs

EXPOSE 3000

CMD ["/app/start.sh"]
