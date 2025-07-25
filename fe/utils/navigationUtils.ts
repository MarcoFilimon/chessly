import {
    setCurrentView,
    getCurrentView
} from '../state'

import {renderApp} from '../views/home'


// Tab button classes
export const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
export const tabActive = "bg-blue-600 text-white";
export const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";


export function attachTournamentTabNavHandlers() {
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

export function renderTournamentTabs(): string {
    return `
        <div class="flex gap-2 mb-6">
            <button id="descTab" class="${tabBase} ${getCurrentView() === 'viewTournamentDetail' ? tabActive : tabInactive}">
                Description
            </button>
            <button id="playersTab" class="${tabBase} ${getCurrentView() === 'viewTournamentPlayers' ? tabActive : tabInactive}">
                Players
            </button>
            <button id="gamesTab" class="${tabBase} ${getCurrentView() === 'viewTournamentGames' ? tabActive : tabInactive}">
                Games
            </button>
            <button id="resultsTab" class="${tabBase} ${getCurrentView() === 'viewTournamentResults' ? tabActive : tabInactive}">
                Results
            </button>
        </div>
    `;
}