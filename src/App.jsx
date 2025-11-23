import React from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/store';
import PlayerSelection from './components/PlayerSelection';
import GroupDisplay from './components/GroupDisplay';
import './styles/global.scss';

const MainContent = () => {
    const { isGroupsGenerated } = useSelector(state => state.app);

    return (
        <div className="container">
            <header style={{ textAlign: 'center', padding: '2rem 0' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Saturday Smashers
                </h1>
            </header>

            <main>
                {!isGroupsGenerated ? <PlayerSelection /> : <GroupDisplay />}
            </main>
        </div>
    );
};

function App() {
    return (
        <Provider store={store}>
            <MainContent />
        </Provider>
    );
}

export default App;
