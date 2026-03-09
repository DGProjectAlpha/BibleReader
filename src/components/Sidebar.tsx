import { useState } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { BookmarkPanel } from './BookmarkPanel';
import { NotesPanel } from './NotesPanel';
import { ManageTranslationsPanel } from './ManageTranslationsPanel';
import { Bookmark, FileText, ChevronLeft, ChevronRight, Languages } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';

type SidebarTab = 'bookmarks' | 'notes' | 'translations';

interface SidebarProps {
  onOpenImport?: () => void;
}

export function Sidebar({ onOpenImport }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('bookmarks');
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();

  const bookmarkCount = useBibleStore((s) => s.bookmarks.length);
  const noteCount = useBibleStore((s) => s.notes.length);
  const translationCount = useBibleStore((s) => s.customTranslations.length);

  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'bookmarks',    icon: <Bookmark size={15} />,  label: t('tabBookmarks'),    badge: bookmarkCount },
    { id: 'notes',        icon: <FileText size={15} />,  label: t('tabNotes'),        badge: noteCount },
    { id: 'translations', icon: <Languages size={15} />, label: t('tabTranslations'), badge: translationCount },
  ];

  // Collapsed: show a narrow strip with vertical label + expand button
  if (collapsed) {
    return (
      <div className="flex flex-col h-full w-9 shrink-0 border-r border-black/[0.12] dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[1px_0_12px_rgba(0,0,0,0.3)] items-center py-2 gap-2">
        <Tooltip label={t('expandPanel')}>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
        <Tooltip label={t('expandPanel')}>
          <span
            className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 tracking-widest cursor-pointer select-none"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
            onClick={() => setCollapsed(false)}
          >
            {activeTab === 'bookmarks' ? t('sidebarCollapsedBookmarks') : activeTab === 'notes' ? t('sidebarCollapsedNotes') : t('sidebarCollapsedTranslations')}
          </span>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-64 shrink-0 border-r border-black/[0.12] dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[1px_0_12px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.10] dark:border-white/[0.10]">
        <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{t('appTitle')}</span>
        <div className="flex items-center gap-1">
          <SettingsPanel onOpenImport={onOpenImport} />
          <Tooltip label={t('collapsePanel')}>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label={t('collapsePanel')}
            >
              <ChevronLeft size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-black/[0.10] dark:border-white/[0.10] shrink-0">
        {tabs.map((tab) => (
          <Tooltip label={tab.label} position="bottom">
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
          >
            <span className="relative">
              {tab.icon}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center leading-none">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t" />
            )}
          </button>
          </Tooltip>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'bookmarks' && <BookmarkPanel fullHeight />}
        {activeTab === 'notes' && <NotesPanel fullHeight />}
        {activeTab === 'translations' && <ManageTranslationsPanel />}
      </div>
    </div>
  );
}
