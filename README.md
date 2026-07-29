# Fruition Venture Studio

Fruition's public web presence and private idea-intelligence platform. The
public site helps founders and domain experts go from concept to company; the
owner admin turns submitted opportunities into an evidence-backed review
pipeline.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- CSS Modules with a small global token system
- PostgreSQL and Prisma for submitter, idea, research, score, and audit data
- Better Auth passwordless owner access
- OpenAI Agents SDK specialist research with structured outputs and citations
- Vercel Workflow for durable, retryable research runs
- Resend-compatible contact and admin email delivery

## Local development

Use Node 20.20.1:

```bash
nvm use
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The owner admin is at [http://localhost:3000/admin](http://localhost:3000/admin).
Local development defaults to `local@fruition.studio` and returns a local,
single-use sign-in link on screen. Production never exposes this shortcut.

Configure the environment variables documented in `.env.example`. The main
groups are:

- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL` and `DIRECT_URL`
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `ADMIN_EMAILS`
- `OPENAI_API_KEY` and `OPENAI_MODEL`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL` (a verified sender in Resend)

The database commit is the source of truth for contact intake. Notification
email is best effort, so a temporary Resend failure never discards a submission.
For production, use a pooled PostgreSQL URL at runtime and a direct URL for
migrations.

## Idea workflow

1. A public submission is stored as a new idea.
2. Email normalization groups repeat submissions under one submitter profile.
3. The owner reviews the idea and explicitly approves research.
4. Six bounded specialist agents research the opportunity.
5. A seventh agent synthesizes a cited, versioned scorecard.
6. The owner records the final disposition and can override scores with a
   required reason.

Agents cannot send messages, purchase anything, deploy code, or make venture
decisions. Research evaluates the idea and public market evidence rather than
the submitter's private life.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Apply committed production migrations with:

```bash
npm run db:deploy
```

## Initial product decisions

- Position Fruition as a selective product and technology partner, not a
  general-purpose software agency.
- Keep the approved tagline: **From concept to company.**
- Implement the approved architectural-modern design sheet directly:
  letter-spaced FRUITION wordmark with interrupted “O,” graphite-first
  applications, exact gold/gray palette, geometric service icons, precise
  sans-serif typography, and original concrete architectural photography.
- Avoid fabricated case studies, portfolio claims, and performance metrics
  until real venture evidence exists.
