import { ref } from 'vue';

export function usePrint() {
  const isPrinting = ref(false);

  /**
   * Prints the document once the print container is in the DOM.
   * Returns false without printing when the container never rendered
   * (e.g. its data failed to load), so the caller can warn the user
   * instead of opening a blank print dialog.
   */
  async function printElement(elementId: string): Promise<boolean> {
    isPrinting.value = true;
    try {
      // Give Vue time to render the print container
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!document.getElementById(elementId)) return false;
      window.print();
      return true;
    } finally {
      isPrinting.value = false;
    }
  }

  return { isPrinting, printElement };
}
