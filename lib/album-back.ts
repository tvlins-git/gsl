/** First value from Expo Router search params (string or string[]). */
export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? raw : undefined;
}

export function albumBackLabel(from?: string): string {
  return from === 'feed' ? 'Back to Feed' : 'Back to albums';
}

export function albumBackButtonText(from?: string): string {
  return `← ${albumBackLabel(from)}`;
}

export type AlbumBackAction =
  | { type: 'close' }
  | { type: 'back' }
  | { type: 'replace'; href: '/' | '/photos' };

/**
 * Album detail is either in-tab state (Photos list) or a deep link
 * (`?eventId=` from Feed / notifications). Closing local state alone is a
 * no-op when `eventId` stays in the URL — the screen re-opens the album.
 */
export function albumBackAction(opts: {
  openedFromLink: boolean;
  from?: string;
  canGoBack: boolean;
}): AlbumBackAction {
  if (!opts.openedFromLink) return { type: 'close' };
  if (opts.canGoBack) return { type: 'back' };
  if (opts.from === 'feed') return { type: 'replace', href: '/' };
  return { type: 'replace', href: '/photos' };
}
