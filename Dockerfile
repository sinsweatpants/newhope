# Multi-stage Docker build for production deployment
# Stage 1: Build environment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY configs/ ./configs/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY apps/ ./apps/
COPY packages/ ./packages/

# Build the application
RUN npm run build

# Stage 2: Production environment
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    cairo \
    pango \
    giflib \
    librsvg \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package*.json ./

# Copy static assets if needed
COPY --chown=app:app public/ ./public/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/cache && \
    chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]