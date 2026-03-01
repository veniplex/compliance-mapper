FROM node:20-alpine
WORKDIR /app

# Non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Drop privileges
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
