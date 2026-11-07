# Stock Tracker

A phone-first stock tracker for small Indian businesses. The owner describes their business in one or two sentences, and AI suggests a setup (godowns, job workers, item types, units). From then on, every movement is recorded and counted with plain code, so the owner always knows what is in which godown, what is still with which worker, and what came back damaged.

Hackathon MVP built with Next.js, deployable to Vercel.

## Job to be done

> When I set up inventory tracking for my business, I want to describe my business in my own words and get a dashboard with my name and logo that tracks where my stock is and how it moves, so I can know what is in which godown or with which worker, and catch missing or damaged units, without keeping notes by hand.

**User:** a small business owner in India who isn't tech-savvy and mostly uses a phone. For example, a tyre shop owner with two godowns, or a uniform maker who sends cloth to a cutting master and shirts to an embroidery worker.

## The 3 tests the MVP must pass

1. **Setup:** enter a business name, owner name and logo, and describe the business (e.g. *"I sell tyres and keep stock in two godowns"*). Within 30 seconds, the dashboard shows the name and logo plus suggested locations and item fields that fit. A tyre shop (godowns, tyre size, brand) and a uniform maker (cutting master and embroidery worker, cloth in meters, shirts in pieces) must get clearly different setups.
2. **Movements:** add 100 shirts to the godown, send 100 to the embroidery worker, receive 99 back. The dashboard shows 99 in the godown, flags 1 shirt pending with the embroidery worker, and lets the owner mark it damaged. After that, pending is 0 and damaged is 1.
3. **Bad input:** a vague description ("stuff", "asdkjh qwe") gets a clear message and no made-up setup. A logo that isn't an image (.txt, .pdf) gets a clear error. Receiving more than was sent (send 50, receive 51) is stopped with an explanation, and no stock numbers change.

### Test status (7 Nov 2026)

| Test | Status |
|---|---|
| 1. AI setup | **Not yet verified.** The full flow runs end-to-end, but no working AI key has been available yet, so the real AI answer and the 30-second timing are untested. |
| 2. Movements | Counting logic verified on a phone-sized screen with a hand-made uniform setup, plus automatic tests. Needs a re-run on an AI-made setup. |
| 3a. Vague description | Pass |
| 3b. Non-image logo | Pass |
| 3c. Receive more than sent | Logic verified with a hand-made setup, plus automatic tests: *"You can't receive 51 Shirts from Embroidery Worker. Only 50 Shirts are with Embroidery Worker right now."* |

## Current workflow → future workflow

| Today (by hand) | With Stock Tracker |
|---|---|
| Stock is written in a notebook or WhatsApp messages, separately for each godown | Each movement is one tap-and-type entry on the phone, and counts update instantly for every location |
| To know what is with the embroidery worker, the owner adds up old notes or calls them | The dashboard shows "⚠ Shirts: 1 piece still with Embroidery Worker" on its own |
| Missing or damaged pieces are found weeks later, if at all | Pending units are flagged as soon as fewer come back, with a **Mark damaged** button |
| Mistakes like writing "received 101" when 100 went out go unnoticed | The app refuses impossible movements and explains why |
| Setting up any software means learning its terms and filling in long forms | The owner writes one sentence in their own words, and the setup is suggested for them |

## Architecture: Input → AI → Logic → Action → Output

### Flow A: Setup (uses AI once)

| Stage | What happens | Where |
|---|---|---|
| **Input** | Business name, owner name, logo file, 1–2 sentence description | [`components/OnboardingForm.tsx`](components/OnboardingForm.tsx) |
| **Logic (before AI)** | Checks that the names are filled in, the logo is a real image that opens (then shrinks it), and the description isn't empty, too short or random letters | [`lib/checks.ts`](lib/checks.ts) |
| **AI** | The description is sent to Claude (Opus 5.5, low effort), which must answer in a fixed shape: `ok` or `unclear`, a business label, 1–6 locations tagged `own_storage` or `job_worker`, and 1–5 item types with a unit and up to 4 details | [`app/api/suggest-setup/route.ts`](app/api/suggest-setup/route.ts), [`lib/setupSchema.ts`](lib/setupSchema.ts) |
| **Logic (after AI)** | Checks the answer's shape and sizes. If it's "unclear" or anything is off, it stops and shows a message instead of a setup | `problemWithSetup` in [`lib/setupSchema.ts`](lib/setupSchema.ts) |
| **Action** | Saves the setup in the browser (`localStorage`) | [`lib/storage.ts`](lib/storage.ts) |
| **Output** | A dashboard with the logo, name and owner, plus a *"Set up as … suggested from: '…'"* banner so a wrong guess is easy to spot | [`components/Dashboard.tsx`](components/Dashboard.tsx) |

### Flow B: Movements (no AI)

| Stage | What happens | Where |
|---|---|---|
| **Input** | Type (Add stock / Send / Receive back / Mark damaged), item, quantity, from, to | [`components/MovementForm.tsx`](components/MovementForm.tsx) |
| **AI** | None | |
| **Logic** | Works out the current stock at the "from" place by adding up the logbook. Blocks the movement if the quantity is invalid, more than is there, or "from" equals "to", with a plain-language reason | `checkMovement` in [`lib/stock.ts`](lib/stock.ts) |
| **Action** | Adds one entry to the logbook in the browser | [`components/App.tsx`](components/App.tsx) |
| **Output** | Updated stock per location, "Pending with workers: N" with Receive / Mark damaged buttons, a Damaged box, and a "✓ Saved" message | [`components/Dashboard.tsx`](components/Dashboard.tsx) |

Stock is never stored as a number. It is always recalculated from the logbook of movements, so counts can't drift out of step with history.

## Where AI is used, and what stays human

**AI is used in exactly one place:** turning the owner's free-form description into a suggested setup. This needs AI because owners describe their business in their own words, often mixing Hindi and English ("karigar", "maal", "godown"), and businesses vary endlessly. Keyword rules would handle the two demo examples and fail on the next owner.

**Everything else is plain code,** because it must be exact and give the same answer every time. That covers stock counting, pending amounts, blocking impossible movements, file and text checks, and saving.

**What stays with the owner:**
- Writing the description and choosing the name and logo.
- Judging the suggested setup: they can **Start again** (with a confirmation step) or **+ Add a place or worker** the AI missed.
- Recording every movement. The app never records or guesses anything on its own.
- Deciding whether pending units are damaged or still on their way.

## Why these tools

| Tool | Why |
|---|---|
| **Next.js** (App Router, TypeScript) | One project holds both the phone screens and the small server route that keeps the AI key secret, and it deploys to Vercel with no extra setup |
| **Tailwind CSS** | Quick to make it look good at phone width first |
| **Claude via the official Anthropic SDK** | Structured outputs force the answer into an exact shape, so there's no free-text parsing. The same code works with an Anthropic key or an OpenRouter key (OpenRouter offers a Claude-compatible endpoint) |
| **zod** | One schema both tells Claude the shape to answer in and checks the answer |
| **Browser `localStorage`** | The brief says no database or logins for the demo, so data stays on the owner's phone |
| **Vitest** | Fast automatic tests for the counting rules, which matter most |

## Failure cases and what the owner sees

| Failure | What happens |
|---|---|
| Name or owner name empty | "Please enter your business name." / "Please enter your name." |
| Logo isn't an image (.pdf, .txt) | "This file is not an image. Please choose a JPG, PNG or WEBP." A good logo already chosen is kept. |
| Logo is an image but can't be opened, or is over 10 MB | "We couldn't open this image…" / "This image is too big…" |
| Description empty, too short or gibberish | "Please tell us a bit more, e.g. what you sell and where you keep stock." AI is not called. |
| AI can't understand the description | Its one-line question is shown and **no setup is created** |
| AI key missing, wrong or refused, out of credit, or the service is busy | A specific message (e.g. "The AI key was refused… Run: npm run check-key"). The form keeps everything typed. |
| AI is slow (over 25 s), declines, or returns a broken answer | "We couldn't create your setup right now… tap Try again." No half-made setup. |
| AI guesses wrong (wrong type, missing place, wrong unit) | It's visible: the banner quotes the description, each place is tagged Your place or Job worker, units are shown. The owner can Start again or add a place. |
| Receive or send more than is there | Blocked: *"You can't receive 51 Shirts from Embroidery Worker. Only 50 Shirts are with Embroidery Worker right now."* |
| Zero, negative, or half a shirt | "Enter a number above 0." / "Shirts are counted in whole pieces…" |
| Browser won't save (some private modes) | A warning bar says data will be lost when the page closes |
| Saved data is damaged | "Your saved data couldn't be read." with a **Start fresh** button |

**Known limits of the MVP:** data lives in one browser on one device; no logins, reports, GST, billing or barcode scanning; a job worker returns the same item they were sent (cloth-to-shirt conversion isn't tracked).

## Run it locally

You need **Node.js 20 or newer** (LTS) and **git**.

1. Get the code and install packages:
   ```bash
   git clone https://github.com/simrankalra-netizen/inventory-tracker.git
   cd inventory-tracker
   npm install
   ```
2. Copy `.env.example` to `.env.local` and put **one** key in it, either an OpenRouter key (`OPENROUTER_API_KEY=sk-or-…`, the account needs credit) or an Anthropic key (`ANTHROPIC_API_KEY=sk-ant-…`). `.env.local` is in `.gitignore`, so it is never committed.
3. Check the key (it is never printed):
   ```bash
   npm run check-key
   ```
   It should say **✓ Key works**. If the key is on the wrong line, `npm run check-key -- --fix` moves it.
4. Start the app and open http://localhost:3000, ideally in your browser's phone view:
   ```bash
   npm run dev
   ```
5. Run the automatic tests for the counting rules:
   ```bash
   npm test
   ```

To deploy on Vercel, import the repo and add `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`) under **Settings → Environment Variables**.
