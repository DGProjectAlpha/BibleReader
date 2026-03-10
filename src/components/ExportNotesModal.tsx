import { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, FileDown, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { registerUnicodeFonts } from '../fonts/registerFonts';
import { useBibleStore, Note } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';
import { getChapterText } from '../data/bibleLoader';
import { mkdir, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import { documentDir, join } from '@tauri-apps/api/path';

interface ExportNotesModalProps {
  onClose: () => void;
  /** When true, renders as a full-screen panel (no backdrop overlay) for use in pop-out windows */
  standalone?: boolean;
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

export function ExportNotesModal({ onClose, standalone = false }: ExportNotesModalProps) {
  const { t } = useTranslation();
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
  const [tab, setTab] = useState<'select' | 'order' | 'versions'>('select');

  // Available translations: built-ins + custom imports
  const customTranslations = useBibleStore((s) => s.customTranslations);
  const BUILTIN_TRANSLATIONS = ['KJV', 'ASV'];
  const allTranslationAbbrs = useMemo(() => {
    const customs = customTranslations.map((t) => t.abbreviation);
    return [...BUILTIN_TRANSLATIONS, ...customs.filter((a) => !BUILTIN_TRANSLATIONS.includes(a))];
  }, [customTranslations]);

  // Selected versions for export — default to the active pane's translation
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(() => new Set([translation]));

  function toggleVersion(abbr: string) {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(abbr)) {
        if (next.size > 1) next.delete(abbr); // keep at least one
      } else {
        next.add(abbr);
      }
      return next;
    });
  }

  function selectAllVersions() {
    setSelectedVersions(new Set(allTranslationAbbrs));
  }

  function selectNoVersions() {
    // Keep at least one — the active pane translation
    setSelectedVersions(new Set([translation]));
  }

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
    // Required by browsers (esp. Chrome/Edge on Windows) — without setData the
    // drag is not considered "valid" and dropEffect reverts to 'none' (shows Ø).
    e.dataTransfer.setData('text/plain', id);
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

  const [exportStatus, setExportStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    // A4 dimensions in mm
    const pageW = 210;
    const pageH = 297;
    const marginL = 18;
    const marginR = 18;
    const marginTop = 22;
    const marginBottom = 22;
    const usableW = pageW - marginL - marginR; // 174mm

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await registerUnicodeFonts(doc);
    let y = marginTop;

    // Title
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('Bible Notes', marginL, y);
    y += 7;

    // Subtitle: versions + date
    const versionsLabel = Array.from(selectedVersions).join(', ');
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${versionsLabel} · ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} · ${orderedSelected.length} note${orderedSelected.length !== 1 ? 's' : ''}`,
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

    const versionsArr = Array.from(selectedVersions);

    for (const note of orderedSelected) {
      const ref = verseRef(note);

      // Look up verse text for each selected version
      const verseLines: { abbr: string; wrapped: string[] }[] = [];
      for (const ver of versionsArr) {
        let verseText = '';
        try {
          const verses = getChapterText(ver, note.book, note.chapter);
          verseText = verses[note.verse - 1] ?? '';
        } catch {
          // Translation may not have this book — skip
        }
        if (verseText) {
          doc.setFontSize(9);
          const wrapped = doc.splitTextToSize(`\u201c${verseText}\u201d`, usableW);
          verseLines.push({ abbr: ver, wrapped });
        }
      }

      doc.setFontSize(10);
      const noteWrapped = doc.splitTextToSize(note.text, usableW);

      // Estimate block height: ref + each version (label + lines) + note + divider
      let verseBlockH = 0;
      for (const vl of verseLines) {
        verseBlockH += 4 + vl.wrapped.length * 4.2 + 2; // label + lines + gap
      }
      const blockH = 5.5 + verseBlockH + noteWrapped.length * 4.8 + 8;

      if (y + blockH > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }

      // ── Verse reference ──────────────────────────────
      doc.setFont('DejaVuSans', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(160, 100, 20); // amber-brown
      doc.text(ref, marginL, y);
      y += 5.5;

      // ── Verse text per version (italic, muted) ───────
      for (const vl of verseLines) {
        // Version label
        doc.setFont('DejaVuSans', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`[${vl.abbr}]`, marginL, y);
        y += 3.5;

        // Verse text
        doc.setFont('DejaVuSans', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(vl.wrapped, marginL, y);
        y += vl.wrapped.length * 4.2 + 2;
      }

      if (verseLines.length > 0) y += 1; // extra gap before note

      // ── Note text (regular, dark) ────────────────────
      doc.setFont('DejaVuSans', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(noteWrapped, marginL, y);
      y += noteWrapped.length * 4.8 + 4;

      // Light divider between entries
      doc.setDrawColor(210, 210, 210);
      doc.line(marginL, y, pageW - marginR, y);
      y += 4;
    }

    // Build a safe filename with timestamp
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `bible-notes-${dateStamp}.pdf`;
    const subDir = 'Bible Reader PDF';

    setExportStatus('saving');
    setExportError(null);
    try {
      // Ensure the Documents/Bible Reader PDF/ folder exists
      await mkdir(subDir, { baseDir: BaseDirectory.Document, recursive: true });

      // Write the PDF bytes
      const arrayBuf = doc.output('arraybuffer');
      const bytes = new Uint8Array(arrayBuf);
      await writeFile(`${subDir}/${fileName}`, bytes, { baseDir: BaseDirectory.Document });

      // Open with the system default PDF viewer
      // Build absolute path: C:\Users\<user>\Documents\Bible Reader PDF\<filename>
      const docDir = await documentDir();
      const fullPath = await join(docDir, subDir, fileName);
      try {
        await openPath(fullPath);
      } catch (openErr) {
        console.warn('[ExportNotesModal] Could not auto-open PDF:', openErr);
        // Non-fatal — file was saved successfully, just couldn't open it
      }

      setExportStatus('done');
    } catch (err) {
      console.error('[ExportNotesModal] PDF save failed:', err);
      setExportError(err instanceof Error ? err.message : String(err));
      setExportStatus('error');
    }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === 'asc' ? <ChevronUp size={11} className="inline ml-0.5" /> : <ChevronDown size={11} className="inline ml-0.5" />
    ) : (
      <ArrowUpDown size={11} className="inline ml-0.5 opacity-40" />
    );

  const panelCls = standalone
    ? 'flex flex-col h-full w-full bg-white dark:bg-gray-900 overflow-hidden'
    : 'bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col overflow-hidden';

  const wrapperCls = standalone
    ? ''
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';

  return (
    <div className={wrapperCls}>
      <div className={panelCls}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileDown size={16} className="text-amber-500" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('exportTitle')}</span>
            <span className="text-xs text-gray-400 ml-1">({selected.size} selected)</span>
          </div>
          <Tooltip label={t('closeExportTooltip')}>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['select', 'order', 'versions'] as const).map((tb) => {
            const labelKey = tb === 'select' ? 'exportTabSelect' as const : tb === 'order' ? 'exportTabOrder' as const : 'exportTabVersions' as const;
            return (
              <Tooltip label={t(labelKey)} key={tb} position="bottom">
                <button
                  onClick={() => setTab(tb)}
                  className={`px-5 py-2 text-xs font-medium transition-colors ${
                    tab === tb
                      ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t(labelKey)}
                </button>
              </Tooltip>
            );
          })}
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
                  placeholder={t('searchNotesPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-1">{t('sortLabel')}</span>
                {(['location', 'updated', 'created'] as SortField[]).map((f) => {
                  const labelKey = f === 'location' ? 'sortByLocation' as const : f === 'updated' ? 'sortByLastEdited' as const : 'sortByDateAdded' as const;
                  return (
                    <Tooltip label={t(labelKey)} key={f}>
                      <button
                        onClick={() => toggleSort(f)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          sortField === f
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {t(labelKey)}
                        <SortIcon field={f} />
                      </button>
                    </Tooltip>
                  );
                })}
                <div className="flex-1" />
                <Tooltip label={t('selectAllTooltip')}>
                  <button onClick={selectAll} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">{t('selectAllTooltip')}</button>
                </Tooltip>
                <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
                <Tooltip label={t('selectNoneTooltip')}>
                  <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">{t('selectNoneTooltip')}</button>
                </Tooltip>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {displayNotes.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center text-gray-400">{t('noNotesMatch')}</p>
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
              <p className="px-4 py-6 text-xs text-center text-gray-400">{t('noNotesSelected')}</p>
            ) : (
              <ul>
                {orderedSelected.map((note, idx) => (
                  <li
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragEnter={() => handleDragEnter(note.id)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
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
                      <Tooltip label={t('moveUpTooltip')}>
                        <button
                          onClick={() => moveUp(note.id)}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20"
                        >
                          <ChevronUp size={12} />
                        </button>
                      </Tooltip>
                      <Tooltip label={t('moveDownTooltip')}>
                        <button
                          onClick={() => moveDown(note.id)}
                          disabled={idx === orderedSelected.length - 1}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-20"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* VERSIONS TAB */}
        {tab === 'versions' && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('versionsDescription')}
              </p>
              <div className="flex items-center gap-2">
                <Tooltip label={t('selectAllVersionsTooltip')}>
                  <button onClick={selectAllVersions} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">{t('selectAllTooltip')}</button>
                </Tooltip>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <Tooltip label={t('resetVersionsTooltip')}>
                  <button onClick={selectNoVersions} className="text-xs text-gray-400 hover:underline">{t('resetVersionsTooltip')}</button>
                </Tooltip>
                <span className="flex-1" />
                <span className="text-xs text-gray-400">{selectedVersions.size} selected</span>
              </div>
            </div>
            <ul>
              {allTranslationAbbrs.map((abbr) => {
                const meta = customTranslations.find((ct) => ct.abbreviation === abbr);
                const isBuiltIn = BUILTIN_TRANSLATIONS.includes(abbr);
                return (
                  <li
                    key={abbr}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                    onClick={() => toggleVersion(abbr)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVersions.has(abbr)}
                      onChange={() => toggleVersion(abbr)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-amber-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{abbr}</span>
                      {meta && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{meta.fullName}</span>
                      )}
                      {isBuiltIn && !meta && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {abbr === 'KJV' ? 'King James Version' : abbr === 'ASV' ? 'American Standard Version' : ''}
                        </span>
                      )}
                    </div>
                    {isBuiltIn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">built-in</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {exportError && (
            <span className="text-xs text-red-500 flex-1 truncate" title={exportError}>
              Error: {exportError}
            </span>
          )}
          {exportStatus === 'done' && (
            <span className="text-xs text-green-600 dark:text-green-400 flex-1">
              {t('savedToDocuments')}
            </span>
          )}
          <Tooltip label={t('closeExportTooltip')}>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {exportStatus === 'done' ? t('closeButton') : t('cancelButton')}
            </button>
          </Tooltip>
          <Tooltip label={t('exportPdfTooltip')}>
            <button
              onClick={() => void handleExport()}
              disabled={selected.size === 0 || exportStatus === 'saving'}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <FileDown size={13} />
              {exportStatus === 'saving'
                ? t('loading')
                : t('exportCountLabel', { noteCount: selected.size, versionCount: selectedVersions.size })}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
