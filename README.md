# KREDO

**Borrow on your reputation. Undercollateralized lending on GenLayer.**

Traditional DeFi lending demands 150% collateral because chains can't tell a stranger from a serial repayer. Kredo fixes this: link your real-world identity signals — ENS, Gitcoin Passport, on-chain history, credit APIs — and GenLayer's AI validators independently fetch them, agree on a reputation score (0–100), and write it to chain. Better standing unlocks less collateral and a lower rate. Repay on time and your score climbs; default and it drops.

**The pitch in one line:** your reputation is your credit history.

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
- `gl.eq_principle.strict_eq(...)` — validators must agree on the numeric score, then it's committed to chain

## Project structure

```
Kredo/
├── contracts/kredo.py            # the Intelligent Contract
├── deploy/deployScript.ts        # scripted deployment
├── gltest.config.yaml
├── tests/direct/                 # direct-mode contract tests (pytest)
└── frontend/
    ├── app/                      # Next.js app (landing, loan flows)
    ├── components/               # UI (wordmark, panels, modals)
    └── lib/
        ├── genlayer/             # client + wallet provider
        ├── contracts/            # typed contract wrapper
        └── hooks/                # useKredo
```

## Contract

Set once you've deployed. Update this line and the CI env:

- **Address:** `[deploy from GenLayer Studio, then paste here]`
- **Network:** GenLayer Studionet
- **Open in Studio:** [GenLayer Studio](https://studio.genlayer.com/)

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
