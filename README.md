# KREDO

**Borrow on your reputation. Undercollateralized lending on GenLayer.**

Traditional DeFi lending demands 150% collateral because chains can't tell a stranger from a serial repayer. Kredo fixes this: link your real-world identity signals — ENS, Gitcoin Passport, on-chain history, credit APIs — and GenLayer's AI validators independently fetch them, agree on a reputation score (0–100), and write it to chain. Better standing unlocks less collateral and a lower rate. Repay on time and your score climbs; default and it drops.

**The pitch in one line:** your reputation is your credit history.

**Live:** [kredo-six.vercel.app](https://kredo-six.vercel.app)

---

## Features

- **AI-scored reputation** — GenLayer validators independently fetch each identity URL, an LLM scores the combined evidence, and consensus writes the score to chain
- **Real GEN escrow** — collateral is held on-chain as `msg.value` and paid out via `emit_transfer` on repay or liquidation
- **Score changelog + AI rationale** — every reputation change is stored client-side with the AI's summary, risk tier and flags
- **Achievements** — first verify, first loan, tier milestones, repayment streaks, clean-slate borrower
- **Loan health at a glance** — due-in-X-days chip, overdue alerts, origination score, timestamp trail
- **Filter tabs** — filter loans by All / Active / Mine / Repaid / Liquidated with live counts
- **Protocol stats strip** — loans issued, GEN currently escrowed, repayment rate, unique borrowers
- **Notifications banner** — due-soon and overdue alerts for the connected borrower
- **Top borrowers landscape strip** — landing-page leaderboard of wallets with settled loans, sorted by score
- **Live animated backdrop** — aurora blobs, panning grid, conic beam, floating particles (respects `prefers-reduced-motion`)

---

## How it works

1. **Verify** — submit identity URLs (ENS profile, Gitcoin Passport page, on-chain analytics dashboard, credit-bureau signal). Validators each fetch them, an AI credit-risk analyst scores the combined evidence 0–100, and the score is written to chain by consensus.
2. **Preview** — the contract maps your score to a collateral ratio and APR. Try any loan size before committing.
3. **Borrow** — request a loan with the collateral your score requires. The contract enforces the ratio; no intermediary approves it.
4. **Repay & grow** — on-time repayment adds up to 5 points to your score. Default penalises up to 20.

## Score tiers

| Score | Collateral required | APR |
|---|---|---|
| 0 – 24 (Standard) | 150% | 20% |
| 25 – 49 (Low-medium) | 130% | 15% |
| 50 – 74 (Good) | 110% | 12% |
| 75 – 89 (Trusted) | 90% | 8% |
| 90 – 100 (Elite) | 70% | 5% |

## Why GenLayer

A normal smart contract can't fetch a URL. A normal oracle can't read natural-language identity signals and reason about them. Kredo needs both, in one atomic operation, verified by independent validators — that's exactly what a GenLayer Intelligent Contract does. Specifically:

- `gl.nondet.web.render(url, mode="text")` — validators each fetch the identity data URLs independently
- `gl.nondet.exec_prompt(...)` — an LLM analyzes the combined evidence
- `gl.eq_principle.prompt_comparative(...)` — validators bucket their outputs on shape (score band + risk tier) rather than byte-for-byte, so LLM stylistic variation never kills a consensus round

The lending side of the contract is fully payable:

- `request_loan` is `@gl.public.write.payable` — the borrower's collateral is escrowed as real `msg.value` (GEN)
- `repay_loan` refunds the collateral via `emit_transfer(..., on="finalized")` and boosts reputation
- `liquidate_loan` pays the escrowed collateral to whoever calls it as a bounty and penalises the borrower

All internal accounting is done in **basis points** (integers) so wei-scale amounts (>1e15) don't lose precision to Python floats.

## Project structure

```
Kredo/
├── contracts/kredo.py            # the Intelligent Contract
├── deploy/deployScript.ts        # scripted deployment
├── gltest.config.yaml
├── tests/direct/                 # direct-mode contract tests (pytest)
└── frontend/
    ├── app/                      # Next.js 16 app (landing, providers, backdrop)
    ├── components/               # UI (wordmark, score card, loan table,
    │                             #     modals, protocol stats, notifications,
    │                             #     live backdrop)
    └── lib/
        ├── genlayer/             # client + wallet provider
        ├── contracts/            # typed contract wrapper (kredo.ts)
        ├── achievements.ts       # pure fn: reputation + events → badges
        └── hooks/
            ├── useKredo.ts       # read/write hooks + AI-rationale persistence
            ├── useScoreEvents.ts # client-side score changelog per wallet
            └── useLoanTimestamps.ts # first-seen timestamps for due-date maths
```

## Contract

Set once you've deployed. Update this line and the CI env:

- **Address:** `0x42600a355F3E465884099B1c9Ee6FA9c0abF734e`
- **Network:** GenLayer Studionet
- **Open in Studio:** [GenLayer Studio](https://studio.genlayer.com/?import-contract=0x42600a355F3E465884099B1c9Ee6FA9c0abF734e)

## Local development

```bash
# frontend
cd frontend
cp .env.Example .env.local
# fill in NEXT_PUBLIC_CONTRACT_ADDRESS after deploying
npm install && npm run dev
```

## Environment variables

**`frontend/.env.local`** (also set on Vercel):

- `NEXT_PUBLIC_CONTRACT_ADDRESS` — the deployed contract
- `NEXT_PUBLIC_GENLAYER_RPC_URL` — default: `https://studio.genlayer.com/api`
- `NEXT_PUBLIC_GENLAYER_CHAIN_ID` — `61999` (Studionet)
- `NEXT_PUBLIC_GENLAYER_CHAIN_NAME` — `GenLayer Studio`
- `NEXT_PUBLIC_GENLAYER_SYMBOL` — `GEN`
