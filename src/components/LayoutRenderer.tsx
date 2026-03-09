import { useRef, useCallback, useState } from 'react';
import { VerseDisplay } from './VerseDisplay';
import { useBibleStore } from '../store/bibleStore';
import type { LayoutNode, LayoutSplit } from '../store/bibleStore';

interface Props {
  node: LayoutNode;
  /** Depth in the tree — used to guard against runaway recursion */
  depth?: number;
}

/**
 * Recursively renders a LayoutNode tree.
 * - LayoutLeaf   → renders a single VerseDisplay pane
 * - LayoutSplit  → renders a flex row or column container with resize handles between children
 */
export function LayoutRenderer({ node, depth = 0 }: Props) {
  // Hooks must always be called unconditionally — depth guard placed after
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);
  const setActivePaneIndex = useBibleStore((s) => s.setActivePaneIndex);
  const removePane = useBibleStore((s) => s.removePane);
  const updateLayoutSizes = useBibleStore((s) => s.updateLayoutSizes);

  if (depth > 20) return null; // safety guard against runaway recursion

  if (node.type === 'leaf') {
    const paneIndex = panes.findIndex((p) => p.id === node.paneId);
    if (paneIndex === -1) return null;
    return (
      <VerseDisplay
        key={node.paneId}
        paneId={node.paneId}
        isActive={paneIndex === activePaneIndex}
        onActivate={() => setActivePaneIndex(paneIndex)}
        onRemove={() => removePane(node.paneId)}
        canRemove={panes.length > 1}
      />
    );
  }

  // It's a split node
  return (
    <SplitContainer
      node={node}
      depth={depth}
      updateLayoutSizes={updateLayoutSizes}
    />
  );
}

interface SplitContainerProps {
  node: LayoutSplit;
  depth: number;
  updateLayoutSizes: (splitId: string, sizes: number[]) => void;
}

function SplitContainer({ node, depth, updateLayoutSizes }: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = node.direction === 'horizontal';
  // Track which handle index is actively being dragged for visual feedback
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  const handleResizeStart = useCallback((handleIndex: number, e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    // Capture pointer so we keep receiving events even if cursor leaves the element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const containerSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
    const startSizes = [...node.sizes];

    setActiveHandle(handleIndex);

    // Prevent text selection and fix cursor globally during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = (isHorizontal ? moveEvent.clientX : moveEvent.clientY) - startPos;
      const deltaPercent = (delta / containerSize) * 100;

      const newSizes = [...startSizes];
      // handleIndex is the index of the divider — resizes child[handleIndex] and child[handleIndex+1]
      const leftIdx = handleIndex;
      const rightIdx = handleIndex + 1;
      const combined = newSizes[leftIdx] + newSizes[rightIdx];
      const minSize = 10; // minimum 10% per pane
      const newLeft = Math.max(minSize, Math.min(combined - minSize, newSizes[leftIdx] + deltaPercent));
      const newRight = combined - newLeft;
      newSizes[leftIdx] = newLeft;
      newSizes[rightIdx] = newRight;

      updateLayoutSizes(node.id, newSizes);
    };

    const onPointerUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setActiveHandle(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [node, isHorizontal, updateLayoutSizes]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-hidden ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      {node.children.map((child, i) => (
        <div
          key={child.type === 'leaf' ? child.paneId : child.id}
          className="relative overflow-hidden flex flex-col"
          style={{
            flexBasis: `${node.sizes[i] ?? 100 / node.children.length}%`,
            flexShrink: 0,
            flexGrow: 0,
          }}
        >
          <LayoutRenderer node={child} depth={depth + 1} />
          {/* Resize handle — placed after each child except the last */}
          {i < node.children.length - 1 && (
            <div
              className={`absolute z-20 group select-none ${
                isHorizontal
                  ? 'top-0 right-0 h-full cursor-col-resize'
                  : 'left-0 bottom-0 w-full cursor-row-resize'
              }`}
              style={isHorizontal
                ? { width: '9px', marginRight: '-4px' }
                : { height: '9px', marginBottom: '-4px' }
              }
              onPointerDown={(e) => handleResizeStart(i, e)}
            >
              {/* Thin visual line inside the hit area */}
              <div
                className={`absolute ${
                  isHorizontal
                    ? 'top-0 left-1/2 -translate-x-1/2 w-0.5 h-full'
                    : 'left-0 top-1/2 -translate-y-1/2 h-0.5 w-full'
                } ${
                  activeHandle === i
                    ? 'bg-blue-500'
                    : 'bg-black/10 dark:bg-white/10 group-hover:bg-blue-400/70 dark:group-hover:bg-blue-400/50'
                } transition-colors pointer-events-none`}
              />
              {/* Drag-grip dots in the center of the handle */}
              <div
                className={`absolute ${
                  isHorizontal
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5'
                    : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5'
                } pointer-events-none`}
              >
                {[0, 1, 2].map((dot) => (
                  <div
                    key={dot}
                    className={`rounded-full ${isHorizontal ? 'w-1 h-1' : 'w-1 h-1'} ${
                      activeHandle === i
                        ? 'bg-blue-400'
                        : 'bg-black/20 dark:bg-white/20 group-hover:bg-blue-400/80'
                    } transition-colors`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
