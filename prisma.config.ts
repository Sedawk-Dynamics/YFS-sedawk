import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Read directly rather than via env(), which throws when the variable is
    // absent. `prisma generate` needs no database, and runs during the Docker
    // image build where no URL exists; commands that do need one (migrate,
    // studio, seed) fail clearly against this placeholder, and the container
    // entrypoint refuses to start without a real DATABASE_URL.
    url: process.env.DATABASE_URL ?? 'postgresql://unset:unset@localhost:5432/unset',
  },
})
