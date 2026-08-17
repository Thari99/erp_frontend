'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

interface ActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const MENU_WIDTH = 128; // matches w-32

/**
 * Renders its menu into document.body via a portal, positioned by the trigger button's
 * own screen coordinates — this is what actually fixes "dropdown gets clipped/needs
 * scrolling inside a table." An absolutely-positioned menu is at the mercy of every
 * ancestor's overflow/scroll setting; a portal isn't inside any of those ancestors at all.
 */
export function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: Math.max(8, rect.right - MENU_WIDTH) });
    }
    setIsOpen((prev) => !prev);
  }

  useEffect(() => {
    if (!isOpen) return;

    // Checks containment first — otherwise a mousedown on a menu item closes the menu
    // (and unmounts it) before the item's own click handler gets a chance to fire.
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    function handleScroll() {
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
      >
        Actions <MoreVertical size={12} />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className="z-50 rounded border border-slate-700 bg-slate-800 py-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                disabled={item.disabled}
                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-600 ${
                  item.danger ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
