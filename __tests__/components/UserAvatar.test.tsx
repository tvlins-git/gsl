import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { UserAvatar } from '@/components/UserAvatar';

describe('UserAvatar', () => {
  it('shows the last-name initial for titled names', () => {
    render(<UserAvatar name="Hr. Lins" />);
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.queryByText('HL')).toBeNull();
  });

  it('shows first and last initials for real two-word names', () => {
    render(<UserAvatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).toBeTruthy();
  });
});
