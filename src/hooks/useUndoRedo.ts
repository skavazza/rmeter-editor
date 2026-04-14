import { useState, useEffect, useCallback } from 'react';
import UndoRedoManager from '@/services/UndoRedoManager';

/**
 * Hook para usar o sistema de Undo/Redo em componentes React
 */
export function useUndoRedo() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [stackInfo, setStackInfo] = useState({ undoCount: 0, redoCount: 0 });

  const undoRedoManager = UndoRedoManager.getInstance();

  useEffect(() => {
    const updateState = () => {
      setCanUndo(undoRedoManager.canUndo());
      setCanRedo(undoRedoManager.canRedo());
      setStackInfo(undoRedoManager.getStackInfo());
    };

    // Subscribe to changes
    undoRedoManager.subscribe('stack-change', updateState);
    updateState(); // Initial state

    return () => {
      undoRedoManager.unsubscribe(updateState);
    };
  }, [undoRedoManager]);

  const undo = useCallback(() => {
    undoRedoManager.undo();
  }, [undoRedoManager]);

  const redo = useCallback(() => {
    undoRedoManager.redo();
  }, [undoRedoManager]);

  const clear = useCallback(() => {
    undoRedoManager.clear();
  }, [undoRedoManager]);

  return {
    canUndo,
    canRedo,
    stackInfo,
    undo,
    redo,
    clear,
  };
}

export default useUndoRedo;
