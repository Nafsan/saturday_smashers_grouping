import { store } from './store';
import { setTournamentDate } from './appSlice';

test('registers the application reducer and handles dispatched actions', () => {
    const previous = store.getState().app.tournamentDate;
    store.dispatch(setTournamentDate('2026-10-31'));
    expect(store.getState().app.tournamentDate).toBe('2026-10-31');
    store.dispatch(setTournamentDate(previous));
});
