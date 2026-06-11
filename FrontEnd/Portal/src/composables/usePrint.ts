import { ref } from 'vue';

export function usePrint() {
  const isPrinting = ref(false);

  async function printElement(_elementId: string) {
    isPrinting.value = true;
    // Give Vue time to render the print container
    await new Promise(resolve => setTimeout(resolve, 100));
    window.print();
    isPrinting.value = false;
  }

  return { isPrinting, printElement };
}
