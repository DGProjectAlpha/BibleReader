# BibleReader

A modern, cross-platform Bible study application built with Tauri, React, and TypeScript. Designed as a clean replacement for BibleQuote 6/7 with a focus on simplicity, speed, and deep study tools.

## Features

**Multi-Translation Parallel View** — Read multiple Bible translations side by side with synced scrolling. Ships with KJV, ASV, and Russian Synodal out of the box, with more available as downloadable modules.

**Strong's Concordance Integration** — Click any word to see the original Hebrew or Greek, transliteration, full definition, and every occurrence across Scripture. Covers all 8,674 Hebrew and 5,624 Greek entries from the Strong's Exhaustive Concordance.

**Treasury of Scripture Knowledge (TSK)** — Built-in cross-reference system with 572,000+ cross-references, viewable in a dedicated panel alongside your reading.

**Module System** — Import additional translations with one click. Each module is a single `.brbmod` file (SQLite under the hood) containing verse text, Strong's word tagging, and cross-references. No manual folder management required.

**Versification Handling** — Automatic chapter and verse number normalization across translation traditions (e.g., Psalm numbering differences between Hebrew Masoretic and Greek Septuagint texts) using the OSIS standard.

**Full-Text Search** — Search across all loaded translations simultaneously with highlighted results and direct navigation.

**Personal Study Tools** — Verse-level notes and annotations, bookmarks, and reading history. Export notes to file.

**Flexible Layout** — Configurable pane system for arranging translations, Strong's concordance, cross-references, and notes side by side.

**Native Look & Feel** — Platform-specific styling with macOS vibrancy effects (WebKit) and Windows 11 Mica/Acrylic (WebView2). Light and dark themes included.

## Tech Stack

- **Framework**: [Tauri](https://tauri.app/) — small binary, native webview, Rust backend
- **Frontend**: React + TypeScript
- **State Management**: Zustand
- **Local Storage**: SQLite via Tauri SQL plugin
- **Styling**: Platform-adaptive CSS (macOS / Windows 11)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- Tauri CLI: `cargo install tauri-cli`

### Install & Run

```
npm install
cargo tauri dev
```

### Build for Production

```
cargo tauri build
```

## Module Format

Translation modules use the `.brbmod` extension (renamed SQLite databases) with the following schema:

- `verses` — book, chapter, verse, text, versification scheme
- `word_tags` — verse ID, word index, Strong's number
- `cross_references` — source verse, target verse, reference type
- `metadata` — translation name, language, canon scope, license

## License

Private repository. All rights reserved.
