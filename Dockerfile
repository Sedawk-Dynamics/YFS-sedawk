# syntax=docker/dockerfile:1

# ── Dependencies ────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Prisma client is generated into lib/generated, which the build imports.
RUN pnpm prisma generate

# Build-time placeholders: nothing here connects to the database or reads real
# secrets, but the modules that hold them are imported during the build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ENV ENCRYPTION_KEY="YnVpbGQtdGltZS1wbGFjZWhvbGRlci0zMi1ieXRlcyE="

RUN pnpm build

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

# `prisma`, `dotenv` and `tsx` are runtime dependencies here on purpose: the
# container applies migrations on start and needs `pnpm admin:create` to be
# runnable in a shell against the live database.
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
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
