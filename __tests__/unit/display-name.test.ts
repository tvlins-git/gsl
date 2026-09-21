import { getInitials, isHonorific, nameParts } from '@/lib/display-name';

describe('isHonorific', () => {
  it.each(['Hr.', 'Hr', 'Fr.', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'dr'])(
    'treats %s as a title, not a name part',
    (token) => {
      expect(isHonorific(token)).toBe(true);
    }
  );

  it('does not treat real name tokens as titles', () => {
    expect(isHonorific('Lins')).toBe(false);
    expect(isHonorific('Ada')).toBe(false);
  });
});

describe('nameParts', () => {
  it('strips honorifics with or without a period', () => {
    expect(nameParts('Hr. Lins')).toEqual(['Lins']);
    expect(nameParts('Hr Lins')).toEqual(['Lins']);
    expect(nameParts('Fr. Schmidt')).toEqual(['Schmidt']);
    expect(nameParts('Dr. Ada Lovelace')).toEqual(['Ada', 'Lovelace']);
  });
});

describe('getInitials', () => {
  it('uses the last-name letter for titled names', () => {
    expect(getInitials('Hr. Lins')).toBe('L');
    expect(getInitials('Hr Lins')).toBe('L');
    expect(getInitials('Fr. Lins')).toBe('L');
    expect(getInitials('Mr. Lins')).toBe('L');
    expect(getInitials('Mrs. Lins')).toBe('L');
    expect(getInitials('Ms. Lins')).toBe('L');
    expect(getInitials('Dr. Lins')).toBe('L');
  });

  it('keeps first-plus-last initials for real multi-word names', () => {
    expect(getInitials('Lins')).toBe('L');
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('Dr. Ada Lovelace')).toBe('AL');
  });

  it('falls back when the name is empty', () => {
    expect(getInitials('')).toBe('?');
  });
});
