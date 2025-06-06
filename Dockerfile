# Fixed Dockerfile - ensures db/database.js is copied
FROM node:18-alpine AS base
RUN apk add --no-cache dumb-init wget
WORKDIR /app

# Build frontend
FROM base AS frontend-build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm cache clean --force && npm install
COPY frontend ./frontend/
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

# Copy built frontend
COPY --from=frontend-build --chown=nodejs:nodejs /app/frontend/build ./frontend/build

# Copy backend files one by one to ensure they're copied
COPY --chown=nodejs:nodejs backend/package*.json ./backend/
COPY --chown=nodejs:nodejs backend/server.js ./backend/
COPY --chown=nodejs:nodejs backend/server-embedded.js ./backend/
COPY --chown=nodejs:nodejs backend/seed.js ./backend/

# Create db directory and copy database.js explicitly
RUN mkdir -p ./backend/db
COPY --chown=nodejs:nodejs backend/db/database.js ./backend/db/database.js

# Copy routes and middleware directories
COPY --chown=nodejs:nodejs backend/routes ./backend/routes/
COPY --chown=nodejs:nodejs backend/middleware ./backend/middleware/

# Copy node_modules
COPY --from=backend-deps --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

# Create directories and set permissions
RUN mkdir -p backend/uploads/profiles backend/uploads/issues backend/uploads/comments && \
    chown -R nodejs:nodejs backend && \
    chmod -R 755 backend

# Verify critical files exist (fail build if missing)
RUN test -f "./backend/server.js" || (echo "❌ server.js missing" && exit 1)
RUN test -f "./backend/db/database.js" || (echo "❌ database.js missing" && exit 1)
RUN test -d "./backend/routes" || (echo "❌ routes directory missing" && exit 1)
RUN test -d "./backend/middleware" || (echo "❌ middleware directory missing" && exit 1)

# Show final structure
RUN echo "=== Final verification ===" && \
    ls -la backend/db/ && \
    echo "✅ Build verification complete"

# Install serve for frontend
RUN npm install -g serve@14.2.1 && npm cache clean --force

USER nodejs

EXPOSE 4010 3000

# Copy startup script
COPY --chown=nodejs:nodejs start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]