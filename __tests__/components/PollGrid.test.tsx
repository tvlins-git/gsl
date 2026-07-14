import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PollGrid } from '@/components/PollGrid';
import { buildMember } from '../factories';

describe('PollGrid', () => {
  const members = [buildMember({ id: 'm1', display_name: 'Alice' }), buildMember({ id: 'm2', display_name: 'Bob' })];
  const slots = [{ id: 's1', startsAt: '2026-07-15T18:00:00Z', endsAt: '2026-07-15T20:00:00Z' }];
  const responses = [{ slotId: 's1', memberId: 'm1', response: 'yes' as const }];

  it('renders member names and grid', () => {
    render(
      <PollGrid members={members} slots={slots} responses={responses} currentMemberId="m1" readOnly />
    );
    expect(screen.getByTestId('poll-grid')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});
