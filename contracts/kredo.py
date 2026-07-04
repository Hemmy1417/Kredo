# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing


class Kredo(gl.Contract):
    """
    Identity-Linked Lending Protocol on GenLayer.

    Enables undercollateralized loans by linking real-world identity signals
    (on-chain history, ENS, Gitcoin Passport, credit bureau APIs, etc.)
    to an on-chain reputation score.  Borrowers with a good standing can
    unlock better loan-to-value ratios and lower interest rates.
    """

    # ── persistent state ────────────────────────────────────────────────────────

    # reputation registry  {address_str -> ReputationProfile (serialised as dict)}
    reputation_registry: TreeMap[str, str]

    # loan registry  {loan_id_str -> Loan (serialised as dict)}
    loans: TreeMap[str, str]

    # next loan counter
    loan_counter: u256

    # protocol owner (sets parameters, pauses, etc.)
    owner: str

    # minimum reputation score required to borrow at all
    min_reputation_to_borrow: u256

    # ── constructor ─────────────────────────────────────────────────────────────

    def __init__(self, owner: str, min_reputation_to_borrow: int):
        self.reputation_registry = TreeMap()
        self.loans = TreeMap()
        self.loan_counter = u256(0)
        self.owner = owner
        self.min_reputation_to_borrow = u256(min_reputation_to_borrow)

    # ────────────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ────────────────────────────────────────────────────────────────────────────

    def _only_owner(self) -> None:
        if gl.message.sender_account != self.owner:
            raise gl.vm.UserError("Only the contract owner can call this function")

    def _get_profile(self, address: str) -> typing.Any:
        raw = self.reputation_registry.get(address)
        if raw is None:
            return {
                "address": address,
                "score": 0,
                "identity_sources": [],
                "last_updated": "",
                "total_loans_repaid": 0,
                "total_loans_defaulted": 0,
                "verified": False,
            }
        return json.loads(raw)

    def _save_profile(self, profile: dict) -> None:
        self.reputation_registry[profile["address"]] = json.dumps(profile)

    def _get_loan(self, loan_id: str) -> typing.Any:
        raw = self.loans.get(loan_id)
        if raw is None:
            raise gl.vm.UserError(f"Loan {loan_id} not found")
        return json.loads(raw)

    def _save_loan(self, loan: dict) -> None:
        self.loans[loan["loan_id"]] = json.dumps(loan)

    def _score_to_collateral_ratio_bps(self, score: int) -> int:
        """
        Maps reputation score (0-100) to required collateral ratio in basis
        points (1% = 100 bps). Integer math throughout so wei-scale amounts
        keep full precision.

        Score  0  → 15000 (150 % collateral)
        Score 25 → 13000 (130 %)
        Score 50 → 11000 (110 %)
        Score 75 → 9000  (90 %)
        Score 90 → 7000  (70 %)
        """
        if score < 0:
            score = 0
        if score > 100:
            score = 100

        if score >= 90:
            return 7000
        elif score >= 75:
            return 9000
        elif score >= 50:
            return 11000
        elif score >= 25:
            return 13000
        else:
            return 15000

    def _score_to_interest_rate_bps(self, score: int) -> int:
        """
        Annual interest rate in basis points (1 % = 100 bps).

        Score  0  → 2000 (20 % APR)
        Score 25 → 1500 (15 %)
        Score 50 → 1200 (12 %)
        Score 75 → 800  (8 %)
        Score 90 → 500  (5 %)
        """
        if score < 0:
            score = 0
        if score > 100:
            score = 100

        if score >= 90:
            return 500
        elif score >= 75:
            return 800
        elif score >= 50:
            return 1200
        elif score >= 25:
            return 1500
        else:
            return 2000

    # ────────────────────────────────────────────────────────────────────────────
    # REPUTATION  (AI-powered, reads real-world data)
    # ────────────────────────────────────────────────────────────────────────────

    @gl.public.write
    def evaluate_identity(
        self,
        borrower_address: str,
        identity_sources: typing.Any,
    ) -> typing.Any:
        """
        Fetches and evaluates real-world identity signals for *borrower_address*.

        identity_sources is a list of dicts, each with:
          - "type"  : "ens" | "gitcoin_passport" | "onchain_history" | "credit_api"
          - "url"   : publicly accessible data URL for this signal
          - "label" : human-readable label

        The function uses GenLayer's non-deterministic web fetcher + an LLM prompt
        (wrapped in strict equality consensus) to derive a 0-100 reputation score.
        """
        profile = self._get_profile(borrower_address)

        def compute_score() -> typing.Any:
            source_snippets = []

            for source in identity_sources:
                src_type = source.get("type", "unknown")
                url = source.get("url", "")
                label = source.get("label", src_type)

                if not url:
                    continue

                # A single blocked/failed URL must NOT kill the whole consensus
                # round — many identity sources (Etherscan, LinkedIn, some
                # ENS pages) return 403 to validator fetchers. Skip the
                # unreachable ones and score from what did load.
                try:
                    web_data = gl.nondet.web.render(url, mode="text")
                except Exception as e:
                    source_snippets.append(
                        f"--- {label} ({src_type}) ---\n"
                        f"[This source could not be fetched by validators — "
                        f"treat as no evidence: {str(e)[:180]}]\n"
                    )
                    continue

                source_snippets.append(
                    f"--- {label} ({src_type}) ---\n{web_data[:2000]}\n"
                )

            combined_data = "\n".join(source_snippets) if source_snippets else "No data."

            task = f"""
You are a credit-risk AI for a decentralised lending protocol.

Analyse the following identity and on-chain data for wallet address: {borrower_address}

DATA:
{combined_data}

Based on this data, assign a REPUTATION SCORE from 0 to 100 where:
  0-24  = High risk / unverified
  25-49 = Low-medium risk
  50-74 = Medium risk, some track record
  75-89 = Good standing, solid history
  90-100= Excellent standing, highly trusted

Factors to consider:
- Proof of real-world identity (ENS, verified social, government ID signals)
- On-chain transaction history (age, diversity, volume)
- Gitcoin Passport / Proof-of-Humanity score if present
- Past loan repayment history
- Any red flags (mixing, sanctions lists, exploits)

Respond ONLY with this JSON (no markdown, no extra text):
{{
    "score": <integer 0-100>,
    "summary": "<2-3 sentence plain-English explanation>",
    "risk_tier": "<HIGH|MEDIUM|LOW|VERY_LOW>",
    "flags": ["<flag1>", "<flag2>"]
}}
"""
            return gl.nondet.exec_prompt(task)

        # Bucketed consensus: validators must agree on the score tier and the
        # risk_tier label, but summary wording and flags can differ. This
        # avoids UNDETERMINED consensus that byte-exact strict_eq causes on
        # LLM output. Same discipline as the sibling AI contracts.
        principle = (
            "Outputs are equivalent if the numeric 'score' falls in the same "
            "bucket (0-24, 25-49, 50-74, 75-89, 90-100) AND 'risk_tier' is the "
            "same label. 'summary' wording and 'flags' contents may differ freely."
        )
        raw = gl.eq_principle.prompt_comparative(compute_score, principle)
        text = raw.strip()
        if "```" in text:
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())

        # persist updated profile
        profile["score"] = int(result["score"])
        profile["identity_sources"] = [s.get("label", "") for s in identity_sources]
        profile["last_updated"] = "updated"   # block timestamp placeholder
        profile["verified"] = True
        self._save_profile(profile)

        return {
            "address": borrower_address,
            "score": result["score"],
            "summary": result["summary"],
            "risk_tier": result["risk_tier"],
            "flags": result.get("flags", []),
            "collateral_ratio_bps": self._score_to_collateral_ratio_bps(result["score"]),
            "interest_rate_bps": self._score_to_interest_rate_bps(result["score"]),
        }

    # ────────────────────────────────────────────────────────────────────────────
    # LOAN LIFECYCLE
    # ────────────────────────────────────────────────────────────────────────────

    @gl.public.write.payable
    def request_loan(
        self,
        borrower_address: str,
        loan_amount: int,          # symbolic loan amount, smallest unit
        collateral_amount: int,    # smallest unit — must match msg.value
        duration_days: int,
    ) -> typing.Any:
        """
        Escrow collateral GEN. The caller sends `gl.message.value` GEN which
        becomes the loan's collateral. Under-collateralization is the whole
        point: a higher reputation score requires LESS collateral vs the
        symbolic loan_amount.

        - loan_amount is a symbolic claim (no counterparty pays it out here)
        - collateral_amount is real GEN, transferred via msg.value
        - repay_loan → refunds this collateral
        - liquidate_loan → sends this collateral to the liquidator
        """
        profile = self._get_profile(borrower_address)
        score = profile["score"]

        if score < int(self.min_reputation_to_borrow):
            raise gl.vm.UserError(
                f"Reputation score {score} is below the minimum "
                f"{int(self.min_reputation_to_borrow)} required to borrow"
            )

        # All math in BPS to keep wei-scale amounts precise (Python floats
        # lose precision above ~1e15, and loans are 1e18+ wei).
        ratio_bps = self._score_to_collateral_ratio_bps(score)
        apr_bps   = self._score_to_interest_rate_bps(score)
        required_collateral = (loan_amount * ratio_bps) // 10000

        sent_value = int(gl.message.value)
        if sent_value < required_collateral:
            raise gl.vm.UserError(
                f"Insufficient collateral. Required: {required_collateral} wei, "
                f"sent {sent_value} wei (ratio {ratio_bps//100}% for score {score})"
            )
        collateral_amount = sent_value
        interest_amount = (loan_amount * apr_bps * duration_days) // (10000 * 365)
        repayment_amount = loan_amount + interest_amount

        self.loan_counter = u256(int(self.loan_counter) + 1)
        loan_id = str(int(self.loan_counter))

        loan = {
            "loan_id": loan_id,
            "borrower": borrower_address,
            "loan_amount": loan_amount,
            "collateral_amount": collateral_amount,
            "collateral_ratio_bps": ratio_bps,
            "interest_rate_bps": apr_bps,
            "interest_amount": interest_amount,
            "repayment_amount": repayment_amount,
            "duration_days": duration_days,
            "reputation_score_at_origination": score,
            "status": "ACTIVE",       # ACTIVE | REPAID | DEFAULTED | LIQUIDATED
            "created_at": "created",  # block timestamp placeholder
        }
        self._save_loan(loan)

        return {
            "loan_id": loan_id,
            "status": "ACTIVE",
            "loan_amount": loan_amount,
            "collateral_amount": collateral_amount,
            "required_collateral": required_collateral,
            "collateral_ratio_bps": ratio_bps,
            "interest_rate_bps": apr_bps,
            "interest_amount": interest_amount,
            "repayment_amount": repayment_amount,
            "duration_days": duration_days,
            "reputation_score": score,
        }

    @gl.public.write
    def repay_loan(self, loan_id: str, repayment_amount: int) -> typing.Any:
        """
        Close a loan cleanly: refund the escrowed collateral to the borrower
        and boost their reputation. Only the borrower may repay.

        `repayment_amount` is retained for wire compatibility with older
        clients; the actual money moved is the refund of the collateral.
        """
        loan = self._get_loan(loan_id)

        if loan["status"] != "ACTIVE":
            raise gl.vm.UserError(f"Loan {loan_id} is not active (status: {loan['status']})")

        sender = str(gl.message.sender_address)
        if sender.lower() != str(loan["borrower"]).lower():
            raise gl.vm.UserError("only the borrower may repay this loan")

        # Refund the exact collateral that was escrowed.
        refund = int(loan["collateral_amount"])
        if refund > 0:
            gl.get_contract_at(Address(loan["borrower"])).emit_transfer(
                value=u256(refund), on="finalized"
            )

        loan["status"] = "REPAID"
        self._save_loan(loan)

        # boost borrower reputation
        profile = self._get_profile(loan["borrower"])
        profile["total_loans_repaid"] = profile.get("total_loans_repaid", 0) + 1
        boost = min(5, 100 - profile["score"])   # cap at 100
        profile["score"] = profile["score"] + boost
        self._save_profile(profile)

        return {
            "loan_id": loan_id,
            "status": "REPAID",
            "collateral_refunded": refund,
            "new_reputation_score": profile["score"],
            "score_boost": boost,
        }

    @gl.public.write
    def liquidate_loan(self, loan_id: str) -> typing.Any:
        """
        Liquidate a defaulted loan. Sends the escrowed collateral to the
        liquidator as their reward, and penalises the borrower's score.

        Studionet has no wall-clock, so we don't enforce a grace period on-chain
        — anyone can trigger, but the borrower's own repay always beats a
        liquidation to the same block, since transactions serialize.
        """
        loan = self._get_loan(loan_id)

        if loan["status"] != "ACTIVE":
            raise gl.vm.UserError(f"Loan {loan_id} is not active")

        # The liquidator gets the collateral as bounty.
        liquidator = str(gl.message.sender_address)
        bounty = int(loan["collateral_amount"])
        if bounty > 0:
            gl.get_contract_at(Address(liquidator)).emit_transfer(
                value=u256(bounty), on="finalized"
            )

        loan["status"] = "LIQUIDATED"
        loan["liquidator"] = liquidator
        self._save_loan(loan)

        profile = self._get_profile(loan["borrower"])
        profile["total_loans_defaulted"] = profile.get("total_loans_defaulted", 0) + 1
        penalty = min(20, profile["score"])      # floor at 0
        profile["score"] = profile["score"] - penalty
        self._save_profile(profile)

        return {
            "loan_id": loan_id,
            "status": "LIQUIDATED",
            "liquidator": liquidator,
            "bounty_paid": bounty,
            "new_reputation_score": profile["score"],
            "score_penalty": penalty,
        }

    # ────────────────────────────────────────────────────────────────────────────
    # ADMIN
    # ────────────────────────────────────────────────────────────────────────────

    @gl.public.write
    def set_min_reputation(self, new_minimum: int) -> None:
        """Owner can adjust the minimum reputation score required to borrow."""
        self._only_owner()
        self.min_reputation_to_borrow = u256(new_minimum)

    @gl.public.write
    def override_score(self, address: str, new_score: int, reason: str) -> None:
        """
        Emergency admin override — e.g. after a manual KYC review.
        Emits the reason for auditability.
        """
        self._only_owner()
        if new_score < 0 or new_score > 100:
            raise gl.vm.UserError("Score must be between 0 and 100")
        profile = self._get_profile(address)
        profile["score"] = new_score
        profile["last_updated"] = f"admin_override: {reason}"
        self._save_profile(profile)

    # ────────────────────────────────────────────────────────────────────────────
    # VIEWS
    # ────────────────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_reputation(self, address: str) -> typing.Any:
        """Return the full reputation profile for an address.
        collateral_ratio_bps and interest_rate_bps are in basis points (1% = 100 bps)
        to avoid float serialisation issues.
        """
        profile = self._get_profile(address)
        score = profile["score"]
        return {
            **profile,
            "collateral_ratio_bps": self._score_to_collateral_ratio_bps(score),
            "interest_rate_bps": self._score_to_interest_rate_bps(score),
        }

    @gl.public.view
    def get_loan(self, loan_id: str) -> typing.Any:
        """Return full details of a single loan."""
        return self._get_loan(loan_id)

    @gl.public.view
    def preview_loan_terms(
        self, borrower_address: str, loan_amount: int, duration_days: int
    ) -> typing.Any:
        """
        Preview the terms a borrower would receive RIGHT NOW,
        without actually opening a loan.
        collateral_ratio_bps and interest_rate_bps in basis points to avoid float issues.
        """
        profile = self._get_profile(borrower_address)
        score = profile["score"]
        ratio_bps = self._score_to_collateral_ratio_bps(score)
        apr_bps   = self._score_to_interest_rate_bps(score)
        required_collateral = (loan_amount * ratio_bps) // 10000
        interest = (loan_amount * apr_bps * duration_days) // (10000 * 365)

        return {
            "borrower": borrower_address,
            "reputation_score": score,
            "loan_amount": loan_amount,
            "required_collateral": required_collateral,
            "collateral_ratio_bps": ratio_bps,
            "interest_rate_bps": apr_bps,
            "interest_amount": interest,
            "repayment_amount": loan_amount + interest,
            "duration_days": duration_days,
            "eligible": score >= int(self.min_reputation_to_borrow),
        }

    @gl.public.view
    def get_protocol_params(self) -> typing.Any:
        """Return current protocol parameters."""
        return {
            "owner": self.owner,
            "min_reputation_to_borrow": int(self.min_reputation_to_borrow),
            "total_loans_issued": int(self.loan_counter),
        }