import {
    setCurrentView,
    getCurrentView,
    getCurrentTournament,
    setCurrentTournament,
    getToken
} from '../state'

import {
    apiFetch,
    fastApiBaseUrl,
} from '../api'

import {Matchup, TournamentStatus} from '../types'
import {showModal, formatDate, isTournament} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'
import {attachTabNavigationHandlers} from './navigation'
import {setSelectedRoundIdx} from '../state'
import {renderTournamentGames} from './tournamentGames'


export function renderTournamentDetail(): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        showModal("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }

    // Tab button classes
    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex-1">
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
    attachTabNavigationHandlers();

    // Start Tournament button logic
    document.getElementById('startTournamentBtn')?.addEventListener('click', async () => {
        const currentTournament = getCurrentTournament();
        if (!isTournament(currentTournament)) {
            showModal("Tournament not found.");
            return;
        }

        // Check if all players have been created
        const players = currentTournament.players || [];
        if (players.length < currentTournament.nb_of_players) {
            showModal(`You need to add all ${currentTournament.nb_of_players} players before starting the tournament.`);
            setCurrentView('viewTournamentPlayers');
            renderApp();
            return;
        }
        try {
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to start tournament.');
            }
            showModal("Tournament started! All rounds have been generated.");

            // Refresh tournament data
            setCurrentTournament(await response.json());
            setSelectedRoundIdx(0);
            setCurrentView('viewTournamentGames');
            renderApp();

            // Frontend is rendering before the backend has finished generating/populating all matchups for the last round
            // Add this to force a refetch after a short delay:
            setTimeout(async () => {
                const resp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (resp.ok) {
                    setCurrentTournament(await resp.json());
                    // If you're still on games view, re-render
                    if (getCurrentView() === 'viewTournamentGames') {
                        renderTournamentGames();
                    }
                }
            }, 300); // 300ms delay, adjust as needed
        } catch (error: any) {
            showModal(`Failed to start tournament: ${error.message}`);
        }
    });

    // End Tournament button logic
    document.getElementById('finishTournamentBtn')?.addEventListener('click', async () => {
        if (!isTournament(currentTournament)) {
            showModal("Tournament not found.");
            return;
        }

        try {
            currentTournament.status = TournamentStatus.Finished
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(currentTournament)
            });
            if (!response.ok) {
                currentTournament.status = TournamentStatus.Ongoing
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to end the tournament.');
            }
            showModal("Tournament ended! See the results.");
            setCurrentView('viewTournamentResults');
            renderApp();
        } catch (error: any) {
            showModal(`Failed to end the tournament: ${error.message}`);
        }
    });


}