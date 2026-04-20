# Credits & Bibliography

This document records all of the projects, tools, papers, communities, and historical works that have inspired, informed, or directly fed into TextPlus. Its purpose is to keep a running bibliography so we can honour prior work, trace the lineage of ideas, and avoid re-inventing things that already exist.

---

## Direct Upstream Dependencies

These are the four projects that TextPlus directly builds upon or extends.

### Undum
- **Repository:** <https://github.com/idmillington/undum>
- **Author:** Ian Millington
- **License:** MIT
- **Description:** A client-side JavaScript framework for hypertext interactive fiction. Undum provides the core "situation / quality" model that drives dynamic, stateful hypertext stories. Its name traces back to an earlier browser-based game called *Carborundum* (2008), which Ian built before the engine evolved into its current form.
- **Why it matters to TextPlus:** TextPlus Core is a modernised re-implementation of the Undum runtime.

### Raconteur
- **Repository:** <https://github.com/sequitur/raconteur>
- **Scaffold:** <https://github.com/sequitur/raconteur-scaffold>
- **Author:** sequitur
- **License:** MIT
- **Description:** A wrapper library and authoring DSL on top of Undum that reduces boilerplate and introduces a more author-friendly API. Uses CoffeeScript, Browserify, and Gulp. The scaffold repository provides a ready-to-use project template.
- **Why it matters to TextPlus:** TextPlus Author is a modernised continuation of Raconteur, replacing the CoffeeScript/Gulp stack with ESM/Vite.

### Trizbort.io
- **Repository:** <https://github.com/henck/trizbort>
- **Live application:** <https://www.trizbort.io>
- **Author:** Hans Donner (henck)
- **License:** See repository
- **Description:** A TypeScript/browser-based interactive fiction map editor and code generator. It supports room drawing, connection routing, and code export for Inform 7, TADS 3, Alan 2 & 3, Quest, ZIL, and YAML. Built with Vite and the JAMstack (no server back-end).
- **Why it matters to TextPlus:** TextPlus Map adds automated room-layout and transcript-import features to Trizbort.io.

### Transmatte
- **Website:** <https://eblong.com/zarf/transmatte/>
- **Author:** Andrew Plotkin ("Zarf")
- **License:** See site
- **Description:** A tool that takes parser IF transcripts and converts them into a hypertext-style HTML document, giving the feel of an Undum/Raconteur-style forward experience without requiring full re-authoring.
- **Why it matters to TextPlus:** TextPlus Convert is a CLI-first re-implementation and extension of the Transmatte workflow.

---

## Foundational Interactive Fiction Platforms

These are the platforms and engines whose ideas, formats, and communities underpin everything above.

### Infocom & the Z-machine
- **Era:** 1979–1989
- **Key people:** Marc Blank, Dave Lebling, and the Infocom team
- **Description:** Infocom produced the gold-standard parser IF games of the 1980s — *Zork*, *Hitchhiker's Guide to the Galaxy*, *Planetfall*, and more — using their proprietary Z-machine virtual machine. The Z-machine format became the basis for modern open interpreters.
- **Reference:** <https://inform-fiction.org/zmachine/standards/>

### Inform 6 & Inform 7
- **Repository (Inform 7):** <https://github.com/ganelson/inform>
- **Author:** Graham Nelson (Inform 6 & 7); David Kinder and others (community)
- **Description:** Inform 6 (1993) introduced a high-level language that compiled to Z-machine bytecode, democratising IF authoring. Inform 7 (2006) replaced it with a natural-language programming syntax. Both remain active. Raconteur's adaptive-text module draws direct inspiration from Inform 7's say-phrase system.
- **Reference:** <https://ganelson.github.io/inform-website/>

### TADS (Text Adventure Development System)
- **Author:** Michael J. Roberts
- **Description:** First released in 1990, TADS is a C-like language and runtime for parser IF. TADS 3 (2006) introduced an object-oriented framework (adv3) that influenced many later IF libraries.
- **Reference:** <https://www.tads.org/>

### Trizbort (original desktop app)
- **Repository:** <https://github.com/JasonLautzenheiser/trizbort>
- **Author:** Jason Lautzenheiser (original); various contributors
- **License:** MIT
- **Description:** A Windows C# application for drawing and annotating IF maps. It is the desktop predecessor to Trizbort.io and established the room/connection/object vocabulary that the browser version uses.

### Twine
- **Repository:** <https://github.com/klembot/twinejs>
- **Author:** Chris Klimas (original, 2009); open-source community
- **License:** GPL 3.0
- **Description:** The most widely used tool for hypertext IF. Twine's visual passage-map editor massively lowered the barrier to entry for new IF authors and proved that hypertext IF could be mainstream. Supports multiple story formats (SugarCube, Harlowe, Chapbook, Snowman).
- **Reference:** <https://twinery.org/>

### ChoiceScript / Choice of Games
- **Repository:** <https://github.com/dfabulich/choicescript>
- **Author:** Dan Fabulich
- **License:** Proprietary (game engine is open source, platform is commercial)
- **Description:** A plain-text scripting language optimised for stat-driven, long-form branching narratives. Inspired Raconteur's quality/stat system design.
- **Reference:** <https://www.choiceofgames.com/make-your-own-games/choicescript-intro/>

### Ink / Inkle
- **Repository:** <https://github.com/inkle/ink>
- **Author:** Inkle Studios (Joseph Humfrey, Jon Ingold)
- **License:** MIT
- **Description:** A scripting language for interactive narrative, used in *80 Days*, *Heaven's Vault*, and many others. Its tight integration with Unity and broad adoption make it a key reference for modern IF toolchains. Trizbort.io already mentions Ink as a planned code-generation target.
- **Reference:** <https://www.inklestudios.com/ink/>

---

## Community & Archive Resources

### The Interactive Fiction Archive (IFDB / IF Archive)
- **URLs:** <https://ifdb.org> / <https://www.ifarchive.org>
- **Description:** The central library of IF games, tools, and resources. The IF Archive (founded 1992) and IFDB (founded 2007) together form the primary record of the IF community's output. Essential for sourcing public-domain transcripts for TextPlus Convert testing.

### Interactive Fiction Competition (IFComp)
- **URL:** <https://ifcomp.org>
- **Description:** Annual competition running since 1995, the world's oldest and largest short-form IF competition. A key venue for discovering new games and tools relevant to TextPlus.

### ParserComp / Spring Thing
- **URLs:** <https://parsercomp.itch.io> / <https://www.springthing.net>
- **Description:** Annual festivals focusing on parser IF and longer-form work respectively. Important community touchstones.

### Brass Lantern
- **URL:** <http://www.brasslantern.org>
- **Description:** An early (and still archived) web resource for IF authoring tips, tutorials, and reviews. Contains historical writing about Undum predecessors and hypertext IF.

### Sub-Q Magazine / IFTF
- **URL:** <https://iftechfoundation.org>
- **Description:** The Interactive Fiction Technology Foundation funds and maintains key IF infrastructure including the IF Archive, Twine, and Inform. TextPlus should coordinate with IFTF where possible.

---

## Academic & Historical References

### Montfort, Nick — *Twisty Little Passages* (2003)
- MIT Press. The definitive academic history of interactive fiction, tracing the form from *Colossal Cave Adventure* through Infocom and into the hobbyist renaissance.

### Ryan, Marie-Laure — *Narrative as Virtual Reality* (2001)
- Johns Hopkins University Press. Examines immersion, interactivity, and narrativity in digital literature; theoretical backbone for understanding what hypertext IF is trying to do.

### Colossal Cave Adventure (Crowther & Woods, 1976)
- The origin of the genre. The first text adventure, written by Will Crowther and extended by Don Woods. Established the room/exit/object vocabulary that all subsequent IF maps (and therefore Trizbort) are built on.

### Nelson, Graham — "The Craft of Adventure" (1995)
- An influential essay on designing parser IF puzzles and worlds, available on the IF Archive. Shaped the design philosophy of Inform and its successors.

### Aarseth, Espen — *Cybertext: Perspectives on Ergodic Literature* (1997)
- Johns Hopkins University Press. Coined the term "ergodic literature" and provided early theoretical vocabulary for describing the reader/player relationship in interactive texts, including CYOA and parser IF.

---

## Tools & Libraries Used (or Planned) by TextPlus Itself

These are not inspirations per se, but third-party tools TextPlus will build on directly.

| Tool | Purpose | URL |
|------|---------|-----|
| [Vite](https://vitejs.dev/) | Build system / dev server | <https://vitejs.dev/> |
| [TypeScript](https://www.typescriptlang.org/) | Typed JavaScript for TextPlus Core & Author | <https://www.typescriptlang.org/> |
| [Vitest](https://vitest.dev/) | Unit testing | <https://vitest.dev/> |
| [VitePress](https://vitepress.dev/) | Documentation site | <https://vitepress.dev/> |
| [marked](https://marked.js.org/) | Markdown processing in situations | <https://marked.js.org/> |
| [Node.js](https://nodejs.org/) | CLI tools (TextPlus Convert) | <https://nodejs.org/> |

---

## How to Contribute to This Document

If you discover a project, paper, game, or tool that has shaped TextPlus — or that TextPlus should be aware of — please open a pull request adding it here. Include:

1. The name and authors.
2. A URL or citation.
3. A one-sentence note on why it matters to TextPlus.
