# Reference: counterparty

Pre-CPI counterparty risk check. Use this when the user is about to
integrate with another Solana program, oracle, lending pool, or deployer
they did not write themselves.

## When to use

- User says "I want to do CPI to program X"
- User is integrating an oracle, AMM, lending pool, vault, etc
- User is choosing between two SDKs / programs to integrate
- User is reviewing a smart contract that delegates to other programs
- User is generating code (with `safe-solana-builder` or similar) that includes a `program_id` they did not author

## Why this matters

Pre-deploy security skills (`safe-solana-builder`, `trailofbits`, `qedgen`)
verify the user's own code. They cannot verify the **operator** behind a
program the user is integrating with. SolSentry fills that gap.

A CPI to a program deployed by a known serial rug operator inherits that
operator's risk profile. The user's code may be perfect, but if they call
into a program that is a honeypot, the integration is unsafe.

## Tools to call

| Step | Tool | Purpose |
|---|---|---|
| 1 | Resolve program → deployer | The deployer is the wallet that funded the BPF upgrade authority |
| 2 | `check_operator(deployer)` | Get risk profile of the wallet that shipped the program |
| 3 | If risk ≥ HIGH → warn | Recommend an alternative program or a defense pattern |

## How to resolve program → deployer

Use the Solana RPC to fetch the BPF upgrade authority for the program account:

```ts
const programInfo = await connection.getAccountInfo(new PublicKey(programId));
// programInfo.data contains the upgrade authority address
```

Or, if SolSentry has indexed the program already:

```bash
curl https://api.solsentry.app/v1/operator/{deployer_wallet}
```

The user can also paste the program ID directly into
`https://solsentry.app/operator/{program_id}` if the deployer was
auto-detected during scanning.

## Output guidance

When the deployer comes back **CRITICAL** or **HIGH**:

> ⚠️ The program `<program_id>` was deployed by `<deployer>`, who has
> `<N>` confirmed rugs across `<M>` tokens (`<rate>%` rug rate). Integrating
> with a program from this operator inherits their risk profile.
>
> Suggestions:
> - Verify the program is immutable (`solana program show <id>` → no upgrade authority)
> - Consider an alternative provider for this functionality
> - Add a circuit breaker that halts your program if anomalous behavior is detected

When the deployer is **CLEAN** or **LOW**:

> ✓ The program `<program_id>` was deployed by an operator with no
> confirmed rug history. Risk score: `<score>/100`. Standard CPI
> validation patterns still apply (account ownership, signer checks,
> reload after CPI).

When the deployer is **UNKNOWN**:

> ⓘ The deployer of `<program_id>` (`<wallet>`) is not in SolSentry's
> tracked operator database. This is neither a green nor red flag.
> Standard CPI validation patterns are required regardless.

## Common pitfall

Do not check the program ID itself in `check_operator` — operators are
**wallets**, not programs. Always resolve to the deployer wallet first.
The exception is when the user explicitly passes a program ID to
`check_token` (which treats program-as-mint for some launchpad cases).
