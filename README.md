# KREDO

**Borrow on your reputation. A real undercollateralized lending pool on GenLayer.**

Traditional DeFi lending demands 150% collateral because chains can't tell a stranger from a serial repayer. Kredo fixes this: the contract derives your **on-chain footprint** from your address itself, GenLayer's AI validators independently fetch it, agree on a reputation score (0–100), and write it to chain. Better standing unlocks less collateral and a lower rate — and the pool fronts you real GEN against it. Repay on time and your score climbs; default and the pool seizes your collateral, books the shortfall, and your next loan costs more.

**The pitch in one line:** your reputation is your credit history — and you can't fake it, because the contract picks the evidence, not you.

**Live:** [kredo-psi.vercel.app](https://kredo-psi.vercel.app)

---

## The difference: history you can't fake, not documents you submit

Most "AI lending" protocols ask you to **prove who you are** — upload KYC documents, hash them, put the proofs on-chain. Kredo asks a different question, and answers it itself: **what have you actually done on-chain?**

| | Document-KYC AI lending | **Kredo** |
|---|---|---|
| **Who picks the evidence** | The borrower uploads their documents | The contract derives the source from your address — you supply nothing |
| **Can it be gamed** | Hashing proves a document is *unaltered*, not *true* | Your on-chain footprint is append-only and costly to forge |
| **How the score is set** | An AI *generates* a credit offer — a black-box number | A published rubric maps extracted facts → score; same footprint, same score, **auditable** |
| **Attack surface** | User-supplied documents feed the AI | **Zero** — no user-controlled input ever reaches the panel |
| **Onboarding & privacy** | KYC flow; PII handled even when hashed | One wallet click, nothing to upload, no PII in the pipeline |

The borrower controls **neither** the input nor the number: the contract picks the evidence, and a fixed formula sets the score. A hashed document proves a *file* wasn't tampered with — not that it's genuine; Kredo sidesteps the whole question by reading your history instead of trusting a claim about it. The honest scope: Kredo underwrites **crypto-native** reputation (a wallet with no on-chain history scores low, by design) — trustlessly, with nothing about your creditworthiness requiring trust in us.

---

## Features

- **Pinned-evidence reputation scoring** — the contract builds the authoritative evidence URLs (Blockscout's keyless JSON API) from the borrower's **own address**. Borrowers never choose what the AI reads, which closes the score-inflation exploit where flattering pages buy cheaper loans.
- **Deterministic, fishing-proof scoring** — three hard rules: (1) only the connected wallet can (re)evaluate its own score, so nobody can re-roll a score they don't own; (2) **the footprint score is a fixed formula, not a vibed number** — the panel only *extracts* the hard facts (transaction count, token transfers, ENS, contract flag) and the contract maps them to a score by a published rubric, so the same footprint always yields the same score. There is no lucky high sample to re-roll for, and standing above the footprint is earned only through the deterministic on-chain record (+5 per repaid loan, −20 per default); (3) **zero user-supplied evidence** — the panel reads only the contract-pinned footprint, so you can't verify with someone else's ENS/Gitcoin/history pages, and no user-controlled URL can carry a prompt injection.
- **A real lending pool, owned by its LPs** — every deposit mints **pool shares** (vault-style); `request_loan` disburses actual principal in the same transaction that escrows the borrower's collateral. On repayment the interest is split three ways — most of it raises the share price for **every depositor pro-rata, automatically**, a slice tops up a loss reserve, and 10% accrues as protocol fee. Any share-holder can withdraw their slice (principal + earned yield) at any time; the owner has no special claim on LP capital.
- **Real, enforced loan maturity** — at origination the contract **fetches the current UTC time** from public keyless clocks under consensus and stamps each loan with a genuine due date + grace window. There is no trusted clock feeder: the timestamp is agreed by validators, and every timing rule below reads from it.
- **Permissionless, time-proven liquidation** — once a loan clears its due date + grace, **anyone** can liquidate it; the contract re-fetches the time and only proceeds if it can *prove* the loan is overdue. The liquidator earns a small keeper reward from the seized collateral — safe to pay precisely *because* lateness is proven, not asserted, so no one can grief a current borrower. (Loans opened while the clock was unreachable fall back to an owner-keeper.)
- **Partial repayment** — pay a balance down over time instead of all-or-nothing; the loan stays open, tracking the running total, and settles (collateral refunded, reputation boosted) on the payment that clears it.
- **Late fees** — repaying after the due date costs a flat 5% of principal, and that fee accrues to LPs.
- **Loss-reserve buffer** — a fixed share of every interest payment is set aside as a reserve that absorbs default write-offs **before** they socialise onto LP share price; only the leftover is a real loss.
- **Aggregate solvency guard** — the contract tracks its whole in-force book (`reserve` vs `outstanding principal`) and refuses any loan the idle reserve cannot fund.
- **Dynamic, experience-rated pricing** — effective APR = base rate (your score) + utilization premium (Aave-style kink: a hotter pool charges more) + prior-default surcharge (+3%/default, capped). Every component is itemised in the loan preview.
- **No operator path to a score — at all.** There is deliberately no admin score override. A score is written only by the fixed rubric over consensus-extracted footprint facts plus your own in-protocol record; nobody, the owner included, can set or nudge a wallet's standing by fiat. (An `override_score` once existed "for manual KYC" — it's gone: it contradicted this very claim, and was a no-op besides, silently recomputed away by the borrower's next action.) The owner's only levers are `set_min_reputation` and `claim_protocol_fees`, both behind a single fail-closed `_only_owner` gate. Liquidation isn't owner-gated in the normal case (permissionless once provably overdue), and withdrawing liquidity isn't either — that belongs to the LPs.
- **Score changelog + AI rationale, achievements, loan health chips, filter tabs, protocol stats, notifications, top-borrower leaderboard, live animated backdrop** — the full product surface, not a form over a contract.

---

## How it works

1. **Verify** — one click, nothing to paste. The contract pins your Blockscout footprint (profile + activity counters) from your connected address; validators each fetch it independently; an AI credit-risk analyst **reads the footprint and extracts its facts** — transaction count, token transfers, ENS, contract flag — and the contract maps those facts to a score by a **fixed rubric**, so the same footprint always scores the same (no vibed, re-rollable number). Your Kredo repayment record is then folded in deterministically (+5 per repaid, −20 per default), so behaviour moves your standing after verification.
2. **Preview** — the contract maps your score to a collateral ratio and quotes the live effective APR, itemised (base + utilization + record).
3. **Borrow** — post the collateral your score requires; the pool disburses the principal to your wallet on the spot. Elite borrowers post 70% and receive 100%. The loan is stamped with a real, contract-fetched due date + grace window.
4. **Repay & grow** — return principal + interest, in full or in installments; pay after the due date and a 5% late fee applies. Your collateral comes home on the payment that clears the balance, and your score rises (up to +5). Default past due + grace and **anyone** can liquidate: collateral to the pool (loss reserve absorbs the shortfall first), score −20, +3% surcharge on your next loan.

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
- `gl.nondet.exec_prompt(...)` — the LLM READS the footprint and EXTRACTS its facts under explicit guardrails (fetched text is material under review, never instructions; an unreachable footprint is reported as such and scores zero) — it does not vibe a number
- `gl.eq_principle.prompt_comparative(...)` — validators reach consensus on the extracted FACTS; the contract then maps them to a score by a fixed, published rubric, so the same footprint always yields the same score

The money side is fully real:

- `deposit_liquidity` — payable; mints pool shares at the live share price (first deposit is 1:1)
- `withdraw_liquidity(shares)` — **any share-holder** burns shares for their pro-rata slice of pool assets, principal + accrued yield; only the **idle** reserve can leave (principal on active loans is untouchable until repaid)
- `request_loan` — payable; **fetches UTC now** from public clocks to stamp a real due date, escrows collateral, and **disburses principal** via an EVM external message in the same tx
- `repay_loan` — payable; supports partial payments and late fees; on the closing payment, principal + most of the interest go back to the pool (the yield distribution — share price rises for every LP), a slice tops up the loss reserve, 10% accrues as protocol fee
- `liquidate_loan` — **permissionless when the fetched clock proves the loan overdue** (owner-keeper fallback for un-stamped loans); the loss reserve absorbs the shortfall before it socialises across shares, and a non-owner liquidator earns a keeper reward
- `claim_protocol_fees` — owner collects the fee pot; the only money the owner can touch
- `get_lp_position(address)` — shares, share of pool, current redemption value, net deposited, earned yield, withdrawable-now

The clock itself is an Intelligent-Contract primitive: `_utc_now()` fetches epoch seconds from two independent keyless sources under `gl.eq_principle.prompt_comparative` — Cloudflare's `/cdn-cgi/trace` and **Ethereum's own latest block timestamp** (via Blockscout), i.e. a clock produced by a decentralised consensus rather than one vendor's server. It cross-checks them, distrusts the reading entirely if they diverge by more than 300s, takes the **earliest** corroborated value (so skew can only ever favour the borrower), and returns 0 — never raises — when no source can be trusted, so an outage degrades safely (no false late fees, no false liquidations) instead of bricking the pool.

> Both sources are **probe-verified from Studionet validators**, and that mattered: the first source list shipped with `timeapi.io` and `worldtimeapi.org`. On-chain probing proved `worldtimeapi.org` won't load at all and **`timeapi.io` serves a clock ~6 minutes behind real UTC** — its disagreement correctly tripped the divergence guard, which meant `_utc_now()` returned 0 on every call and *every loan silently lost its due date*. The safety logic was right; the sources were wrong. Never add a clock source without probing it on-chain first.

All internal accounting is in **basis points and wei** (integers) so 1e18-scale amounts never lose precision to Python floats.

## The LP share model

The pool is a vault its depositors own, not a donation faucet:

- **Balance registry.** Every deposit is recorded against the depositor's address as
  **pool shares** (`lp_shares`), minted at the live share price: the first deposit is 1:1;
  after that `shares = amount × total_shares / pool_assets`, where pool assets = idle
  reserve + principal out on active loans. A deposit never dilutes or enriches anyone.
- **Yield distribution.** `repay_loan` returns principal + the LP share of interest to the pool.
  Because pool assets rise while shares outstanding don't, the share price climbs — that one
  line **is** the pro-rata yield distribution, with no claiming transaction and no dust loops.
  Interest is split three ways: most to LP share price, a 5% loss-reserve cut, and a 10%
  protocol fee claimable only by the owner. Write-offs from defaults lower pool assets the same
  way — but the loss reserve absorbs the shortfall first, so LPs feel only what's left past it.
- **Decentralized withdrawals.** `withdraw_liquidity(shares)` is open to **any**
  share-holder and pays their pro-rata slice — idle capital plus earned yield. Only the idle
  reserve can leave (capital on active loans returns as borrowers repay), so the in-force
  book can never be drained. The owner has no privileged withdrawal path.
- **UI.** The Liquidity Panel shows the connected wallet's deposit value, earned yield,
  share of pool, and a withdraw button for exactly their slice.

Guard-rails worth noting: a deposit too small to mint one share is refused (no silent
donations); a fully-written-off pool refuses new deposits rather than misprice them; share
math floors in the pool's favor so rounding can never mint value; and because pool assets
are internal accounting (not a balance read), donating GEN straight to the contract address
can't skew the share price — the classic vault inflation attack has no lever here.

## Trust model: who must be trusted, with what

- **The evidence — contract-chosen, borrower-proof.** The scoring panel only ever reads
  URLs the *contract derives from the borrower's own address* (Blockscout's keyless JSON
  API) plus the in-protocol repayment record. No user-supplied URL ever reaches the panel,
  so there is no prompt-injection lever and no flattering-page exploit. And because the
  footprint is a live view of append-only chain data, the only way to "manipulate" your
  evidence is to actually build years of real on-chain history — which is not an attack,
  it's the product working.
- **The score — consensus, not an operator.** A score is written only under validator
  consensus (bucketed equivalence on score band + risk tier). An unreachable footprint
  scores LOW by explicit instruction — fail-closed: an outage can never mint credit.
- **Timing — proven on-chain, not asserted by a keeper.** Each loan is stamped with a real
  due date the contract *fetched* from public clocks at origination, agreed across validators.
  Liquidation re-fetches the time and proceeds only if it can prove the loan is past due +
  grace — at which point it is **permissionless**: anyone can call it, and a non-owner
  liquidator earns a small keeper reward from the seized collateral. Because lateness is
  proven, that reward can't be gamed to seize a healthy borrower's collateral. There is no
  trusted default-caller in the normal path; the owner is only a fallback for loans opened
  while the clock was unreachable.
- **The pool — owned by its LPs.** The owner's only claim on contract funds is the accrued
  10% fee pot (`claim_protocol_fees`). Deposits, yield, and withdrawals require no trust in
  the owner at all. Defaults hit the loss-reserve buffer first, so LPs feel only the true
  shortfall past it.

## Honest boundaries

- **Maturity comes from fetched time, not a native clock** — Studionet's GenVM has no wall-clock, so Kredo fetches UTC under consensus and stamps each loan with a real due date. This is as trustless as the sources are honest: two independent, probe-verified readings (Cloudflare's edge clock and Ethereum's block timestamp) that must corroborate each other within 300s or the reading is discarded. Both would have to be wrong *in the same direction, at the same moment* to shift a due date — and a shift still only matters at the 3-day grace boundary. If neither can be read at origination the loan falls back to owner-keeper handling, and the clock never *raises* — an outage degrades safely to "no late fee, no liquidation" rather than mispricing or bricking anything.
- **Footprint = Ethereum mainnet** — a fresh Studionet wallet scores low by design. That's the guardrail working: no history, no undercollateralized credit.
- **Utilization-locked exits** — an LP can only withdraw from the idle reserve; at 100% utilization they must wait for repayments. That's the standard peer-to-pool trade-off, surfaced in the UI rather than hidden.

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

- **Address:** `0xE9a53f5710EE8232b9098046D0De0DFC36b4F099` (v0.4 — enforced maturity, partial repay, late fees, permissionless liquidation, loss reserve)
- **Network:** GenLayer Studionet
- **Open in Studio:** [GenLayer Studio](https://studio.genlayer.com/?import-contract=0xE9a53f5710EE8232b9098046D0De0DFC36b4F099)

The full surface is covered by **56 direct-mode tests** (pytest), including the v0.4 additions: on-chain due-date stamping, partial-repayment accumulation and settlement, past-due late fees, permissionless-when-provably-overdue liquidation with the owner-keeper fallback, the keeper incentive, and loss-reserve absorption ahead of any LP write-off. Stress-tested end-to-end on-chain (scoring/lending logic unchanged across versions): pinned footprint scored a real mainnet address 94/100 under 5/5 validator consensus; third-party evaluation rejected by the self-evaluation guard; a self-evaluation that attached a whale's footprint URL as "supporting evidence" was accepted but scored the wallet's own thin footprint (31/100) — the injected URL never reached the panel; principal disbursement, utilization premium, solvency refusal, repayment interest booking, and default write-off all verified with balance checks.

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

---

## Signed writes

Contract writes are signed by the **connected wallet's own EIP-1193 provider**. The
contract wrapper resolves the injected provider (preferring MetaMask when several
wallets are installed) and binds it into the genlayer-js client, so every transaction
is signed by the wallet the user actually picked — never an implicit `window.ethereum`
fallback that could be the wrong extension. A repository-level test
(`frontend/tests/signed-write.test.ts`) proves the write path routes
`eth_sendTransaction` through that provider with the correct `from`.
