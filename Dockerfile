# Stage 1: Build the React client
FROM node:22-alpine AS builder
WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js server with Python
FROM node:22-bookworm-slim
WORKDIR /app

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment and set it in PATH
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install PyTorch (CPU only to save space) and sentence-transformers
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir sentence-transformers

# Pre-download the IndoBERT model to bake it into the Docker image (prevents downloading on cold starts)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('indobenchmark/indobert-base-p1')"

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
