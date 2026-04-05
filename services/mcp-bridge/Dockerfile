# Stage 1: Build the NestJS Backend
FROM node:20-alpine AS server-builder
WORKDIR /app

# Install native compilation toolchain
RUN apk add --no-cache build-base python3

COPY package*.json ./
RUN npm ci
COPY . .
# Output will be generated in /app/dist
RUN npm run build

# Stage 2: Final Production Image
FROM node:20-alpine
WORKDIR /app

# Copy built backend files and install only production dependencies
COPY --from=server-builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=server-builder /app/dist ./dist

# Expose port 3000 for the API
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]