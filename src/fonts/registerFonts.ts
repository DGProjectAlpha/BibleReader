import { jsPDF } from 'jspdf';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let fontsLoaded = false;
let fontLoadPromise: Promise<void> | null = null;

/**
 * Fetches DejaVu Sans (regular + bold) from public/fonts/ and registers them
 * with jsPDF's VFS so they can be used for Unicode (Cyrillic, etc.) text.
 * Only fetches once; subsequent calls are no-ops.
 */
export async function registerUnicodeFonts(doc: jsPDF): Promise<void> {
  if (!fontsLoaded) {
    if (!fontLoadPromise) {
      fontLoadPromise = (async () => {
        const [regularBuf, boldBuf] = await Promise.all([
          fetch('/fonts/DejaVuSans.ttf').then((r) => r.arrayBuffer()),
          fetch('/fonts/DejaVuSans-Bold.ttf').then((r) => r.arrayBuffer()),
        ]);
        // Cache the base64 strings on the module so we don't re-fetch
        (registerUnicodeFonts as any)._regular = arrayBufferToBase64(regularBuf);
        (registerUnicodeFonts as any)._bold = arrayBufferToBase64(boldBuf);
        fontsLoaded = true;
      })();
    }
    await fontLoadPromise;
  }

  const regularB64 = (registerUnicodeFonts as any)._regular as string;
  const boldB64 = (registerUnicodeFonts as any)._bold as string;

  doc.addFileToVFS('DejaVuSans.ttf', regularB64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');

  doc.addFileToVFS('DejaVuSans-Bold.ttf', boldB64);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
}
