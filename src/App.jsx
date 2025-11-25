import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';
import { fetchHistoryAsync } from './store/appSlice';
import PlayerSelection from './components/PlayerSelection';
import GroupDisplay from './components/GroupDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { ToastProvider } from './context/ToastContext';
import './styles/global.scss';

// Create a custom dark theme matching the global SCSS variables
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#38bdf8', // --accent-primary
        },
        secondary: {
            main: '#818cf8', // --accent-secondary
        },
        background: {
            default: '#0f172a', // --bg-primary
            paper: '#1e293b',   // --bg-secondary
        },
        text: {
            primary: '#f8fafc', // --text-primary
            secondary: '#94a3b8', // --text-secondary
        },
        success: {
            main: '#4ade80', // --accent-success
        },
    },
    typography: {
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#334155', // --bg-card for dialogs to stand out
                    backgroundImage: 'none',
                }
            }
        }
    }
});

const MainContent = () => {
    const dispatch = useDispatch();
    const { isGroupsGenerated, status } = useSelector(state => state.app);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchHistoryAsync());
        }
    }, [status, dispatch]);

    return (
        <div className="container">
            <header style={{ textAlign: 'center', padding: '2rem 0' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Saturday Smashers
                </h1>
            </header>

            <main>
                {status === 'loading' ? (
                    <LoadingSpinner />
                ) : (
                    !isGroupsGenerated ? <PlayerSelection /> : <GroupDisplay />
                )}
            </main>
        </div>
    );
};

function App() {
    return (
        <Provider store={store}>
            <ThemeProvider theme={darkTheme}>
                <CssBaseline />
                <ToastProvider>
                    <MainContent />
                </ToastProvider>
            </ThemeProvider>
        </Provider>
    );
}

export default App;
