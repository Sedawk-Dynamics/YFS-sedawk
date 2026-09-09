# Deploying to Dokploy

The app is a single Docker image. Uploaded KYC documents and salary slips are
written to a **mounted volume**, not a CDN, so they survive redeploys.

## 1. Create the database

In Dokploy: **Project → Create Service → Database → PostgreSQL 17**.

Copy the internal connection string it gives you. It looks like:

```
postgresql://postgres:PASSWORD@yfs-postgres-abc123:5432/postgres
```

Use the **internal** host, not a public one — the app and database talk over
Dokploy's private network.

## 2. Create the application

**Project → Create Service → Application**, pointed at this repository.

- **Build Type:** `Dockerfile`
- **Dockerfile Path:** `Dockerfile`
- **Port:** `3000`

## 3. Mount the uploads volume

This is the step that matters. Without it, every redeploy destroys every
uploaded document.

**Advanced → Volumes → Add Volume**

| Field | Value |
| --- | --- |
| Mount Type | `Volume` |
| Volume Name | `yfs-data` |
| Mount Path | `/app/uploads` |

Click **Redeploy** afterwards — Dokploy does not apply mount changes until you do.

## 4. Environment variables

**Environment → Environment Variables.** Generate the two secrets locally first:

```bash
openssl rand -base64 48   # AUTH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
```

```sh
# Paste the internal connection string from your Dokploy Postgres service.
# Keep the real password out of this file — it is committed to the repository.
DATABASE_URL="postgresql://postgres:<password>@<internal-host>:5432/postgres"
AUTH_SECRET="<48-byte value>"
ENCRYPTION_KEY="<32-byte value>"
NEXT_PUBLIC_APP_URL="https://portal.yfsinfinity.com"

# Storage — writes to the volume mounted above.
STORAGE_DRIVER="disk"
UPLOAD_DIR="/app/uploads"

# Email. Without these, OTPs and notifications only reach the container logs.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="you@yourdomain.com"
SMTP_PASS="<app password>"
SMTP_FROM="YFS Infinity <you@yourdomain.com>"

NODE_ENV="production"
```

**`ENCRYPTION_KEY` cannot be rotated casually.** It decrypts stored Aadhaar and
bank account numbers; changing it makes existing records unreadable. Back it up
somewhere you will still have in a year.

Do **not** set `OTP_ECHO` in production. It is ignored when `NODE_ENV=production`,
but leaving it out avoids any doubt.

## 5. Deploy

Press **Deploy**. On start the container:

1. checks `DATABASE_URL`, `AUTH_SECRET` and `ENCRYPTION_KEY` are set, and exits
   with a clear message if not;
2. confirms `/app/uploads` exists and is writable;
3. runs `prisma migrate deploy` to bring the schema up to date;
4. starts Next.js on port 3000.

Watch the deploy logs for `Uploads directory ready` and
`Applying database migrations...`.

## 6. Create the first admin

There is no admin signup page by design. Open the container's terminal in
Dokploy (**Application → Terminal**) and run:

```bash
pnpm admin:create -- --email ops@yfsinfinity.com --name "Ops Lead"
```

It prints a generated password **once**. Save it immediately, then sign in at
`https://your-domain/admin/login` and change it under Account → Change Password.

Optionally seed the admin-configurable loan types:

```bash
pnpm db:seed
```

`db:seed` skips admin creation if an admin already exists, so it is safe to run
after the step above.

## 7. Domain and TLS

**Domains → Add Domain**, point it at port `3000`, and enable Let's Encrypt.
Then set `NEXT_PUBLIC_APP_URL` to the final `https://` URL and redeploy, so the
links in outbound email are correct.

---

## Backups

Two things must be backed up, and they are useless without each other:

| What | Why |
| --- | --- |
| The Postgres database | Every record, including encrypted PII |
| The `yfs-data` volume | Every KYC document and salary slip |

Plus `ENCRYPTION_KEY` itself, stored separately from both — without it a database
backup cannot be decrypted.

Dokploy's built-in database backups cover the first. For the volume, schedule a
job that archives `/app/uploads` to object storage.

## Switching to Cloudinary later

The storage layer sits behind an interface, so moving to a CDN is a
configuration change:

```sh
STORAGE_DRIVER="cloudinary"
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

Files already on the volume keep being served from it — `resolve()` in
`lib/storage.ts` checks disk first — so the switch is not retroactive and needs
no migration. Verify credentials before switching with `pnpm check:cloudinary`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `FATAL: DATABASE_URL is not set` | Environment variables were not saved before deploying |
| `FATAL: /app/uploads is not writable` | Volume not mounted, or mounted at the wrong path |
| Documents vanish after a redeploy | No volume mounted — uploads went to the container's ephemeral filesystem |
| Uploads fail with 413 | A proxy in front of Dokploy caps the body size; the app allows 32 MB |
| OTPs never arrive | `SMTP_*` not set — check the container logs, where they are printed instead |
| Login works, dashboard redirects to login | The DSA is not approved yet; approve them in the admin panel |
