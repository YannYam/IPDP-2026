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
RUN pip install --no-cache-dir "torch>=2.6.0" --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir sentence-transformers

# Pre-download the IndoBERT model to bake it into the Docker image (prevents downloading on cold starts)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('indobenchmark/indobert-base-p1')"

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

# Copy server source code
COPY server/ ./

# Expose port 3002
EXPOSE 3002

# Start the Node.js server
CMD ["node", "server.js"]
