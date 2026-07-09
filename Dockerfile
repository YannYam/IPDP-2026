# Stage 1: Build the React client
FROM node:22-alpine AS builder
WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js server
FROM node:22-alpine
WORKDIR /app

# Copy the built React app from the builder stage
COPY --from=builder /app/client/dist ./client/dist

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./

# Expose port 3002 (as configured in server.js)
EXPOSE 3002

# Start the server
CMD ["node", "server.js"]
