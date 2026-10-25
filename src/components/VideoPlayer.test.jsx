import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayer from './VideoPlayer';

test('shows loading and empty states', () => {
    const { rerender } = render(<VideoPlayer loading />);
    expect(screen.getByText('Loading latest video...')).toBeInTheDocument();
    rerender(<VideoPlayer />);
    expect(screen.getByText('Select a video from the list below')).toBeInTheDocument();
});
test('renders the supplied embed', () => {
    render(<VideoPlayer embedUrl='<iframe title="Latest match" src="https://youtube.com/embed/abc"></iframe>' />);
    expect(screen.getByTitle('Latest match')).toHaveAttribute('src', 'https://youtube.com/embed/abc');
});
test('opens the playlist using the callback or browser fallback', async () => {
    const open = jest.fn();
    const { rerender } = render(<VideoPlayer playlistUrl="playlist" onOpenPlaylist={open} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open on YouTube' }));
    expect(open).toHaveBeenCalledWith('playlist');
    const browserOpen = jest.spyOn(window, 'open').mockImplementation(() => {});
    rerender(<VideoPlayer playlistUrl="playlist" />);
    await userEvent.click(screen.getByRole('button', { name: 'Open on YouTube' }));
    expect(browserOpen).toHaveBeenCalledWith('playlist', '_blank');
});
