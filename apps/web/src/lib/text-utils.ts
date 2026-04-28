export function cleanSummary(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/^(This (document|file|note|page|article|entry|memo|record|piece) (is about|describes|details|outlines|summarizes|covers|contains|provides|presents|discusses|explains|records|captures|announces|is a)[^.,]*?([.,]\s*|$))/i, '')
    .replace(/^(Based on (the )?(provided|given|above|uploaded|input|user'?s?) (document|content|text|file|information|context|data)[^.,]*?([.,]\s*|$))/i, '')
    .replace(/^(Here is|The following|Below is)[^.,]*?([.,]\s*|$)/i, '')
    .replace(/^(Summary:?\s*)/i, '')
    .replace(/^(In summary[,:]?\s*)/i, '')
    .trim();
}
