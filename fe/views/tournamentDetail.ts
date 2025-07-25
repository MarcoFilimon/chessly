import {
    setCurrentView,
    getCurrentTournament,
} from '../state'

import {Modal, formatDate} from '../utils/general'
import {renderApp} from './home'
import {appContent} from '../dom'
import {attachTournamentTabNavHandlers, renderTournamentTabs} from '../utils/navigationUtils'
import {attachStartEndTournamentHandlers} from '../utils/tournamentUtils'

export function renderTournamentDetail(): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        Modal.show("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex-1">
                    ${renderTournamentTabs()}
                    <div id="tournamentDetailContent">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">${currentTournament.name}</h2>
                        <p class="mb-2"><strong>Start:</strong> ${formatDate(currentTournament.start_date)}</p>
                        <p class="mb-2"><strong>End:</strong> ${formatDate(currentTournament.end_date)}</p>
                        <p class="mb-2"><strong>Location:</strong> ${currentTournament.location}</p>
                        <p class="mb-2"><strong>Nb. Of Players:</strong> ${currentTournament.nb_of_players}</p>
                        <p class="mb-2"><strong>Time Control:</strong> ${currentTournament.time_control}</p>
                        <p class="mb-2"><strong>Format:</strong> ${currentTournament.format}</p>
                        <p class="mb-2"><strong>Status:</strong> ${currentTournament.status}</p>
                        <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                            Back
                        </button>

                        ${(currentTournament.status === "Not Started")
                            ? `<button id="startTournamentBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                                    Start Tournament
                                </button>`
                            : currentTournament.status === "Ongoing"
                            ? `<button id="finishTournamentBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                                    End Tournament
                                </button>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    // Tab navigation handlers
    attachTournamentTabNavHandlers();

    // Start / end button handlers
    attachStartEndTournamentHandlers();

}