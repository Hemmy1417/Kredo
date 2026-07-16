# KREDO

**Borrow on your reputation. A real undercollateralized lending pool on GenLayer.**

Traditional DeFi lending demands 150% collateral because chains can't tell a stranger from a serial repayer. Kredo fixes this: the contract derives your **on-chain footprint** from your address itself, GenLayer's AI validators independently fetch it, agree on a reputation score (0–100), and write it to chain. Better standing unlocks less collateral and a lower rate — and the pool fronts you real GEN against it. Repay on time and your score climbs; default and the pool seizes your collateral, books the shortfall, and your next loan costs more.

**The pitch in one line:** your reputation is your credit history — and you can't fake it, because the contract picks the evidence, not you.

**Live:** [kredo-six.vercel.app](https://kredo-six.vercel.app)

---

## Features

- **Pinned-evidence reputation scoring** — the contract builds the authoritative evidence URLs (Blockscout's keyless JSON API) from the borrower's **own address**. Borrowers never choose what the AI reads, which closes the score-inflation exploit where flattering pages buy cheaper loans.
- **All verification tied to one wallet** — two hard rules: (1) only the connected wallet can (re)evaluate its own score, so nobody can re-roll a score they don't own (no griefing downgrades, no dice-rolling consensus for a cheaper tier); (2) **zero user-supplied evidence** — the panel only ever reads the contract-pinned footprint plus the in-protocol repayment record, so you can't verify with someone else's ENS/Gitcoin/history pages, and there is no user-controlled URL to carry a prompt injection.
- **A real lending pool, owned by its LPs** — every deposit mints **pool shares** (vault-style); `request_loan` disburses actual principal in the same transaction that escrows the borrower's collateral. On repayment, 90% of the interest lands back in the pool — raising the share price for **every depositor pro-rata, automatically** — and 10% accrues as protocol fee. Any share-holder can withdraw their slice (principal + earned yield) at any time; the owner has no special claim on LP capital.
- **Aggregate solvency guard** — the contract tracks its whole in-force book (`reserve` vs `outstanding principal`) and refuses any loan the idle reserve cannot fund.
- **Dynamic, experience-rated pricing** — effective APR = base rate (your score) + utilization premium (Aave-style kink: a hotter pool charges more) + prior-default surcharge (+3%/default, capped). Every component is itemised in the loan preview.
- **Keeper-model liquidation** — owner-only; seized collateral returns to the pool reserve and any undercollateralized shortfall is booked as a transparent write-off. (No liquidation bounty — that design let anyone seize a healthy borrower's collateral.)
- **Owner-gated admin, fail-closed** — `override_score` (manual KYC), `set_min_reputation`, `claim_protocol_fees`, and `liquidate_loan` all pass through a single `_only_owner` gate that normalizes both sides and refuses everyone if the stored owner is ever blank. Withdrawing liquidity is deliberately **not** on this list — that belongs to the LPs.
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

- `deposit_liquidity` — payable; mints pool shares at the live share price (first deposit is 1:1)
- `withdraw_liquidity(shares)` — **any share-holder** burns shares for their pro-rata slice of pool assets, principal + accrued yield; only the **idle** reserve can leave (principal on active loans is untouchable until repaid)
- `request_loan` — payable; escrows collateral and **disburses principal** via an EVM external message in the same tx
- `repay_loan` — payable; principal + 90% of interest back to the pool (the yield distribution — share price rises for every LP), 10% accrued as protocol fee
- `claim_protocol_fees` — owner collects the fee pot; the only money the owner can touch
- `liquidate_loan` — owner-only keeper write-off; the loss is socialized across shares
- `get_lp_position(address)` — shares, share of pool, current redemption value, net deposited, earned yield, withdrawable-now

All internal accounting is in **basis points and wei** (integers) so 1e18-scale amounts never lose precision to Python floats.

## The LP share model

The pool is a vault its depositors own, not a donation faucet:

- **Balance registry.** Every deposit is recorded against the depositor's address as
  **pool shares** (`lp_shares`), minted at the live share price: the first deposit is 1:1;
  after that `shares = amount × total_shares / pool_assets`, where pool assets = idle
  reserve + principal out on active loans. A deposit never dilutes or enriches anyone.
- **Yield distribution.** `repay_loan` returns principal + 90% of the interest to the pool.
  Because pool assets rise while shares outstanding don't, the share price climbs — that one
  line **is** the pro-rata yield distribution, with no claiming transaction and no dust loops.
  The other 10% accrues as protocol fee, claimable only by the owner. Write-offs from
  defaults lower pool assets the same way, so losses are socialized honestly too.
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
- **The keeper — trusted for timing, never for money.** Studionet exposes no wall clock,
  so "past due" cannot be proven on-chain; the owner acts as keeper and determines default
  off-chain. What bounds that trust is the money flow: liquidation sends **100% of seized
  collateral to the LP pool** — the owner receives none of it — and books **no protocol
  fee**, whereas a repayment would have earned the owner 10% of the interest. Liquidating
  a healthy loan therefore *costs* the keeper revenue and pays them nothing. Liquidation
  is also restricted to ACTIVE loans and books its write-off transparently.
- **The pool — owned by its LPs.** The owner's only claim on contract funds is the accrued
  10% fee pot (`claim_protocol_fees`). Deposits, yield, and withdrawals require no trust in
  the owner at all.

## Honest boundaries

- **No wall-clock on Studionet** — loan due dates are advisory (tracked client-side); the keeper determines default off-chain. A production deploy would source time from a validator oracle and open liquidation past a proven due block.
- **Footprint = Ethereum mainnet** — a fresh Studionet wallet scores low by design. That's the guardrail working: no history, no undercollateralized credit.
- **Single-owner keeper for liquidation** — determining default is one trusted role (no on-chain clock to prove lateness); a production version would decentralize the keeper. LP capital, by contrast, is now fully shareholder-owned — deposits, yield, and withdrawals need no trust in the owner.
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

- **Address:** `0x9AaF3785D411C6782D2138C67A5524878F31E716`
- **Network:** GenLayer Studionet
- **Open in Studio:** [GenLayer Studio](https://studio.genlayer.com/?import-contract=0x9AaF3785D411C6782D2138C67A5524878F31E716)

Stress-tested end-to-end on-chain (on the prior deployment; the scoring/lending logic is unchanged): pinned footprint scored a real mainnet address 94/100 under 5/5 validator consensus; third-party evaluation attempt rejected by the self-evaluation guard; a self-evaluation that attached a whale's footprint URL as "supporting evidence" was accepted but scored the wallet's own thin footprint (31/100) — the injected URL never reached the panel; principal disbursement, utilization premium, solvency refusal, repayment interest booking, and default write-off all verified with balance checks. The LP share model ships on the address above with the deployed source verified byte-identical to this repo (`genlayer code`) and the full share/yield/withdrawal surface covered by the direct tests.

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
