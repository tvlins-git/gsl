import { albumBackAction, albumBackButtonText, albumBackLabel, firstSearchParam } from '@/lib/album-back';

describe('firstSearchParam', () => {
  it('returns the first string and ignores empties', () => {
    expect(firstSearchParam('event-1')).toBe('event-1');
    expect(firstSearchParam(['event-1', 'event-2'])).toBe('event-1');
    expect(firstSearchParam('')).toBeUndefined();
    expect(firstSearchParam(undefined)).toBeUndefined();
  });
});

describe('albumBackLabel', () => {
  it('names Feed when the album was opened from there', () => {
    expect(albumBackLabel('feed')).toBe('Back to Feed');
    expect(albumBackButtonText('feed')).toBe('← Back to Feed');
  });

  it('names the albums list otherwise', () => {
    expect(albumBackLabel()).toBe('Back to albums');
    expect(albumBackButtonText()).toBe('← Back to albums');
    expect(albumBackLabel('photos')).toBe('Back to albums');
  });
});

describe('albumBackAction', () => {
  it('closes in-tab album detail without touching the router', () => {
    expect(albumBackAction({ openedFromLink: false, from: 'feed', canGoBack: true })).toEqual({
      type: 'close',
    });
  });

  it('pops history when Feed (or a notification) pushed the album', () => {
    expect(albumBackAction({ openedFromLink: true, from: 'feed', canGoBack: true })).toEqual({
      type: 'back',
    });
  });

  it('replaces to Feed when there is no history from a Feed deep link', () => {
    expect(albumBackAction({ openedFromLink: true, from: 'feed', canGoBack: false })).toEqual({
      type: 'replace',
      href: '/',
    });
  });

  it('replaces to the albums list when a deep link has no history', () => {
    expect(albumBackAction({ openedFromLink: true, canGoBack: false })).toEqual({
      type: 'replace',
      href: '/photos',
    });
  });
});
