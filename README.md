# TextPlus

**Modernizing the Interactive Fiction Stack**

TextPlus is a project to bridge the gap between the classic, beloved tools of interactive fiction (IF) and the modern web. Rather than starting from scratch, TextPlus builds on the shoulders of giants — updating, connecting, and extending existing open-source IF tools to make them easier to author, easier to play, and better to look at.

---

## Vision

Interactive fiction has a rich history, but many of the best tools are unmaintained, difficult to set up, or locked to outdated workflows. TextPlus aims to:

- **Modernize Undum** — Bring the Undum hypertext IF framework up to current JavaScript/web standards.
- **Modernize Raconteur** — Revive and extend the author-friendly Undum wrapper with a contemporary toolchain.
- **Automate Trizbort** — Add automation and quality-of-life improvements to the Trizbort.io browser-based map/code generator so it is less manual and more intelligent.
- **Automate Transmatte** — Streamline the process of converting parser-IF transcripts into the hypertext-style HTML experiences that Undum and Raconteur produce.

The four tools work together as a coherent pipeline:

```
Parser IF game → Transcript (Transmatte) → Hypertext HTML (Undum/Raconteur) → Visual Map (Trizbort)
```

---

## Components

| Component | Source Upstream | Goal |
|---|---|---|
| **TextPlus Core** | [Undum](https://github.com/idmillington/undum) | Modern ES module re-build of the Undum client-side framework |
| **TextPlus Author** | [Raconteur](https://github.com/sequitur/raconteur) | Updated authoring DSL and build toolchain on top of TextPlus Core |
| **TextPlus Map** | [Trizbort.io](https://github.com/henck/trizbort) | Automated room/connection inference and code-gen improvements |
| **TextPlus Convert** | [Transmatte](https://eblong.com/zarf/transmatte/) | CLI/library to convert parser IF transcripts to Undum-style hypertext |

---

## Status

Phase 0 bootstrap is complete and Phase 1 core implementation is in progress.

- Use [ROADMAP.md](./ROADMAP.md) for live milestone status, coverage targets, and remaining work.
- Use package-level READMEs under `packages/*/README.md` for module inventory, verification commands, and current gaps.

---

## Credits & Inspirations

See [CREDITS.md](CREDITS.md) for the full bibliography of upstream projects, inspirations, historical references, and community resources that TextPlus is built upon.

---

## License

MIT — see [LICENSE](LICENSE).
