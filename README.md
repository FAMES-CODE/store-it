# Store it

Store it is a personal file-storage application built as a portfolio project. It provides private file organization, browser-native previews, temporary share links, and per-account storage quotas in a focused, responsive interface.

## Features

- Email and password authentication with persistent JWT sessions.
- Protected dashboard for folders and files.
- Create, rename, and delete folders and files.
- Upload files up to 50 MB each, with a 5 GiB storage quota per account.
- Download originals and preview browser-supported formats without a third-party viewer:
  - Images, audio, and video use native HTML media elements.
  - PDFs, text files, and other browser-renderable formats use a sandboxed inline frame.
- Generate temporary public share links with configurable expiry.
- Shared-link history, active/expired status, and visit counts.
- Responsive light and dark themes.

## Stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS 4
- shadcn-style UI components built on Base UI
- Auth.js with the Credentials provider
- Prisma ORM 7 with PostgreSQL

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` using the following required variables:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
   AUTH_SECRET="replace-with-a-long-random-secret"
   ```

3. Apply database migrations and generate Prisma Client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), create an account, and start uploading files.

## Scripts

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript checks
npm run build     # Create a production build
```

## Storage notes

Uploaded file content is saved to the local `uploads/` directory, while file metadata, storage usage, users, folders, and share links are stored in PostgreSQL. The `uploads/` directory is intentionally excluded from Git.

For production, replace the local file storage adapter in `lib/storage.ts` with object storage such as Amazon S3, Cloudflare R2, or another durable provider.
