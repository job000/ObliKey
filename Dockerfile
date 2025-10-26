# ====================
# Multi-stage build for ObliKey Enterprise
# ====================

# ============================================
# Stage 1: Build Backend
# ============================================
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm install prisma --save-dev

# Copy source code
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Build Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# ============================================
# Stage 3: Production Image
# ============================================
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init (for proper signal handling)
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy backend build
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/package*.json ./
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/prisma ./prisma

# Copy frontend build (to be served by backend)
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./public

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
