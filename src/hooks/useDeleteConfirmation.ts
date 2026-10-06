/**
 * Reusable hook for delete confirmation dialogs.
 * Used by ExpenseTracker, Tasks, BorrowRepayView, PlannedExpensesView.
 */

import { useState, useCallback } from 'react';

interface DeleteConfirmation<T = string> {
  /** The item targeted for deletion */
  target: T | null;
  /** Whether the confirmation dialog is open */
  isOpen: boolean;
  /** A human-readable name/label for the item being deleted */
  itemName: string;
  /** Open the confirmation dialog for a specific item */
  confirm: (target: T, itemName: string) => void;
  /** Cancel / close the confirmation dialog */
  cancel: () => void;
  /** Execute the delete and close the dialog */
  execute: (onDelete: (target: T) => void) => void;
}

export function useDeleteConfirmation<T = string>(): DeleteConfirmation<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [itemName, setItemName] = useState('');

  const confirm = useCallback((item: T, name: string) => {
    setTarget(item);
    setItemName(name);
  }, []);

  const cancel = useCallback(() => {
    setTarget(null);
    setItemName('');
  }, []);

  const execute = useCallback(
    (onDelete: (target: T) => void) => {
      if (target !== null) {
        onDelete(target);
        setTarget(null);
        setItemName('');
      }
    },
    [target]
  );

  return {
    target,
    isOpen: target !== null,
    itemName,
    confirm,
    cancel,
    execute,
  };
}
