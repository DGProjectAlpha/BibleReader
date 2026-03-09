import { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, FileDown, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useBibleStore, Note } from '../store/bibleStore';
import { getChapterText } from '../data/bibleLoader';

interface ExportNotesModalProps {
  onClose: () => void;
}

type SortField = 'location' | 'updated' | 'created';
type SortDir = 'asc' | 'desc';

function verseRef(note: Note) {
  return `${note.book} ${note.chapter}:${note.verse}`;
}

// Bible book order for location sorting
const BOOK_ORDER = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];

function bookIndex(book: string) {
  const idx = BOOK_ORDER.indexOf(book);
  return idx === -1 ? 999 : idx;
}

export function ExportNotesModal({ onClose }: ExportNotesModalProps) {
  const notes = useBibleStore((s) => s.notes);
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);

  // Translation to use for verse text lookup — fall back to KJV if no panes
  const translation = panes[activePaneIndex]?.selectedTranslation ?? 'KJV';

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('location');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(notes.map((n) => n.id)));
  // Order list for export (IDs in chosen sequence)
  const [exportOrder, setExportOrder] = useState<string[]>(() => notes.map((n) => n.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tab, setTab] = useState<'select' | 'order'>('select');

  // Filtered + sorted list for the selection tab
  const displayNotes = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = notes.filter(
      (n) =>
        verseRef(n).toLowerCase().includes(q) ||
        n.text.toLowerCase().includes(q),
    );
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'location') {
        cmp = bookIndex(a.book) - bookIndex(b.book);
        if (cmp === 0) cmp = a.chapter - b.chapter;
        if (cmp === 0) cmp = a.verse - b.verse;
      } else if (sortField === 'updated') {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [notes, search, sortField, sortDir]);

  // Ordered notes for the order tab (only selected, in exportOrder sequence)
  const orderedSelected = useMemo(() => {
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    return exportOrder
      .filter((id) => selected.has(id))
      .map((id) => noteMap.get(id))
      .filter(Boolean) as Note[];
  }, [notes, exportOrder, selected]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleNote(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Ensure it's in exportOrder
        setExportOrder((o) => (o.includes(id) ? o : [...o, id]));
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(displayNotes.map((n) => n.id)));
    setExportOrder((prev) => {
      const existing = new Set(prev);
      const toAdd = displayNotes.map((n) => n.id).filter((id) => !existing.has(id));
      return [...prev, ...toAdd];
    });
  }

  function selectNone() {
    const toRemove = new Set(displayNotes.map((n) => n.id));
    setSelected((prev) => {
      const next = new Set(prev);
      toRemove.forEach((id) => next.delete(id));
      return next;
    });
  }

  // Drag-to-reorder helpers
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnter(id: string) {
    if (id !== dragId) setDragOver(id);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOver(null);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOver(null);
      return;
    }
    setExportOrder((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(dragId);
      const toIdx = arr.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragId);
      return arr;
    });
    setDragId(null);
    setDragOver(null);
  }

  function moveUp(id: string) {
    setExportOrder((prev) => {
      const arr = [...prev];
      const idx = arr.indexOf(id);
      if (idx <= 0) return prev;
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(id: string) {
    setExportOrder((prev) => {
      const arr = [...prev];
      const idx = arr.indexOf(id);
      if (idx === -1 || idx >= arr.length - 1) return prev;
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  function handleExport() {
    // A4 dimensions in mm
    const pageW = 210;
    const pageH = 297;
    const marginL = 18;
    const marginR = 18;
    const marginTop = 22;
    const marginBottom = 22;
    const usableW = pageW - marginL - marginR; // 174mm

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = marginTop;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('Bible Notes', marginL, y);
    y += 7;

    // Subtitle: translation + date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${translation} · ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} · ${orderedSelected.length} note${orderedSelected.length !== 1 ? 's' : ''}`,
      marginL,
      y,
    );
    y += 5;

    // Header separator
    doc.setDrawColor(180, 140, 60);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);
    y += 7;

    doc.setLineWidth(0.2);

    for (const note of orderedSelected) {
      const ref = verseRef(note);

      // Look up verse text from bundled bible data
      let verseText = '';
      try {
        const verses = getChapterText(translation, note.book, note.chapter);
        verseText = verses[note.verse - 1] ?? '';
      } catch {
        // Translation may not have this book — leave empty
      }

      // Pre-compute wrapped lines to estimate block height
      doc.setFontSize(9);
      const verseWrapped = verseText
        ? doc.splitTextToSize(`\u201c${verseText}\u201d`, usableW)
        : [];
      doc.setFontSize(10);
      const noteWrapped = doc.splitTextToSize(note.text, usableW);

      // ref=5.5, verse lines * 4.2, gap=2, note lines * 4.8, divider+gap=8
      const blockH =
        5.5 +
        (verseWrapped.length > 0 ? verseWrapped.length * 4.2 + 3 : 0) +
        noteWrapped.length * 4.8 +
        8;

      if (y + blockH > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }

      // ── Verse reference ──────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(160, 100, 20); // amber-brown
      doc.text(ref, marginL, y);
      y += 5.5;

      // ── Verse text (italic, muted) ───────────────────
      if (verseWrapped.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(verseWrapped, marginL, y);
        y += verseWrapped.length * 4.2 + 3;
      }

      // ── Note text (regular, dark) ────────────────────
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(noteWrapped, marginL, y);
      y += noteWrapped.length * 4.8 + 4;

      // Light divider between entries
      doc.setDrawColor(210, 210, 210);
      doc.line(marginL, y, pageW - marginR, y);
      y += 4;
    }

    doc.save('bible-notes.pdf');
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === 'asc' ? <ChevronUp size={11} className="inline ml-0.5" /> : <ChevronDown size={11} className="inline ml-0.5" />
    ) : (
      <ArrowUpDown size={11} className="inline ml-0.5 opacity-40" />
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileDown size={16} className="text-amber-500" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Export Notes to PDF</span>
            <span className="text-xs text-gray-400 ml-1">({selected.size} selected)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['select', 'order'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-xs font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'select' ? '1. Select Notes' : '2. Set Order'}
            </button>
          ))}
        </div>

        {/* SELECT TAB */}
        {tab === 'select' && (
          <>
            {/* Search + sort bar */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by reference or text…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-1">Sort:</span>
                {(['location', 'updated', 'created'] as SortField[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleSort(f)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      sortField === f
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {f === 'location' ? 'Location' : f === 'updated' ? 'Last Edited' : 'Date Added'}
                    <SortIcon field={f} />
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={selectAll} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">All</button>
                <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
                <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">None</button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {displayNotes.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center text-gray-400">No notes match your search.</p>
              ) : (
                <ul>
                  {displayNotes.map((note) => (
                    <li
                      key={note.id}
                      className="flex items-start gap-2 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                      onClick={() => toggleNote(note.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(note.id)}
                        onChange={() => toggleNote(note.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 accent-amber-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {verseRef(note)}
                        </span>
                        <span className="block text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {note.text.length > 80 ? note.text.slice(0, 77) + '…' : note.text}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ORDER TAB */}
        {tab === 'order' && (
          <div className="flex-1 overflow-y-auto">
            {orderedSelected.length === 0 ? (
              <p className="px-4 py-6 text-xs text-center text-gray-400">No notes selected. Go back and select some.</p>
            ) : (
              <ul>
                {orderedSelected.map((note, idx) => (
                  <li
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragEnter={() => handleDragEnter(note.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, note.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-4 py-2.5 transition-colors select-none border-t-2 ${
                      dragOver === note.id
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${dragId === note.id ? 'opacity-40' : ''}`}
                  >
                    <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0 cursor-grab" />
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {verseRef(note)}
                      </span>
                      <span className="block text-xs text-gray-400 truncate mt-0.5">
                        {note.text.length > 70 ? note.text.slice(0, 67) + '…' : note.text}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveUp(note.id)}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveDown(note.id)}
                        disabled={idx === orderedSelected.length - 1}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            <FileDown size={13} />
            Export {selected.size > 0 ? `${selected.size} note${selected.size > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
