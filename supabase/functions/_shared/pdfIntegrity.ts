/** Check the PDF header and search the final 1024 bytes for a complete end marker. */
export async function validatePdfIntegrity(file: Blob): Promise<boolean> {
  try {
    const [header, trailer] = await Promise.all([
      file.slice(0, 5).arrayBuffer(),
      file.slice(Math.max(0, file.size - 1024)).arrayBuffer(),
    ]);
    const decoder = new TextDecoder('latin1');
    return decoder.decode(header) === '%PDF-' && decoder.decode(trailer).includes('%%EOF');
  } catch {
    return false;
  }
}
