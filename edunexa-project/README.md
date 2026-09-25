<<<<<<< HEAD
=======
# EduNexa

EduNexa is a connected education platform with separate frontend and backend applications for students, teachers, and administrators.

## Project Structure

```text
client/   Next.js frontend
server/   Express.js API, Prisma, and Socket.IO backend
```

## Requirements

- Node.js 20+
- PostgreSQL or Supabase PostgreSQL database
- Supabase project credentials
- Gemini API key for AI features

## Configuration

Create local environment files from the templates:

```bash
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

Configure the database, Supabase, JWT, admin code, and Gemini values in `server/.env`. Configure only public Supabase values and the API URL in `client/.env.local`.

Never commit real `.env` or `.env.local` files.

## Install

Install each application independently:

```bash
cd server && npm install
cd ../client && npm install
```

## Development

Start the API server:

```bash
cd server
npm run dev
```

The API runs at `http://localhost:3000` and exposes versioned routes under `/api/v1`.

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

The frontend runs at `http://localhost:3001`.

## Prisma

From the `server` directory:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:push
```

Use `prisma:push` only when you intend to synchronize the configured database with the Prisma schema.

## Production Checks

```bash
cd server && npm run check
cd ../client && npm run build
```
>>>>>>> 586cb03 (first commit)
# edunexa_SIH
# edunexa_SIH
