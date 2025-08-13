import {
    setCurrentView,
    getCurrentTournament,
} from '../../state.js'

import {Modal} from '../../utils/general.js'
import {renderApp} from '../home.js'
import {appContent} from '../../dom.js'

import {
    attachTournamentTabNavHandlers,
    renderTournamentTabs,
} from '../../utils/navigationUtils.js'

import {getSelectedRoundIdx, setSelectedRoundIdx} from '../../state.js'

import {
    attachSaveResultsButtonHandler,
    attachRoundTabHandlers,
    renderSelectedRound,
    renderRoundTabs
} from '../../utils/gamesUtils.js'


export async function renderTournamentGames(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        Modal.show("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }

    // Reset selectedRoundIdx if out of bounds
    const selectedRoundIdx = getSelectedRoundIdx();
    if (
        !currentTournament.rounds ||
        selectedRoundIdx < 0 ||
        selectedRoundIdx >= currentTournament.rounds.length
    ) {
        setSelectedRoundIdx(0);
    }

    // Render round tabs
    const roundTabsHtml = renderRoundTabs(currentTournament);

    // Render only the selected round's table
    let roundTableHtml = renderSelectedRound(currentTournament);

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            ${renderTournamentTabs()}
            <div id="tournamentDetailContent">
                <h3 class="text-xl font-semibold mb-2">Games</h3>
                ${roundTabsHtml}
                ${roundTableHtml}
                <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                    Back to Tournaments
                </button>
            </div>
        </div>
    `;
    attachTournamentTabNavHandlers()
    attachRoundTabHandlers(currentTournament)
    attachSaveResultsButtonHandler(currentTournament);
}