// translations.ts — flat key-value UI string maps for all supported languages
// Dynamic values (verse refs, counts, filenames) use {placeholder} syntax — replace at call site

export type Language = 'en' | 'ru'

export type TranslationKey =
  // App / global
  | 'appTitle'
  | 'addPane'
  | 'ctrlFHint'
  // Sidebar
  | 'collapsePanel'
  | 'expandPanel'
  | 'tabBookmarks'
  | 'tabNotes'
  | 'tabTranslations'
  | 'sidebarCollapsedBookmarks'
  | 'sidebarCollapsedNotes'
  | 'sidebarCollapsedTranslations'
  // VerseDisplay / pane
  | 'builtIn'
  | 'imported'
  | 'syncPane'
  | 'unsyncPane'
  | 'synced'
  | 'sync'
  | 'splitRight'
  | 'splitDown'
  | 'popOut'
  | 'closePane'
  | 'loading'
  | 'selectBookChapter'
  | 'removeBookmark'
  | 'bookmarkVerse'
  | 'highlightVerse'
  | 'removeHighlight'
  | 'editNote'
  | 'addNote'
  | 'viewCrossRefs'
  | 'colorYellow'
  | 'colorGreen'
  | 'colorBlue'
  | 'colorPink'
  | 'colorPurple'
  // SearchBar
  | 'searchBibleTitle'
  | 'searchButton'
  | 'searchPlaceholder'
  | 'searchScope'
  | 'scopeWholeBible'
  | 'scopeOT'
  | 'scopeNT'
  | 'scopeBook'
  | 'scopeChapter'
  | 'searching'
  | 'noResults'
  // SearchResults
  | 'syncAllPanes'
  | 'openParallel'
  | 'closeButton'
  | 'dragToResize'
  | 'navigateTo'
  | 'activePaneArrow'
  // Result count — use {count} placeholder
  | 'resultCount'
  | 'resultCountMany'
  | 'forQuery'
  | 'clickToNavigate'
  // StrongsPanel
  | 'expandStrongs'
  | 'collapseStrongs'
  | 'strongsPanelHeader'
  | 'strongsCollapsedLabel'
  | 'backButton'
  | 'langHebrew'
  | 'langGreek'
  | 'sectionDefinition'
  | 'sectionDerivation'
  | 'sectionKjvUsage'
  | 'occurrenceCount'
  | 'badgeBestMatch'
  | 'sectionVersesUsingWord'
  | 'showingFirst300'
  | 'noVersesFound'
  | 'strongsEmptyHint'
  | 'strongsNoEntries'
  | 'strongsResultsFor'
  | 'sectionSimilar'
  | 'fullDetail'
  // TskPanel
  | 'expandCrossRefs'
  | 'collapseCrossRefs'
  | 'crossRefsHeader'
  | 'tskCollapsedLabel'
  | 'clearCrossRefs'
  | 'tskEmptyHint'
  | 'tskNoRefs'
  | 'tskRefHeader'
  // NotesPanel
  | 'notesEmpty'
  // BookmarkPanel
  | 'bookmarksEmpty'
  | 'removeBookmarkTitle'
  // NoteEditor
  | 'noteEditorHeader'
  | 'notePlaceholder'
  | 'deleteButton'
  | 'cancelButton'
  | 'saveButton'
  // FontControls
  | 'fontSizeStyle'
  | 'sectionSize'
  | 'sectionFont'
  | 'fontSans'
  | 'fontSerif'
  | 'fontMono'
  | 'resetDefaults'
  // Profiles
  | 'sectionProfile'
  | 'activeProfile'
  | 'defaultProfileName'
  | 'newProfileButton'
  | 'newProfileDialogTitle'
  | 'newProfilePlaceholder'
  | 'newProfileCreate'
  | 'newProfileCancel'
  | 'profileAlreadyExists'
  | 'deleteProfileButton'
  | 'deleteProfileConfirm'
  // SettingsModal
  | 'settingsTitle'
  | 'openSettings'
  | 'closeSettings'
  | 'sectionColorTheme'
  | 'themeCoolWhite'
  | 'themeWarmWhite'
  | 'themeCoolDark'
  | 'themeOled'
  | 'sectionBibleImport'
  | 'importBibleButton'
  | 'importBibleDesc'
  | 'sectionLanguage'
  // CrossRefPopover
  | 'openInPane'
  | 'verseNotFound'
  // ManageTranslationsPanel
  | 'removeTranslation'
  | 'noImportedTranslations'
  | 'useImportButton'
  | 'removingLabel'
  | 'deleteButton2'
  | 'confirmRemoveTranslation'
  // ImportModal
  | 'importModalHeader'
  | 'tabLocalFile'
  | 'tabApiBible'
  | 'localFileInstructions'
  | 'chooseFile'
  | 'loadingFile'
  | 'largeFileWarning'
  | 'moduleLoaded'
  | 'schemaValid'
  | 'validationFailed'
  | 'labelAbbreviation'
  | 'labelFullName'
  | 'labelLanguage'
  | 'apiBibleInstructions'
  | 'apiBibleKeyInstructions'
  | 'labelApiKey'
  | 'placeholderApiKey'
  | 'labelBibleId'
  | 'previewGenesis'
  | 'fetchingPreview'
  | 'connectionOk'
  | 'moreVerses'
  | 'sectionProgress'
  | 'progressStarting'
  | 'importTranslationButton'
  | 'importingButton'
  | 'importFullBibleButton'
  // NotesPanel
  | 'exportNotesToPdf'
  // StrongsPanel
  | 'clearStrongs'
  // Tooltips — generic
  | 'clearSearchTooltip'
  | 'closeSearchTooltip'
  | 'closeResultsTooltip'
  | 'closeNoteEditorTooltip'
  | 'backToResultsTooltip'
  | 'toggleVersesListTooltip'
  | 'viewFullDetailTooltip'
  | 'navigateToCrossRef'
  | 'moveUpTooltip'
  | 'moveDownTooltip'
  | 'selectAllTooltip'
  | 'selectNoneTooltip'
  | 'selectAllVersionsTooltip'
  | 'resetVersionsTooltip'
  | 'closeExportTooltip'
  | 'exportPdfTooltip'
  // ExportNotesModal tabs + sort
  | 'exportTitle'
  | 'exportTabSelect'
  | 'exportTabOrder'
  | 'exportTabVersions'
  | 'sortLabel'
  | 'sortByLocation'
  | 'sortByLastEdited'
  | 'sortByDateAdded'
  | 'searchNotesPlaceholder'
  | 'noNotesMatch'
  | 'noNotesSelected'
  | 'versionsDescription'
  | 'savedToDocuments'
  | 'exportCountLabel'

export type Translations = Record<TranslationKey, string>

const en: Translations = {
  // App / global
  appTitle: 'BibleReader',
  addPane: 'Add new reading pane',
  ctrlFHint: 'Ctrl+F',

  // Sidebar
  collapsePanel: 'Collapse panel',
  expandPanel: 'Expand panel',
  tabBookmarks: 'Bookmarks',
  tabNotes: 'Notes',
  tabTranslations: 'Translations',
  sidebarCollapsedBookmarks: 'BOOKMARKS',
  sidebarCollapsedNotes: 'NOTES',
  sidebarCollapsedTranslations: 'TRANSLATIONS',

  // VerseDisplay / pane
  builtIn: 'Built-in',
  imported: 'Imported',
  syncPane: 'Sync pane with others',
  unsyncPane: 'Unsync pane (currently synced)',
  synced: 'Synced',
  sync: 'Sync',
  splitRight: 'Split pane to the right',
  splitDown: 'Split pane downward',
  popOut: 'Open pane in separate window',
  closePane: 'Close this reading pane',
  loading: 'Loading...',
  selectBookChapter: 'Select a book and chapter above to start reading.',
  removeBookmark: 'Remove bookmark',
  bookmarkVerse: 'Bookmark verse',
  highlightVerse: 'Highlight verse',
  removeHighlight: 'Remove highlight',
  editNote: 'Edit note',
  addNote: 'Add note',
  viewCrossRefs: 'View cross-references for this verse',
  colorYellow: 'Yellow',
  colorGreen: 'Green',
  colorBlue: 'Blue',
  colorPink: 'Pink',
  colorPurple: 'Purple',

  // SearchBar
  searchBibleTitle: 'Search Bible (Ctrl+F)',
  searchButton: 'Run search',
  searchPlaceholder: 'Search the Bible...',
  searchScope: 'Scope:',
  scopeWholeBible: 'Whole Bible',
  scopeOT: 'Old Testament',
  scopeNT: 'New Testament',
  scopeBook: 'Book',
  scopeChapter: 'Chapter',
  searching: 'Searching...',
  noResults: 'No results found.',

  // SearchResults
  syncAllPanes: 'Sync all panes',
  openParallel: 'Open result in parallel pane',
  closeButton: 'Close',
  dragToResize: 'Drag to resize',
  navigateTo: 'Navigate →',
  activePaneArrow: 'Active pane →',
  resultCount: '{count} result(s)',
  resultCountMany: '500+ results',
  forQuery: 'for "{query}"',
  clickToNavigate: '— click any result to navigate',

  // StrongsPanel
  expandStrongs: "Expand Strong's panel",
  collapseStrongs: "Collapse Strong's panel",
  strongsPanelHeader: "Strong's",
  strongsCollapsedLabel: "Strong's",
  backButton: '← Back',
  langHebrew: 'Hebrew',
  langGreek: 'Greek',
  sectionDefinition: 'Definition',
  sectionDerivation: 'Derivation',
  sectionKjvUsage: 'KJV Usage',
  occurrenceCount: '{total} occurrence(s)',
  badgeBestMatch: 'Best match',
  sectionVersesUsingWord: 'Verses using this word',
  showingFirst300: 'Showing first 300 results',
  noVersesFound: 'No verses found (KJV only).',
  strongsEmptyHint: "Click any word in the text to look it up in the Strong's Exhaustive Concordance.",
  strongsNoEntries: 'No Strong\'s entries found for "{selection}".',
  strongsResultsFor: 'Results for "{word}"',
  sectionSimilar: 'Similar',
  fullDetail: 'Full detail →',

  // TskPanel
  expandCrossRefs: 'Expand cross-references panel',
  collapseCrossRefs: 'Collapse cross-references panel',
  crossRefsHeader: 'Cross-References',
  tskCollapsedLabel: 'TSK Refs',
  clearCrossRefs: 'Clear cross-references',
  tskEmptyHint: 'Click a verse number in the text to view TSK cross-references.',
  tskNoRefs: 'No cross-references found for {book} {chapter}:{verse}.',
  tskRefHeader: '{book} {chapter}:{verse} — {count} reference(s)',

  // NotesPanel
  notesEmpty: 'No notes yet. Click the note icon on any verse to add one.',

  // BookmarkPanel
  bookmarksEmpty: 'No bookmarks yet. Click the ribbon icon on any verse to add one.',
  removeBookmarkTitle: 'Remove bookmark',

  // NoteEditor
  noteEditorHeader: 'Note — {book} {chapter}:{verse}',
  notePlaceholder: 'Write your note here...',
  deleteButton: 'Delete this note',
  cancelButton: 'Cancel editing',
  saveButton: 'Save note',

  // FontControls
  fontSizeStyle: 'Font size & style',
  sectionSize: 'Size',
  sectionFont: 'Font',
  fontSans: 'Sans',
  fontSerif: 'Serif',
  fontMono: 'Mono',
  resetDefaults: 'Reset font settings to defaults',

  // Profiles
  sectionProfile: 'Profile',
  activeProfile: 'Active profile',
  defaultProfileName: 'Default',
  newProfileButton: 'New Profile',
  newProfileDialogTitle: 'Create New Profile',
  newProfilePlaceholder: 'Profile name',
  newProfileCreate: 'Create',
  newProfileCancel: 'Cancel',
  profileAlreadyExists: 'A profile with this name already exists',
  deleteProfileButton: 'Delete',
  deleteProfileConfirm: 'Delete profile "{name}" and all its bookmarks, highlights, and notes? This cannot be undone.',

  // SettingsModal
  settingsTitle: 'Settings',
  openSettings: 'Open settings',
  closeSettings: 'Close settings',
  sectionColorTheme: 'Color Theme',
  themeCoolWhite: 'Cool White',
  themeWarmWhite: 'Warm White',
  themeCoolDark: 'Cool Dark',
  themeOled: 'OLED',
  sectionBibleImport: 'Bible Import',
  importBibleButton: 'Import Bible Translation\u2026',
  importBibleDesc: 'Import a local .brbmod or JSON file, or fetch from api.bible.',
  sectionLanguage: 'Language',

  // CrossRefPopover
  openInPane: 'Open cross-reference in active pane',
  verseNotFound: 'Verse not found.',

  // ManageTranslationsPanel
  removeTranslation: 'Remove translation',
  noImportedTranslations: 'No imported translations.',
  useImportButton: 'Use the Import button above to add a translation.',
  removingLabel: 'Removing\u2026',
  deleteButton2: 'Confirm deletion',
  confirmRemoveTranslation: 'This will remove the translation from all panes. Continue?',

  // ImportModal
  importModalHeader: 'Import Bible Translation',
  tabLocalFile: 'Local File',
  tabApiBible: 'api.bible',
  localFileInstructions: 'Select a .brbmod module file, or a raw JSON Bible',
  chooseFile: 'Choose File\u2026',
  loadingFile: 'Loading\u2026',
  largeFileWarning: 'Large file — this may take a moment, the UI will respond shortly.',
  moduleLoaded: 'Module loaded — metadata auto-filled from module header. Edit below if needed.',
  schemaValid: 'Schema valid. Fill in the details below.',
  validationFailed: 'Validation failed — {count} error(s)',
  labelAbbreviation: 'Abbreviation',
  labelFullName: 'Full Name',
  labelLanguage: 'Language',
  apiBibleInstructions: 'Fetch a translation directly from api.bible.',
  apiBibleKeyInstructions: "You'll need a free API key and a Bible ID from their catalogue.",
  labelApiKey: 'API Key',
  placeholderApiKey: 'Paste your api.bible key here',
  labelBibleId: 'Bible ID',
  previewGenesis: 'Preview Genesis 1',
  fetchingPreview: 'Fetching preview\u2026',
  connectionOk: 'Connection OK — Genesis 1 preview (first 5 verses):',
  moreVerses: '\u2026{count} more verses',
  sectionProgress: 'Progress',
  progressStarting: 'Starting\u2026',
  importTranslationButton: 'Import Translation',
  importingButton: 'Importing\u2026',
  importFullBibleButton: 'Import Full Bible',
  // NotesPanel
  exportNotesToPdf: 'Export notes to PDF',
  // StrongsPanel
  clearStrongs: "Clear Strong's results",
  // Tooltips — generic
  clearSearchTooltip: 'Clear search text',
  closeSearchTooltip: 'Close search bar',
  closeResultsTooltip: 'Close search results',
  closeNoteEditorTooltip: 'Close without saving',
  backToResultsTooltip: 'Back to results list',
  toggleVersesListTooltip: 'Show/hide verses containing this word',
  viewFullDetailTooltip: 'View full definition',
  navigateToCrossRef: 'Navigate to this cross-reference',
  moveUpTooltip: 'Move note up in order',
  moveDownTooltip: 'Move note down in order',
  selectAllTooltip: 'Select all notes',
  selectNoneTooltip: 'Deselect all notes',
  selectAllVersionsTooltip: 'Include all versions',
  resetVersionsTooltip: 'Reset to active translation only',
  closeExportTooltip: 'Close export dialog',
  exportPdfTooltip: 'Generate and save PDF to Documents',
  // ExportNotesModal tabs + sort
  exportTitle: 'Export Notes to PDF',
  exportTabSelect: '1. Select Notes',
  exportTabOrder: '2. Set Order',
  exportTabVersions: '3. Select Versions',
  sortLabel: 'Sort:',
  sortByLocation: 'Location',
  sortByLastEdited: 'Last Edited',
  sortByDateAdded: 'Date Added',
  searchNotesPlaceholder: 'Search by reference or text…',
  noNotesMatch: 'No notes match your search.',
  noNotesSelected: 'No notes selected. Go back and select some.',
  versionsDescription: 'Choose which Bible versions to include alongside each note. The verse text will be printed for every selected version.',
  savedToDocuments: 'Saved to Documents\\Bible Reader PDF\\',
  exportCountLabel: 'Export {noteCount} note(s) · {versionCount} version(s)',
}

const ru: Translations = {
  // App / global
  appTitle: 'BibleReader',
  addPane: 'Добавить панель чтения',
  ctrlFHint: 'Ctrl+F',

  // Sidebar
  collapsePanel: 'Свернуть панель',
  expandPanel: 'Развернуть панель',
  tabBookmarks: 'Закладки',
  tabNotes: 'Заметки',
  tabTranslations: 'Переводы',
  sidebarCollapsedBookmarks: 'ЗАКЛАДКИ',
  sidebarCollapsedNotes: 'ЗАМЕТКИ',
  sidebarCollapsedTranslations: 'ПЕРЕВОДЫ',

  // VerseDisplay / pane
  builtIn: 'Встроенные',
  imported: 'Импортированные',
  syncPane: 'Синхронизировать панель',
  unsyncPane: 'Отключить синхронизацию',
  synced: 'Синхр.',
  sync: 'Синхр.',
  splitRight: 'Разделить панель вправо',
  splitDown: 'Разделить панель вниз',
  popOut: 'Открыть панель в отдельном окне',
  closePane: 'Закрыть эту панель',
  loading: 'Загрузка...',
  selectBookChapter: 'Выберите книгу и главу, чтобы начать чтение.',
  removeBookmark: 'Удалить закладку',
  bookmarkVerse: 'Добавить закладку',
  highlightVerse: 'Выделить стих',
  removeHighlight: 'Убрать выделение',
  editNote: 'Редактировать заметку',
  addNote: 'Добавить заметку',
  viewCrossRefs: 'Показать перекрёстные ссылки для этого стиха',
  colorYellow: 'Жёлтый',
  colorGreen: 'Зелёный',
  colorBlue: 'Синий',
  colorPink: 'Розовый',
  colorPurple: 'Фиолетовый',

  // SearchBar
  searchBibleTitle: 'Поиск по Библии (Ctrl+F)',
  searchButton: 'Выполнить поиск',
  searchPlaceholder: 'Поиск по Библии...',
  searchScope: 'Область:',
  scopeWholeBible: 'Вся Библия',
  scopeOT: 'Ветхий Завет',
  scopeNT: 'Новый Завет',
  scopeBook: 'Книга',
  scopeChapter: 'Глава',
  searching: 'Поиск...',
  noResults: 'Ничего не найдено.',

  // SearchResults
  syncAllPanes: 'Синхронизировать все панели',
  openParallel: 'Открыть результат в параллельной панели',
  closeButton: 'Закрыть',
  dragToResize: 'Потяните для изменения размера',
  navigateTo: 'Перейти →',
  activePaneArrow: 'Активная панель →',
  resultCount: '{count} результат(ов)',
  resultCountMany: '500+ результатов',
  forQuery: 'по запросу «{query}»',
  clickToNavigate: '— нажмите на результат для перехода',

  // StrongsPanel
  expandStrongs: 'Развернуть панель Стронга',
  collapseStrongs: 'Свернуть панель Стронга',
  strongsPanelHeader: 'Стронг',
  strongsCollapsedLabel: 'Стронг',
  backButton: '← Назад',
  langHebrew: 'Иврит',
  langGreek: 'Греческий',
  sectionDefinition: 'Определение',
  sectionDerivation: 'Происхождение',
  sectionKjvUsage: 'Употребление в KJV',
  occurrenceCount: '{total} употреблений',
  badgeBestMatch: 'Лучшее совпадение',
  sectionVersesUsingWord: 'Стихи с этим словом',
  showingFirst300: 'Первые 300 результатов',
  noVersesFound: 'Стихи не найдены (только KJV).',
  strongsEmptyHint: 'Нажмите на любое слово в тексте, чтобы найти его в симфонии Стронга.',
  strongsNoEntries: 'Записи Стронга для «{selection}» не найдены.',
  strongsResultsFor: 'Результаты для «{word}»',
  sectionSimilar: 'Похожие',
  fullDetail: 'Подробнее →',

  // TskPanel
  expandCrossRefs: 'Развернуть панель перекрёстных ссылок',
  collapseCrossRefs: 'Свернуть панель перекрёстных ссылок',
  crossRefsHeader: 'Перекрёстные ссылки',
  tskCollapsedLabel: 'ПСС',
  clearCrossRefs: 'Очистить перекрёстные ссылки',
  tskEmptyHint: 'Нажмите на номер стиха, чтобы увидеть перекрёстные ссылки TSK.',
  tskNoRefs: 'Перекрёстные ссылки для {book} {chapter}:{verse} не найдены.',
  tskRefHeader: '{book} {chapter}:{verse} — {count} ссылок',

  // NotesPanel
  notesEmpty: 'Заметок пока нет. Нажмите на значок заметки у любого стиха.',

  // BookmarkPanel
  bookmarksEmpty: 'Закладок пока нет. Нажмите на значок закладки у любого стиха.',
  removeBookmarkTitle: 'Удалить закладку',

  // NoteEditor
  noteEditorHeader: 'Заметка — {book} {chapter}:{verse}',
  notePlaceholder: 'Введите заметку здесь...',
  deleteButton: 'Удалить заметку',
  cancelButton: 'Отменить редактирование',
  saveButton: 'Сохранить заметку',

  // FontControls
  fontSizeStyle: 'Размер и стиль шрифта',
  sectionSize: 'Размер',
  sectionFont: 'Шрифт',
  fontSans: 'Без засечек',
  fontSerif: 'С засечками',
  fontMono: 'Моноширинный',
  resetDefaults: 'Сбросить настройки шрифта',

  // Profiles
  sectionProfile: 'Профиль',
  activeProfile: 'Активный профиль',
  defaultProfileName: 'По умолчанию',
  newProfileButton: 'Новый профиль',
  newProfileDialogTitle: 'Создать новый профиль',
  newProfilePlaceholder: 'Имя профиля',
  newProfileCreate: 'Создать',
  newProfileCancel: 'Отмена',
  profileAlreadyExists: 'Профиль с таким именем уже существует',
  deleteProfileButton: 'Удалить',
  deleteProfileConfirm: 'Удалить профиль "{name}" со всеми закладками, выделениями и заметками? Это нельзя отменить.',

  // SettingsModal
  settingsTitle: 'Настройки',
  openSettings: 'Открыть настройки',
  closeSettings: 'Закрыть настройки',
  sectionColorTheme: 'Цветовая тема',
  themeCoolWhite: 'Холодный белый',
  themeWarmWhite: 'Тёплый белый',
  themeCoolDark: 'Холодный тёмный',
  themeOled: 'OLED',
  sectionBibleImport: 'Импорт Библии',
  importBibleButton: 'Импортировать перевод\u2026',
  importBibleDesc: 'Импортируйте файл .brbmod или JSON, либо загрузите с api.bible.',
  sectionLanguage: 'Язык',

  // CrossRefPopover
  openInPane: 'Открыть ссылку в активной панели',
  verseNotFound: 'Стих не найден.',

  // ManageTranslationsPanel
  removeTranslation: 'Удалить перевод',
  noImportedTranslations: 'Нет импортированных переводов.',
  useImportButton: 'Используйте кнопку «Импортировать» выше, чтобы добавить перевод.',
  removingLabel: 'Удаление\u2026',
  deleteButton2: 'Подтвердить удаление',
  confirmRemoveTranslation: 'Перевод будет удалён из всех панелей. Продолжить?',

  // ImportModal
  importModalHeader: 'Импорт перевода Библии',
  tabLocalFile: 'Локальный файл',
  tabApiBible: 'api.bible',
  localFileInstructions: 'Выберите файл .brbmod или JSON-файл Библии',
  chooseFile: 'Выбрать файл\u2026',
  loadingFile: 'Загрузка\u2026',
  largeFileWarning: 'Большой файл — это может занять некоторое время.',
  moduleLoaded: 'Модуль загружен — метаданные заполнены автоматически. При необходимости отредактируйте.',
  schemaValid: 'Схема корректна. Заполните поля ниже.',
  validationFailed: 'Ошибка валидации — {count} ошибок',
  labelAbbreviation: 'Аббревиатура',
  labelFullName: 'Полное название',
  labelLanguage: 'Язык',
  apiBibleInstructions: 'Загрузить перевод напрямую с api.bible.',
  apiBibleKeyInstructions: 'Вам потребуется бесплатный API-ключ и ID Библии из их каталога.',
  labelApiKey: 'API-ключ',
  placeholderApiKey: 'Вставьте ключ api.bible сюда',
  labelBibleId: 'ID Библии',
  previewGenesis: 'Просмотр Бытие 1',
  fetchingPreview: 'Загрузка превью\u2026',
  connectionOk: 'Соединение установлено — Бытие 1 (первые 5 стихов):',
  moreVerses: '\u2026ещё {count} стихов',
  sectionProgress: 'Прогресс',
  progressStarting: 'Начало\u2026',
  importTranslationButton: 'Импортировать перевод',
  importingButton: 'Импортирование\u2026',
  importFullBibleButton: 'Импортировать всю Библию',
  // NotesPanel
  exportNotesToPdf: 'Экспорт заметок в PDF',
  // StrongsPanel
  clearStrongs: 'Очистить результаты Стронга',
  // Tooltips — generic
  clearSearchTooltip: 'Очистить поиск',
  closeSearchTooltip: 'Закрыть панель поиска',
  closeResultsTooltip: 'Закрыть результаты поиска',
  closeNoteEditorTooltip: 'Закрыть без сохранения',
  backToResultsTooltip: 'Назад к результатам',
  toggleVersesListTooltip: 'Показать/скрыть стихи с этим словом',
  viewFullDetailTooltip: 'Подробное определение',
  navigateToCrossRef: 'Перейти к перекрёстной ссылке',
  moveUpTooltip: 'Переместить заметку вверх',
  moveDownTooltip: 'Переместить заметку вниз',
  selectAllTooltip: 'Выбрать все заметки',
  selectNoneTooltip: 'Снять выделение со всех заметок',
  selectAllVersionsTooltip: 'Включить все переводы',
  resetVersionsTooltip: 'Сбросить к активному переводу',
  closeExportTooltip: 'Закрыть экспорт',
  exportPdfTooltip: 'Создать и сохранить PDF в Документы',
  // ExportNotesModal tabs + sort
  exportTitle: 'Экспорт заметок в PDF',
  exportTabSelect: '1. Выбрать заметки',
  exportTabOrder: '2. Задать порядок',
  exportTabVersions: '3. Выбрать переводы',
  sortLabel: 'Сортировка:',
  sortByLocation: 'По расположению',
  sortByLastEdited: 'По редактированию',
  sortByDateAdded: 'По добавлению',
  searchNotesPlaceholder: 'Поиск по ссылке или тексту…',
  noNotesMatch: 'Заметки не найдены.',
  noNotesSelected: 'Заметки не выбраны. Вернитесь и выберите.',
  versionsDescription: 'Выберите, какие переводы Библии включить рядом с каждой заметкой. Текст стиха будет напечатан для каждого выбранного перевода.',
  savedToDocuments: 'Сохранено в Документы\\Bible Reader PDF\\',
  exportCountLabel: 'Экспорт {noteCount} заметок · {versionCount} переводов',
}

export const translations: Record<Language, Translations> = { en, ru }

/**
 * Returns the translation map for the given language.
 * Falls back to English if the language is not found.
 */
export function getTranslations(lang: Language): Translations {
  return translations[lang] ?? translations.en
}
