# WorkForge — production container image.
# Reliable on container hosts (Render, Railway, Fly.io, a VPS) with a persistent
# volume mounted at /app/data and /app/prisma for the SQLite DB + uploads.
FROM node:20-slim

# Prisma needs openssl on Debian-based images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
# Build generates the Prisma client (for this image's platform) and the Next app.
RUN npm run build

EXPOSE 3000

# Persist SQLite DB + uploaded documents across deploys.
VOLUME ["/app/data", "/app/prisma"]

# Apply schema on boot (no-op if already in sync), then start.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
