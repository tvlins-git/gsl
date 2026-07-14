import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Logo } from '@/components/Logo';
import { APP_NAME } from '@/constants/brand';

describe('Logo', () => {
  it('renders GSL title', () => {
    render(<Logo />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
  });

  it('hides title when showTitle is false', () => {
    render(<Logo showTitle={false} />);
    expect(screen.queryByText(APP_NAME)).toBeNull();
  });
});
