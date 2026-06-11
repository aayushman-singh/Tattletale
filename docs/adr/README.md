# Architecture Decision Records

Short, dated records of the load-bearing decisions behind Tattletale's scraping pipeline. Each ADR follows the standard format: Title, Status, Context, Decision, Consequences.

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-session-management.md) | Session management strategy | Accepted |
| [0002](0002-rate-limit-and-proxy-strategy.md) | Rate-limit, anti-bot, and proxy strategy | Accepted |
| [0003](0003-cross-identity-correlation.md) | Cross-identity correlation algorithm | Accepted (7-signal scorer; co-presence added) |
| [0004](0004-signed-custody.md) | Cryptographically sealed chain of custody | Accepted (Ed25519 seal) |

These describe the **hackathon-winning** version of Tattletale (the code in this repo). Where the implementation is thinner than the design, the ADR says so explicitly.
