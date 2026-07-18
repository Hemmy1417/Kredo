<p align="center">
  <img src="https://raw.githubusercontent.com/Hemmy1417/Kredo/main/frontend/app/icon.svg" alt="Kredo" width="140" />
</p>

# Kredo - Reputation-Based Lending Pool

**Borrow on your reputation. A real undercollateralized lending pool on GenLayer.**

Depositors fund a shared pool for LP shares. Borrowers earn a credit score from their *real*
on-chain footprint - fetched by validator consensus from evidence the contract derives from the
address itself, scored by a published deterministic rubric - and borrow real GEN against it with
less than full collateral. Maturity, late fees, and liquidation are enforced against a
consensus-fetched wall-clock.

Live app: **https://kredo-psi.vercel.app**

## What it is

- **History you can't fake, not documents you submit** - the contract picks the evidence (the
  borrower's own on-chain footprint), never the borrower.
- **Fishing-proof scoring** - the panel only *extracts facts*; a published rubric in contract code
  maps facts to the score. Same footprint, same score - and **no operator path to a score at all**.
- **A real pool, owned by its LPs** - vault-style shares, automatic pro-rata yield, open
  withdrawals; the owner has no claim on LP capital.
- **Enforced maturity, real wall-clock** - due dates are proven by consensus-fetched UTC;
  liquidation is permissionless once time-proven, with a keeper reward.
- **Real credit economics** - partial repayment, 5% late fee to LPs, a loss-reserve buffer that
  absorbs defaults before LP share price, experience-rated APR.

## The difference

| | Document-KYC AI lending | Kredo |
|---|---|---|
| Who picks the evidence | The borrower uploads documents | The contract derives the source from the address - you supply nothing |
| Can it be gamed | Hashing proves a document is *unaltered*, not *true* | An on-chain footprint is append-only and costly to forge |
| How the score is set | An AI generates a black-box number | A published rubric maps extracted facts to a score - auditable, repeatable |
| Attack surface | User-supplied documents feed the AI | Zero - no user-controlled input ever reaches the panel |
| Onboarding | KYC flow, PII handled | One wallet click, nothing to upload, no PII |

Honest scope: Kredo underwrites **crypto-native** reputation - a wallet with no history scores low,
by design.

## How it works

### For lenders (LPs)
1. Deposit GEN - shares mint pro-rata against pool value.
2. Most of every interest payment raises the share price automatically; a slice tops up the loss
   reserve; 10% accrues as protocol fee.
3. Withdraw principal + earned yield any time against unlent liquidity.

### For borrowers
1. Evaluate your own wallet - only the connected wallet can (re)score itself, and the panel reads
   only the contract-pinned footprint (Blockscout's keyless JSON API, built from your address).
2. Preview terms - APR = base rate (score) + utilization premium (Aave-style kink) + prior-default
   surcharge; every component itemised.
3. Borrow - collateral escrows and the principal disburses in the same transaction.
4. Repay in full or in part; on-time settlement refunds collateral and lifts your standing (+5 per
   repaid loan, -20 per default). Late costs a flat 5% of principal, paid to LPs.
5. Default past due + grace and anyone may liquidate - the contract re-fetches the clock and only
   proceeds if lateness is *proven*, so a current borrower cannot be griefed.

## Scoring

| Extracted fact | Who determines it |
|---|---|
| Transaction count, token transfers, ENS, contract flag | The panel extracts them from the pinned footprint page under consensus. |
| Footprint score | The contract's published rubric - a fixed formula over those facts. |
| Standing above the footprint | Only the deterministic loan record: +5 per repaid loan, -20 per default. |

There is no lucky high sample to re-roll for, no user-supplied URL to carry an injection, and no
admin override - the `override_score` backdoor was **removed entirely**, not disabled.

## Loan lifecycle

```text
scored -> ACTIVE -> REPAID                        (full, or partial payments that clear it)
              \-> past due + grace (clock-proven)
                    \-> late repay (+5% fee to LPs)
                    \-> LIQUIDATED                (permissionless keeper + reward)
```

| Status | What happens |
|---|---|
| `ACTIVE` | Principal disbursed, collateral escrowed, running balance tracked across partial payments. |
| `REPAID` | Cleared - collateral refunded, reputation +5, interest split LPs / loss reserve / protocol. |
| `LIQUIDATED` | Time-proven default - collateral seized to the pool, keeper rewarded, reputation -20, shortfall booked against the loss reserve first. |

## GenLayer consensus functions

| Function | Kind | What runs under consensus |
|---|---|---|
| `evaluate_identity` | write | Validators fetch the contract-derived Blockscout footprint; the LLM extracts hard facts; equivalence on the facts; the contract computes the score deterministically. |
| `request_loan` (clock path) | write, payable | Fetches UTC under consensus to stamp a genuine due date + grace window. |
| `liquidate_loan` | write | Re-fetches the clock and proceeds only if the loan is provably overdue. |

Everything else - share math, pricing, splits, the loss reserve, the solvency guard - is
deterministic contract code.

## Contract

| Field | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com` |
| Contract address | [`0xE9a53f5710EE8232b9098046D0De0DFC36b4F099`](https://studio.genlayer.com/?import-contract=0xE9a53f5710EE8232b9098046D0De0DFC36b4F099) |
| Source | `contracts/kredo.py` |

### Write methods

| Method | Who | Payable | Notes |
|---|---|---|---|
| `deposit_liquidity()` | anyone | deposit | Mints LP shares pro-rata. |
| `withdraw_liquidity(shares_to_burn)` | LP | - | Principal + yield against unlent liquidity. |
| `evaluate_identity(borrower_address)` | the wallet itself | - | Self-evaluation only; zero user-supplied evidence. |
| `request_loan(borrower, amount, collateral, duration_days)` | scored borrower | collateral | Solvency guard refuses loans the idle reserve cannot fund. |
| `repay_loan(loan_id, amount)` | borrower | repayment | Partial or full; late adds the 5% fee to LPs. |
| `liquidate_loan(loan_id)` | anyone (keeper) | - | Time-proven only; keeper reward from the seized collateral. |
| `claim_protocol_fees()` | owner | - | The 10% protocol slice only - never LP capital, never a score. |
| `set_min_reputation(new_minimum)` | owner | - | Pool-wide risk gate; cannot touch an individual score. |

### Read methods

`get_reputation`, `get_loan`, `preview_loan_terms`, `get_lp_position`, `get_pool_stats`,
`get_protocol_params`

### Consensus guarantees

- **The score is derived, never assigned** - facts under consensus, rubric in public code, no
  override path.
- **The clock fails closed** - no trusted time means no late fee and no liquidation; an outage only
  delays the adverse action. (Loans opened during an outage fall back to an owner-keeper for
  liquidation - the one disclosed exception.)
- **Owner-power boundary** - the owner cannot seize a current loan, withdraw LP capital, or move a
  score.

## Verified end-to-end

Three live stress rounds on the deployed lineage (2026-07):

```text
score       -> deterministic 49 -> 49 on repeated evaluation of the same wallet
injection   -> flattering / commanding content cannot reach the panel (no user URLs exist)
borrow      -> collateral escrowed + principal disbursed in one transaction
late repay  -> fetched clock proved the due date; +5% fee routed to LPs
liquidate   -> permissionless keeper call, time-proven; collateral to pool, reward to keeper
withdraw    -> LP burned shares for principal + yield; book stayed solvent throughout
```

> Round 1 caught and fixed an inert clock and an owner-could-liquidate-current-loans hole; round 3
> removed the `override_score` no-op backdoor - the "no operator" trust claim is now structural.

**56 direct-mode tests** cover the share math, the pricing model, splits, the loss reserve, partial
repayment, the maturity guards, and the scoring rubric.

## Tech stack

| Layer | Tech |
|---|---|
| Intelligent Contract | Python on GenVM (pool, scoring, loans, liquidation) |
| Consensus | `gl.eq_principle` fact extraction + nondet explorer fetches |
| Frontend | Next.js, React, Tailwind - private-bank green/gold (`/desk` `/vault` `/register`) |
| Web3 | GenLayerJS, EIP-6963 injected wallets |
| Backend | None - the contract is the source of truth |

## Repository

```text
contracts/kredo.py          The Intelligent Contract (v0.4, deployed)
tests/direct/               56 direct-mode tests, pytest
frontend/                   Next.js app (desk, vault, register)
```

## Getting started

```bash
# contract tests
python -m pytest tests/direct -q

# frontend
cd frontend
cp .env.example .env.local     # contract address prefilled for Studionet
npm install
npm run dev
```

## Security

- Zero user-supplied evidence in the scoring path; the footprint source is contract-derived from
  the address (`eth.blockscout.com`, keyless JSON) - no URL exists for an injection to ride in on.
- Only the connected wallet can evaluate its own score - nobody re-rolls a score they don't own.
- Maturity enforcement fails closed; the divergence guard bounds clock skew and the earliest
  corroborated reading favours the borrower.
- The loss reserve absorbs defaults before LP share price; the solvency guard protects the whole
  book.
- Wallet payouts go through an empty `@gl.evm.contract_interface` proxy (`emit_transfer` at a plain
  wallet strands value). The constructor coerces the owner argument to `Address` - genlayer-js
  passes constructor args as strings.

## Design notes

- Undercollateralized lending only works if reputation is sybil-expensive: a fresh wallet scores
  near zero, and building a real footprint costs more than the collateral discount is worth.
- Late fees route to LPs, not the protocol - the party bearing the delay risk earns the penalty.
- The keeper reward makes liquidation self-executing without an operator, and it is safe to pay
  precisely because lateness is proven, not asserted.

## Disclaimer

Kredo is a hackathon project on a test network. Deposits, loans, and collateral are testnet GEN; do
not use the contract for real lending without an audit.
