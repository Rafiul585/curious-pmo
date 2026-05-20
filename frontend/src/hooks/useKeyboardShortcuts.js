import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
const isInputFocused = () => {
    const el = document.activeElement;
    if (!el)
        return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
};
/**
 * Global keyboard shortcuts (only fires when focus is not inside an input/textarea).
 *
 * Ctrl+K   → command palette
 * N        → new task modal
 * G D      → Dashboard
 * G P      → Projects
 * G K      → Kanban
 * G G      → Gantt
 */
export const useKeyboardShortcuts = ({ onPaletteOpen, onNewTask }) => {
    const navigate = useNavigate();
    const pendingG = useRef(false);
    useEffect(() => {
        const handler = (e) => {
            // Ctrl+K / Cmd+K → command palette (always, regardless of focus)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                pendingG.current = false;
                onPaletteOpen();
                return;
            }
            // All other shortcuts are blocked while typing in an input
            if (isInputFocused()) {
                pendingG.current = false;
                return;
            }
            // Ignore other modifier combos
            if (e.ctrlKey || e.metaKey || e.altKey) {
                pendingG.current = false;
                return;
            }
            // Resolve pending G chord
            if (pendingG.current) {
                pendingG.current = false;
                switch (e.key.toLowerCase()) {
                    case 'd':
                        e.preventDefault();
                        navigate('/dashboard');
                        return;
                    case 'p':
                        e.preventDefault();
                        navigate('/projects');
                        return;
                    case 'k':
                        e.preventDefault();
                        navigate('/kanban');
                        return;
                    case 'g':
                        e.preventDefault();
                        navigate('/gantt');
                        return;
                }
                return; // unrecognised second key — silently cancel
            }
            // Single-key shortcuts
            switch (e.key.toLowerCase()) {
                case 'g':
                    pendingG.current = true;
                    return;
                case 'n':
                    e.preventDefault();
                    onNewTask();
                    return;
                case 'escape':
                    pendingG.current = false;
                    return;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [navigate, onPaletteOpen, onNewTask]);
};
