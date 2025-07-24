import {
    setCurrentView,
    getCurrentView
} from '../state'

import {renderApp} from './home'

export function attachTabNavigationHandlers() {
    // Tab navigation handlers
    document.getElementById('descTab')?.addEventListener('click', () => {
        if (getCurrentView() !== 'viewTournamentDetail') {
            setCurrentView('viewTournamentDetail');
            renderApp();
        }
    });
    document.getElementById('playersTab')?.addEventListener('click', () => {
        if (getCurrentView() !== 'viewTournamentPlayers') {
            setCurrentView('viewTournamentPlayers');
            renderApp();
        }
    });
    document.getElementById('gamesTab')?.addEventListener('click', () => {
        if (getCurrentView() !== 'viewTournamentGames') {
            setCurrentView('viewTournamentGames');
            renderApp();
        }
    });
    document.getElementById('resultsTab')?.addEventListener('click', () => {
        if (getCurrentView() !== 'viewTournamentResults') {
            setCurrentView('viewTournamentResults');
            renderApp();
        }
    });
    document.getElementById('backToTournamentsBtn')?.addEventListener('click', () => {
        setCurrentView('viewTournaments');
        renderApp();
    });
}