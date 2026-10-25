import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoGrid from './VideoGrid';

const video = { videoId: 'abc', title: 'Cup final', thumbnail: 'thumb', length: '3:00', viewCount: '10 views', publishedTime: 'yesterday' };

test.each([{ loading: true }, { searching: true }])('shows the busy state %j', props => {
    render(<VideoGrid {...props} />);
    expect(screen.getByText('Searching videos...')).toBeInTheDocument();
});
test('shows an empty message, count and view-mode controls', async () => {
    const change = jest.fn();
    render(<VideoGrid onViewModeChange={change} />);
    expect(screen.getByText('No videos found.')).toBeInTheDocument();
    expect(screen.getByText('0 Videos found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(change).toHaveBeenCalledWith('list');
    await userEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(change).toHaveBeenLastCalledWith('grid');
});
test('video actions call the supplied callback once and broken thumbnails use a fallback', async () => {
    const select = jest.fn();
    render(<VideoGrid videos={[video]} onVideoClick={select} activeVideoId="abc" viewMode="list" />);
    await userEvent.click(screen.getByRole('button', { name: 'Load Video' }));
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(video);
    await userEvent.click(screen.getByText('Cup final'));
    expect(select).toHaveBeenCalledTimes(2);
    fireEvent.error(screen.getByAltText('Cup final'));
    expect(screen.getByAltText('Cup final')).toHaveAttribute('src', '/assets/logo.webp');
});
test('opens YouTube without a callback and optionally hides controls', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});
    render(<VideoGrid videos={[{ videoId: 'abc', title: 'Final' }]} showControls={false} />);
    expect(screen.queryByRole('button', { name: 'Grid' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Watch on YouTube' }));
    expect(open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc', '_blank');
});
