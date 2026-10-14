import { useEffect } from 'react';

let lockCount = 0;
let savedOverflow = null;

/**
 * Custom hook to lock body and main scrolling when a modal is open.
 * Uses a module-level reference count so nested/stacked modals that lock
 * and unlock in any order never leave the body permanently locked.
 * @param {boolean} isOpen - Whether the modal is currently open.
 */
export function useBodyScrollLock(isOpen = true) {
  useEffect(() => {
    if (!isOpen) return;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = savedOverflow || '';
        savedOverflow = null;
      }
    };
  }, [isOpen]);
}

export default useBodyScrollLock;
