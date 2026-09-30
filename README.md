<div align="center">

# 📦 Store it

**A personal cloud file-storage app with private folders, native previews, and expiring share links.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

· [Report a bug](https://github.com/FAMES-CODE/store-it/issues)

</div>

---

## Overview

**Store it** is a full-stack file-storage application built as a portfolio project. Users can sign up, organize files into folders, preview them directly in the browser, and share them through temporary public links, all within a per-account storage quota.

The goal was to build a realistic, production-minded app that covers authentication, relational data modeling, file handling, access control, and a responsive UI.


## Features

**Account & security**
- Email/password authentication with persistent JWT sessions (Auth.js)
- Protected dashboard: files and folders are private to their owner

**File management**
- Create, rename, and delete folders and files
- Upload files up to **50 MB** each
- **5 GiB** storage quota per account, tracked in the database
- Download original files at any time

**Previews (no third-party viewer)**
- Images, audio, and video via native HTML media elements
- PDFs, text, and other browser-renderable formats via a sandboxed inline frame

**Sharing**
- Generate temporary public links with configurable expiry
- Shared-link history with active/expired status and visit counts

**UX**
- Fully responsive layout
- Light and dark themes

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling / UI | Tailwind CSS 4, shadcn-style components on Base UI |
| Auth | Auth.js (Credentials provider, JWT sessions) |
| Database | PostgreSQL with Prisma ORM 7 |
| Tooling | ESLint, Prettier |

## Architecture

```
┌────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Browser   │ ──▶ │  Next.js (App Router) │ ──▶ │  PostgreSQL  │
│  (React)   │ ◀── │  Server actions / API │     │  users, files│
└────────────┘     └──────────┬───────────┘     │  folders,    │
                              │                 │  share links │
                              ▼                 └──────────────┘
                     ┌─────────────────┐
                     │ Storage adapter │  → local `uploads/` (dev)
                     │ lib/storage.ts  │  → S3 / R2 (production)
                     └─────────────────┘
```

- **File content** is stored through a storage adapter (`lib/storage.ts`), currently writing to the local `uploads/` directory.
- **Metadata** (users, folders, files, quota usage, share links) lives in PostgreSQL.
- The storage layer is isolated behind one module, so switching to object storage doesn't touch the rest of the app.

## Project structure

```
app/          Routes, layouts, and pages (App Router)
components/   Reusable UI components
hooks/        Custom React hooks
lib/          Shared logic (auth, database client, storage adapter…)
prisma/       Schema and migrations
public/       Static assets
types/        Shared TypeScript types
```

## Getting started

### Prerequisites
- Node.js 20+ (TODO: confirm the minimum version)
- A PostgreSQL database

### Installation

```bash
git clone https://github.com/FAMES-CODE/store-it.git
cd store-it
npm install
```

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
AUTH_SECRET="replace-with-a-long-random-secret"
```

> Generate a secret with `openssl rand -base64 32`.

Apply the migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start uploading.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run build` | Create a production build |

## Production notes

Local disk storage is fine for development but not for production (ephemeral or non-shared filesystems). Before deploying, replace the adapter in `lib/storage.ts` with durable object storage such as **Amazon S3** or **Cloudflare R2**.

## What I learned

- Designing a relational schema for hierarchical data (nested folders) with Prisma
- Enforcing ownership checks and quotas on the server
- Serving user-uploaded content safely (sandboxed previews, access control on share links)
- Structuring a Next.js App Router project around server-side logic

## Author

**Amine Ferkani**
[LinkedIn](https://linkedin.com/in/amineferkani) · [GitHub](https://github.com/FAMES-CODE)