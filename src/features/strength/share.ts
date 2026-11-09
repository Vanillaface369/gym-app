import { toBlob } from 'html-to-image';

/**
 * Save a card as a PNG. Uses the phone's share sheet when it can take files, otherwise downloads it.
 * Elements marked `data-noshare` (e.g. the share button itself) and chart tooltips are left out of the picture.
 */
export async function shareCardImage(node: HTMLElement, name: string): Promise<void> {
  const bg = getComputedStyle(document.body).backgroundColor;
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: bg,
    filter: (el) => {
      if (el instanceof HTMLElement && el.dataset.noshare !== undefined) return false;
      // Leave out a chart tooltip or hover line that happens to be showing.
      const cls = el instanceof Element ? el.getAttribute('class') ?? '' : '';
      return !/recharts-tooltip-(wrapper|cursor)/.test(cls);
    },
  });
  if (!blob) throw new Error('Could not create the image.');
  const file = new File([blob], `${name}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); } catch { /* cancelled */ }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
