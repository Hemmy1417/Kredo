# KREDO

**Borrow on your reputation. A real undercollateralized lending pool on GenLayer.**

Traditional DeFi lending demands 150% collateral because chains can't tell a stranger from a serial repayer. Kredo fixes this: the contract derives your **on-chain footprint** from your address itself, GenLayer's AI validators independently fetch it, agree on a reputation score (0–100), and write it to chain. Better standing unlocks less collateral and a lower rate — and the pool fronts you real GEN against it. Repay on time and your score climbs; default and the pool seizes your collateral, books the shortfall, and your next loan costs more.

**The pitch in one line:** your reputation is your credit history — and you can't fake it, because the contract picks the evidence, not you.

**Live:** [kredo-six.vercel.app](https://kredo-six.vercel.app)

---

## Features

- **Pinned-evidence reputation scoring** — the contract builds the authoritative evidence URLs (Blockscout's keyless JSON API) from the borrower's **own address**. Borrowers never choose what the AI reads, which closes the score-inflation exploit where flattering pages buy cheaper loans.
- **All verification tied to one wallet** — two hard rules: (1) only the connected wallet can (re)evaluate its own score, so nobody can re-roll a score they don't own (no griefing downgrades, no dice-rolling consensus for a cheaper tier); (2) **zero user-supplied evidence** — the panel only ever reads the contract-pinned footprint plus the in-protocol repayment record, so you can't verify with someone else's ENS/Gitcoin/history pages, and there is no user-controlled URL to carry a prompt injection.
- **A real lending pool** — LPs seed a GEN reserve; `request_loan` disburses actual principal to the borrower in the same transaction that escrows their collateral. Repayment returns principal + interest to the pool; interest is booked as profit.
- **Aggregate solvency guard** — the contract tracks its whole in-force book (`reserve` vs `outstanding principal`) and refuses any loan the idle reserve cannot fund.
- **Dynamic, experience-rated pricing** — effective APR = base rate (your score) + utilization premium (Aave-style kink: a hotter pool charges more) + prior-default surcharge (+3%/default, capped). Every component is itemised in the loan preview.
- **Keeper-model liquidation** — owner-only; seized collateral returns to the pool reserve and any undercollateralized shortfall is booked as a transparent write-off. (No liquidation bounty — that design let anyone seize a healthy borrower's collateral.)
- **Owner-gated admin, fail-closed** — `override_score` (manual KYC), `set_min_reputation`, `withdraw_liquidity`, and `liquidate_loan` all pass through a single `_only_owner` gate that normalizes both sides and refuses everyone if the stored owner is ever blank. There is no admin surface in the UI — these are keeper/CLI actions.
- **Score changelog + AI rationale, achievements, loan health chips, filter tabs, protocol stats, notifications, top-borrower leaderboard, live animated backdrop** — the full product surface, not a form over a contract.

---

## How it works

1. **Verify** — one click, nothing to paste. The contract pins your Blockscout footprint (profile + activity counters) from your connected address; validators each fetch it independently; an AI credit-risk analyst scores the real signals — account age, transaction count, balance, ENS — plus your in-protocol repayment record. Consensus writes the score.
2. **Preview** — the contract maps your score to a collateral ratio and quotes the live effective APR, itemised (base + utilization + record).
3. **Borrow** — post the collateral your score requires; the pool disburses the principal to your wallet on the spot. Elite borrowers post 70% and receive 100%.
4. **Repay & grow** — return principal + interest; your collateral comes home and your score rises (up to +5). Default and the keeper liquidates: collateral to the pool, write-off booked, score −20, +3% surcharge on your next loan.

## Score tiers (base terms)

| Score | Collateral required | Base APR |
|---|---|---|
| 0 – 24 (Standard) | 150% | 20% |
| 25 – 49 (Low-medium) | 130% | 15% |
| 50 – 74 (Good) | 110% | 12% |
| 75 – 89 (Trusted) | 90% | 8% |
| 90 – 100 (Elite) | 70% | 5% |

**Utilization premium** (added to base): ≥25% pool utilization +1%, ≥50% +2%, ≥75% +4%, ≥90% +6%.
**Prior-default surcharge:** +3% per covered default, capped at +9%.

## Why GenLayer

A normal smart contract can't fetch a URL. A normal oracle can't read an account's history and reason about creditworthiness. Kredo needs both, in one atomic operation, verified by independent validators — that's exactly what a GenLayer Intelligent Contract does:

- `gl.nondet.web.render(url, mode="text")` — validators each fetch the **contract-pinned** footprint independently
- `gl.nondet.exec_prompt(...)` — an LLM analyzes the evidence under explicit guardrails (fetched text is material under review, never instructions; a thin or unreachable footprint scores LOW)
- `gl.eq_principle.prompt_comparative(...)` — validators bucket outputs on shape (score band + risk tier) rather than byte-for-byte, so LLM stylistic variation never kills a consensus round

The money side is fully real:

- `deposit_liquidity` / `withdraw_liquidity` — payable reserve in, owner pulls **idle** reserve out (principal on active loans is untouchable)
- `request_loan` — payable; escrows collateral and **disburses principal** via an EVM external message in the same tx
- `repay_loan` — payable; principal + interest back to the pool, collateral refunded, interest booked
- `liquidate_loan` — owner-only keeper write-off

All internal accounting is in **basis points and wei** (integers) so 1e18-scale amounts never lose precision to Python floats.

## Honest boundaries

- **No wall-clock on Studionet** — loan due dates are advisory (tracked client-side); the keeper determines default off-chain. A production deploy would source time from a validator oracle and open liquidation past a proven due block.
- **Footprint = Ethereum mainnet** — a fresh Studionet wallet scores low by design. That's the guardrail working: no history, no undercollateralized credit.
- **Single-owner keeper** — liquidation and reserve withdrawal are one trusted role; a production version would decentralize the keeper and make LPs shareholders in the reserve.

## Project structure

```
Kredo/
├── contracts/kredo.py            # the Intelligent Contract
├── deploy/deployScript.ts        # scripted deployment (owner = deploying wallet)
├── gltest.config.yaml
├── tests/direct/                 # 32 direct-mode contract tests (pytest)
└── frontend/
    ├── app/                      # Next.js 16 app (landing, providers, backdrop)
    ├── components/               # UI (score card, loan table, liquidity panel,
    │                             #     modals, protocol stats, notifications)
    └── lib/
        ├── genlayer/             # client + wallet provider
        ├── contracts/            # typed contract wrapper (kredo.ts)
        ├── achievements.ts       # pure fn: reputation + events → badges
        └── hooks/
            ├── useKredo.ts       # read/write hooks incl. pool + AI rationale
            ├── useScoreEvents.ts # client-side score changelog per wallet
            └── useLoanTimestamps.ts # first-seen timestamps for due-date maths
```

## Contract

- **Address:** `0x6905d31C5dcB02C2Dcdd4b3B46A04112EfB533CF`
- **Network:** GenLayer Studionet
- **Open in Studio:** [GenLayer Studio](https://studio.genlayer.com/?import-contract=0x6905d31C5dcB02C2Dcdd4b3B46A04112EfB533CF)

Stress-tested end-to-end on-chain: pinned footprint scored a real mainnet address 94/100 under 5/5 validator consensus; third-party evaluation attempt rejected by the self-evaluation guard; a self-evaluation that attached a whale's footprint URL as "supporting evidence" was accepted but scored the wallet's own thin footprint (31/100) — the injected URL never reached the panel; principal disbursement, utilization premium, solvency refusal, repayment interest booking, default write-off, and owner withdrawal all verified with balance checks.

> **GenVM lessons baked in (July 2026).** Wallet payouts go through an empty `@gl.evm.contract_interface` proxy (`emit_transfer` at a plain wallet strands value). `Address()` must never re-wrap an `Address`-typed storage field. Every address boundary is normalized (`str → strip → lower`) because CLI args arrive as Address objects and storage keys are case-sensitive.

## Local development

```bash
# contract tests
python -m pytest tests/direct -q

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
