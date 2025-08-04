import {setCurrentView, getCurrentTournament} from '../../state.js'
import {Modal} from '../../utils/general.js'
import {renderApp} from '../home.js'
import {appContent} from '../../dom.js'
import {attachTournamentTabNavHandlers, renderTournamentTabs} from '../../utils/navigationUtils.js'
import { getPlayerStats, renderRoundHeaders, renderPlayerRows } from '../../utils/playerUtils.js'

export async function renderTournamentResults(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        Modal.show("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }

    const tournament = currentTournament;
    const numRounds = tournament.rounds ? tournament.rounds.length : 0;

    const playerStats = getPlayerStats(tournament);
    playerStats.sort((a, b) => b.points - a.points);

    const roundHeaders = renderRoundHeaders(numRounds);
    const playerRows = renderPlayerRows(playerStats);


    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            ${renderTournamentTabs()}
            <div id="tournamentDetailContent">
                <h3 class="text-xl font-semibold mb-2">Results - ${tournament.format} (${tournament.time_control})</h3>
                <div class="overflow-x-auto mb-4">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 border-b text-center">#</th>
                                <th class="px-4 py-2 border-b text-left">Name</th>
                                <th class="px-4 py-2 border-b text-center">Rating</th>
                                ${roundHeaders}
                            </tr>
                        </thead>
                        <tbody>
                            ${playerRows}
                        </tbody>
                    </table>
                </div>
                <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                    Back to Tournaments
                </button>
            </div>
        </div>
    `;

    // Tab navigation handlers
    attachTournamentTabNavHandlers();
}
