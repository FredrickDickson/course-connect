// Focus management utilities for accessibility

export class FocusManager {
  private static instance: FocusManager;
  private previousFocus: Element | null = null;

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  // Save current focus element
  saveFocus(): void {
    this.previousFocus = document.activeElement;
  }

  // Restore focus to previously saved element
  restoreFocus(): void {
    if (this.previousFocus && this.previousFocus instanceof HTMLElement && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }

  // Trap focus within a container (for modals, dropdowns, etc.)
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  // Get all focusable elements in a container
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
  }

  // Check if an element is focusable
  isFocusable(element: Element): element is HTMLElement {
    if (!element || !(element instanceof HTMLElement)) return false;
    
    // Check if element is visible and not disabled
    if (element.offsetParent === null) return false;
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    
    // Check if element has valid tabindex
    const tabindex = element.getAttribute('tabindex');
    if (tabindex && parseInt(tabindex) < 0) return false;
    
    // Check if element is in the focusable elements list
    const tagName = element.tagName.toLowerCase();
    const focusableTags = ['button', 'a', 'input', 'select', 'textarea'];
    
    return focusableTags.includes(tagName) || 
           element.getAttribute('tabindex') !== null ||
           element.getAttribute('contenteditable') === 'true';
  }
}

// React hook for focus management
export function useFocusManagement() {
  const focusManager = FocusManager.getInstance();

  return {
    saveFocus: () => focusManager.saveFocus(),
    restoreFocus: () => focusManager.restoreFocus(),
    trapFocus: (container: HTMLElement) => focusManager.trapFocus(container),
    getFocusableElements: (container: HTMLElement) => focusManager.getFocusableElements(container),
    isFocusable: (element: Element) => focusManager.isFocusable(element)
  };
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  // Handle arrow key navigation for lists
  static handleArrowNavigation(
    e: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onSelect: (index: number) => void,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): boolean {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault();
          newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault();
          newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = totalItems - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(currentIndex);
        return true;
      default:
        return false;
    }

    if (newIndex !== currentIndex) {
      onSelect(newIndex);
      return true;
    }

    return false;
  }

  // Handle escape key
  static handleEscape(e: KeyboardEvent, onEscape: () => void): boolean {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return true;
    }
    return false;
  }
}

export const keyboardNavigation = KeyboardNavigation;
