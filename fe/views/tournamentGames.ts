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
import {showModal} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'
import {attachTabNavigationHandlers} from './navigation'
import {getSelectedRoundIdx, setSelectedRoundIdx} from '../state'
import {renderTournamentResults} from './tournamentResults'

export async function renderTournamentGames(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        showModal("Tournament not found.");
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

    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    // Build round tabs
    let roundTabsHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        roundTabsHtml = `<div id="roundTabs" class="flex gap-2 mb-6 overflow-x-auto flex-nowrap pb-4" style="scrollbar-width: thin;">`;
        currentTournament.rounds.forEach((round, idx) => {
            roundTabsHtml += `
                <button
                    class="${tabBase} ${selectedRoundIdx === idx ? tabActive : tabInactive}"
                    id="roundTab${idx}"
                    style="min-width: 120px;">
                    #${round.round_number}
                </button>
            `;
        });
        roundTabsHtml += `</div>`;
    }

    // Render only the selected round's table
    let roundTableHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        const round = currentTournament.rounds[selectedRoundIdx];
        if (!round.matchups || !Array.isArray(round.matchups) || round.matchups.length === 0) {
            roundTableHtml = `<p class="text-gray-600">Matchups for this round are not available yet. Please try again in a moment.</p>`;
        } else {
            roundTableHtml = `
                <h4 class="text-lg font-bold mt-6 mb-2">Round ${round.round_number} / ${currentTournament.rounds.length}</h4>
                <table class="min-w-full mb-4 bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 border-b text-center">Board</th>
                            <th class="px-4 py-2 border-b text-center">White</th>
                            <th class="px-4 py-2 border-b text-center">Result</th>
                            <th class="px-4 py-2 border-b text-center">Black</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${round.matchups.map((m: Matchup, idx: number) => `
                            <tr>
                                <td class="px-4 py-2 border-b text-center">${idx + 1}</td>
                                <td class="px-4 py-2 border-b text-center">${m.white_player.name}</td>
                                <td class="px-4 py-2 border-b text-center">
                                    ${
                                        currentTournament!.status === TournamentStatus.Ongoing
                                        ? `<select class="result-select text-center" data-matchup-id="${m.id}" style="text-align-last: center;">
                                                <option value="" ${!m.result ? "selected" : ""}>Select</option>
                                                <option value="White-Wins" ${m.result === "White-Wins" ? "selected" : ""}>1 - 0</option>
                                                <option value="Black-Wins" ${m.result === "Black-Wins" ? "selected" : ""}>0 - 1</option>
                                                <option value="Draw" ${m.result === "Draw" ? "selected" : ""}>½ - ½</option>
                                            </select>`
                                        : (
                                            m.result === "White-Wins" ? "1 - 0"
                                            : m.result === "Black-Wins" ? "0 - 1"
                                            : m.result === "Draw" ? "½ - ½"
                                            : "-"
                                        )
                                    }
                                </td>
                                <td class="px-4 py-2 border-b text-center">${m.black_player.name}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }
    if (currentTournament.status === TournamentStatus.Ongoing) {
        roundTableHtml += `
            <div class="flex justify-end mt-4">
                <button id="saveResultsBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                    Save Results
                </button>
            </div>
        `;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex gap-2 mb-6">
                <button id="descTab" class="${tabBase} ${getCurrentView() === 'viewTournamentDetail' ? tabActive : tabInactive}">Description</button>
                <button id="playersTab" class="${tabBase} ${getCurrentView() === 'viewTournamentPlayers' ? tabActive : tabInactive}">Players</button>
                <button id="gamesTab" class="${tabBase} ${getCurrentView() === 'viewTournamentGames' ? tabActive : tabInactive}">Games</button>
                <button id="resultsTab" class="${tabBase} ${getCurrentView() === 'viewTournamentResults' ? tabActive : tabInactive}">Results</button>
            </div>
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

    // Tab navigation handlers (existing)
    attachTabNavigationHandlers()

    // Round tab handlers
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        currentTournament.rounds.forEach((_, idx) => {
            document.getElementById(`roundTab${idx}`)?.addEventListener('click', () => {
                // Save scroll position
                const roundTabsDiv = document.getElementById('roundTabs');
                const scrollLeft = roundTabsDiv ? roundTabsDiv.scrollLeft : 0;

                setSelectedRoundIdx(idx);
                renderTournamentGames();

                // Restore scroll position after render
                setTimeout(() => {
                    const roundTabsDiv = document.getElementById('roundTabs');
                    if (roundTabsDiv) {
                        roundTabsDiv.scrollLeft = scrollLeft;
                    }
                }, 0);
            });
        });
    }

    document.getElementById('saveResultsBtn')?.addEventListener('click', async () => {
        const selects = document.querySelectorAll('.result-select');
        const results: Array<{ matchupId: string, result: string }> = [];
        let missing = false;

        selects.forEach(select => {
            const matchupId = (select as HTMLSelectElement).getAttribute('data-matchup-id');
            const result = (select as HTMLSelectElement).value;
            if (!result) {
                missing = true;
            }
            results.push({ matchupId: matchupId!, result });
        });

        if (missing) {
            showModal("Please select a result for every matchup before saving.");
            return;
        }

        // Batch API call
        try {
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament?.id}/round_result/${selectedRoundIdx + 1}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ results })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to save results.');
            }
            showModal("Results saved successfully!");
            // Optionally refresh tournament data
            const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
            if (tournamentResp.ok) {
                setCurrentTournament(await tournamentResp.json())
                renderTournamentGames();
                if (getCurrentView() === 'viewTournamentResults') {
                    renderTournamentResults();
                }
            }
        } catch (error: any) {
            showModal(`Failed to save results: ${error.message}`);
        }
    });
}