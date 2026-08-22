# --- Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public (browser-visible) env vars must be present at BUILD time in Next.js —
# pass them in via `docker build --build-arg` (see docker-compose.yml).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=$NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
RUN npm run build

# --- Runtime ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 nodejs && adduser -S techarcade -u 1001

# `output: "standalone"` in next.config.js means only the files actually
# needed to run the server get copied — no full node_modules in the final image.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=techarcade:nodejs /app/.next/standalone ./
COPY --from=builder --chown=techarcade:nodejs /app/.next/static ./.next/static

USER techarcade
EXPOSE 3000
CMD ["node", "server.js"]
