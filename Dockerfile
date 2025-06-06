# Multi-stage build for minimal image size
FROM node:18-alpine AS base
RUN apk add --no-cache dumb-init wget
WORKDIR /app

# Build frontend
FROM base AS frontend-build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm cache clean --force && npm install
COPY frontend ./frontend/

# Create production build with environment variables
ENV REACT_APP_API_URL=http://localhost:4010
RUN cd frontend && npm run build

# Build backend dependencies
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm cache clean --force && npm install --only=production

# Final production image
FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init tini wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy backend dependencies and code
COPY --from=backend-deps --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

# Copy backend files explicitly
COPY --chown=nodejs:nodejs backend/package*.json ./backend/
COPY --chown=nodejs:nodejs backend/server.js ./backend/
COPY --chown=nodejs:nodejs backend/seed.js ./backend/
COPY --chown=nodejs:nodejs backend/.env ./backend/
COPY --chown=nodejs:nodejs backend/db ./backend/db/
COPY --chown=nodejs:nodejs backend/routes ./backend/routes/
COPY --chown=nodejs:nodejs backend/middleware ./backend/middleware/

# Copy built frontend
COPY --from=frontend-build --chown=nodejs:nodejs /app/frontend/build ./frontend/build

# Create uploads and database directories with proper permissions
RUN mkdir -p backend/uploads/profiles backend/uploads/issues backend/uploads/comments backend/db && \
    chown -R nodejs:nodejs backend/uploads backend/db && \
    chmod -R 755 backend/uploads backend/db

# Debug: List the backend directory structure
RUN echo "=== Backend directory structure ===" && \
    ls -la backend/ && \
    echo "=== DB directory structure ===" && \
    ls -la backend/db/ && \
    echo "=== Routes directory structure ===" && \
    ls -la backend/routes/ && \
    echo "=== Middleware directory structure ===" && \
    ls -la backend/middleware/

# Install serve globally for frontend
RUN npm install -g serve@14.2.1 && npm cache clean --force

USER nodejs

EXPOSE 4010 3000

# Copy startup script
COPY --chown=nodejs:nodejs start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]