# BibleReader Module Format — `.brbmod`

A `.brbmod` file is a plain JSON file renamed with the `.brbmod` extension.
Drop one into BibleReader's import dialog and the app installs it permanently.

---

## File Structure

```json
{
  "meta": {
    "name":         "Full translation name",
    "abbreviation": "SHORT",
    "language":     "en",
    "format":       "plain",
    "version":      1,
    "copyright":    "Optional copyright notice",
    "notes":        "Optional source notes"
  },
  "data": { ... }
}
```

### meta fields

| Field         | Type              | Required | Description                                      |
|---------------|-------------------|----------|--------------------------------------------------|
| name          | string            | yes      | Human-readable name, e.g. "King James Version"   |
| abbreviation  | string            | yes      | Short ID used in the UI, e.g. "KJV"              |
| language      | string            | yes      | BCP-47 tag: "en", "ru", "he", "el", etc.         |
| format        | "plain"/"tagged"  | yes      | Controls how `data` is parsed (see below)        |
| version       | number            | yes      | Schema version — currently 1                     |
| copyright     | string            | no       | License or copyright text                        |
| notes         | string            | no       | Source, encoding, or tagging notes               |

---

## Data Formats

### format: "plain"

Untagged verse strings. Use this for translations without Strong's data.

```json
{
  "meta": { "format": "plain", ... },
  "data": {
    "Genesis": {
      "1": [
        "In the beginning God created the heaven and the earth.",
        "And the earth was without form, and void..."
      ],
      "2": [ "..." ]
    },
    "Matthew": { "1": [ "..." ] }
  }
}
```

- Top-level keys = canonical book names (must match names in `src/data/books.ts`)
- Chapter keys = 1-indexed strings: "1", "2", "3", ...
- Each chapter array is 0-indexed verses (index 0 = verse 1)

### format: "tagged"

Per-word tokens with Strong's concordance numbers. Use this when you have
precise word-level tagging (H### for Hebrew/OT, G### for Greek/NT).

```json
{
  "meta": { "format": "tagged", ... },
  "data": [
    {
      "name": "Genesis",
      "chapters": [
        [
          [
            { "word": "In",          "strongs": ["H7225"] },
            { "word": "the",         "strongs": [] },
            { "word": "beginning",   "strongs": ["H7225"] },
            { "word": "God",         "strongs": ["H430"] },
            { "word": "created",     "strongs": ["H1254"] },
            { "word": "the",         "strongs": [] },
            { "word": "heaven",      "strongs": ["H8064"] },
            { "word": "and",         "strongs": [] },
            { "word": "the",         "strongs": [] },
            { "word": "earth.",      "strongs": ["H776"] }
          ]
        ]
      ]
    }
  ]
}
```

- `data` is an array of book objects, in canonical Bible order
- `chapters` is a 0-indexed array (chapters[0] = chapter 1)
- Each chapter is a 0-indexed array of verses (verse[0] = verse 1)
- Each verse is an array of `{ word, strongs }` tokens
- `strongs` may be `[]` if the word has no concordance number (articles, conjunctions, etc.)
- Multiple Strong's numbers per word are valid for compound concepts

---

## How Import Works

1. User opens the Import dialog and selects a `.brbmod` file
2. App reads and validates `meta` (required fields + format check)
3. Based on `meta.format`:
   - `plain` → `registerCustomTranslation(abbreviation, data)`
   - `tagged` → `registerTaggedTranslation(abbreviation, data)`
4. A permanent copy is written to the app's local data dir (Tauri app data)
5. On every subsequent launch, all installed `.brbmod` files are loaded automatically
6. Notes, highlights, and bookmarks keyed to `meta.abbreviation` persist alongside

---

## Modules in This Folder

| File                | Translation                  | Format  | Language |
|---------------------|------------------------------|---------|----------|
| KJV.brbmod          | King James Version           | tagged  | en       |
| ASV.brbmod          | American Standard Version    | tagged  | en       |
| RST_Strong.brbmod   | Russian Synodal (Strong's)   | tagged  | ru       |

> KJV and ASV are built-in to the app and do not need to be imported.
> They are included here as reference modules and for testing the import pipeline.
