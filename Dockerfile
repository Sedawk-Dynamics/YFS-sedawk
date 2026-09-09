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

# The postinstall script runs `prisma generate`, which needs these.
COPY prisma ./prisma
COPY prisma.config.ts ./

# --prod is safe: prisma, dotenv and tsx are runtime dependencies, so the
# container can still migrate on start and run `pnpm admin:create` in a shell.
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./

# A corepack home the runtime user can write to, so `pnpm admin:create` works
# in Dokploy's terminal without trying to re-download pnpm.
ENV COREPACK_HOME=/app/.corepack

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /app/uploads /app/.corepack \
  && corepack prepare pnpm@10.23.0 --activate \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app/uploads /app/.next /app/.corepack

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./node_modules/.bin/next", "start"]
