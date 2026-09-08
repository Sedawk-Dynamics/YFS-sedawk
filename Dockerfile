# syntax=docker/dockerfile:1

# ── Dependencies ────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable

# postinstall runs `prisma generate`, which needs the schema and config.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerate against the full source tree; output lands in lib/generated.
RUN pnpm prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

# Placeholders for modules that read these at import time. Nothing here reaches
# a database or a real secret, and they do not persist into the final image.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    AUTH_SECRET="build-time-placeholder-not-used-at-runtime" \
    ENCRYPTION_KEY="YnVpbGQtdGltZS1wbGFjZWhvbGRlci0zMi1ieXRlcyE=" \
    pnpm build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

RUN corepack enable
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Uploaded KYC documents and salary slips live here. Mount a volume at this
# path or every redeploy loses them.
ENV UPLOAD_DIR=/app/uploads

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Prisma files are needed because pnpm install runs the postinstall script
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /app/uploads \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app/uploads /app/.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["pnpm", "start"]
