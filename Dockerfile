FROM node:20-alpine
WORKDIR /app

# Non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install all dependencies (including dev deps for CSS build)
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build CSS bundle and then remove dev dependencies
RUN npm run build:css && npm prune --omit=dev

# Drop privileges
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
