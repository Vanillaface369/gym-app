import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconTrash } from './icons';

const DELETE_AT = 0.4; // swipe this fraction of the row's width to delete
const START = 10;      // px before we decide it's a horizontal swipe

/**
 * Row that deletes when swiped left far enough. Vertical scrolling still works (touch-action: pan-y),
 * and a swipe never counts as a tap on links or buttons inside the row.
 */
export function SwipeToDelete({ onDelete, children, label = 'Remove', className = '', as: Tag = 'div' }: {
  onDelete: () => void; children: ReactNode; label?: string; className?: string; as?: 'div' | 'li';
}) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const swiped = useRef(false);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [animate, setAnimate] = useState(false);
  const width = () => row.current?.offsetWidth ?? 360;
  const fired = useRef(false);
  const remove = () => { if (!fired.current) { fired.current = true; onDelete(); } };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.horizontal) return;
    setAnimate(true);
    if (-dx > width() * DELETE_AT) {
      setLeaving(true); setDx(-width());
      setTimeout(remove, 600); // in case the collapse transition never ends (e.g. animations turned off)
    }
    else setDx(0);
  };

  return (
    <Tag
      className={`relative overflow-hidden transition-[max-height,opacity] duration-200 ${className}`}
      style={leaving ? { maxHeight: 0, opacity: 0, transitionDelay: '150ms' } : { maxHeight: 200 }}
      onTransitionEnd={(e) => { if (leaving && e.propertyName === 'max-height') remove(); }}
    >
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-end gap-2 bg-danger pr-5 font-semibold text-white"
        style={{ opacity: dx < 0 ? 1 : 0 }}>
        <IconTrash size={20} />{label}
      </div>
      <div
        ref={row}
        className={`relative bg-bg ${animate ? 'transition-transform duration-200' : ''}`}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
          swiped.current = false;
          setAnimate(false);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const mx = e.clientX - d.x, my = e.clientY - d.y;
          if (d.horizontal === null) {
            if (Math.abs(mx) < START && Math.abs(my) < START) return;
            d.horizontal = Math.abs(mx) > Math.abs(my);
            if (!d.horizontal) { drag.current = null; return; }
            swiped.current = true;
            row.current?.setPointerCapture(e.pointerId);
          }
          setDx(Math.min(0, mx));
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onTransitionEnd={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()} // links inside would otherwise start a native drag
        onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
      >
        {children}
      </div>
    </Tag>
  );
}

/** "Removed … Undo" bar shown for a few seconds after a swipe delete. */
/** `bottom` is a Tailwind class that keeps the bar above the screen's own bottom buttons. */
export function useUndo(bottom = 'bottom-28') {
  const [undo, setUndo] = useState<{ text: string; run: () => void; n: number } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  const show = (text: string, run: () => void) => setUndo({ text, run, n: Date.now() });
  const bar = undo && (
    <div role="status" className={`pointer-events-none fixed inset-x-0 ${bottom} z-40 mx-auto max-w-lg px-4`}>
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-surface-2 p-3 pl-4 shadow-xl shadow-black/50 ring-1 ring-line">
        <p className="min-w-0 flex-1 truncate text-sm">{undo.text}</p>
        <button onClick={() => { undo.run(); setUndo(null); }} className="rounded-lg px-3 py-1.5 text-sm font-bold text-accent">Undo</button>
      </div>
    </div>
  );
  return { show, bar };
}
