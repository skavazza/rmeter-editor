/**
 * Undo/Redo Manager for Rainmeter Editor
 * 
 * Implements a command pattern similar to QUndoStack in PyQt6.
 * Each command must implement redo() and undo() methods.
 */

export interface Command {
  name: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

class UndoRedoManager {
  private static instance: UndoRedoManager | null = null;
  
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSteps: number = 50;
  
  private listeners: { type: 'stack-change' | 'execute' | 'undo' | 'redo', callback: () => void }[] = [];

  private constructor() {}

  public static getInstance(): UndoRedoManager {
    if (!UndoRedoManager.instance) {
      UndoRedoManager.instance = new UndoRedoManager();
    }
    return UndoRedoManager.instance;
  }

  /**
   * Execute a command and push to undo stack
   */
  public execute(command: Command): void {
    try {
      command.execute();
      this.undoStack.push(command);
      this.redoStack = []; // Clear redo stack on new action
      
      // Limit stack size
      if (this.undoStack.length > this.maxSteps) {
        this.undoStack.shift();
      }
      
      this.notifyListeners('execute');
      this.notifyListeners('stack-change');
    } catch (error) {
      console.error(`Error executing command "${command.name}":`, error);
    }
  }

  /**
   * Undo the last command
   */
  public undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const command = this.undoStack.pop()!;
    try {
      command.undo();
      this.redoStack.push(command);
      this.notifyListeners('undo');
      this.notifyListeners('stack-change');
      return true;
    } catch (error) {
      console.error(`Error undoing command "${command.name}":`, error);
      return false;
    }
  }

  /**
   * Redo the last undone command
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const command = this.redoStack.pop()!;
    try {
      command.redo();
      this.undoStack.push(command);
      this.notifyListeners('redo');
      this.notifyListeners('stack-change');
      return true;
    } catch (error) {
      console.error(`Error redoing command "${command.name}":`, error);
      return false;
    }
  }

  /**
   * Check if can undo
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if can redo
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners('stack-change');
  }

  /**
   * Get current stack sizes
   */
  public getStackInfo(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  /**
   * Set maximum number of undo steps
   */
  public setMaxSteps(steps: number): void {
    this.maxSteps = steps;
  }

  /**
   * Subscribe to stack changes
   */
  public subscribe(type: 'stack-change' | 'execute' | 'undo' | 'redo', callback: () => void): void {
    this.listeners.push({ type, callback });
  }

  /**
   * Unsubscribe from stack changes
   */
  public unsubscribe(callback: () => void): void {
    this.listeners = this.listeners.filter(l => l.callback !== callback);
  }

  private notifyListeners(type: 'stack-change' | 'execute' | 'undo' | 'redo'): void {
    this.listeners
      .filter(l => l.type === type || l.type === 'stack-change')
      .forEach(l => l.callback());
  }
}

export default UndoRedoManager;
