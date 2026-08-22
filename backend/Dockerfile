# --- Build stage: install dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user — standard container hardening
RUN addgroup -g 1001 nodejs && adduser -S techarcade -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER techarcade

EXPOSE 5000
CMD ["node", "server.js"]
