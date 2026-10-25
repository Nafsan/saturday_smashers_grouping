import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeroSection from './HeroSection';

test('connects the home-page calls to action to their handlers', async () => {
    const stats = jest.fn(), rankings = jest.fn(), fixtures = jest.fn();
    render(<HeroSection onPlayerStats={stats} onViewRankings={rankings} onCreateFixture={fixtures} />);
    expect(screen.getByRole('heading', { name: 'Saturday Smashers' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Player Stats' }));
    await userEvent.click(screen.getByRole('button', { name: 'View Rankings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create Tournament Fixture' }));
    for (const callback of [stats, rankings, fixtures]) expect(callback).toHaveBeenCalledTimes(1);
});
