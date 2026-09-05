# StayFlat

StayFlat helps perpetual-futures traders review their public wallet activity, identify repeated trading behaviours, and keep a manual trading journal.

## Stack

- Next.js 16 and React 19
- Clerk authentication
- Convex database and server functions
- BoomFi checkout and payment webhooks
- Hyperliquid and Arcus public trading data

## Run locally

1. Copy `.env.example` to `.env.local` and replace every example value.
2. Run `npm install`.
3. Run `npx convex dev` and create or select a Convex project.
4. In another terminal, run `npm run dev`.
5. Open `http://localhost:3000`.

Convex creates `.env.local`, generates its types, and syncs the database functions.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Security

Clerk protects customer routes, while Convex checks the signed-in identity before returning user-owned data. Wallet analytics use public blockchain and exchange information; StayFlat never asks for wallet private keys or seed phrases.

Do not commit `.env.local`, Vercel settings, payment credentials, or generated customer reports. They are excluded by `.gitignore`.
