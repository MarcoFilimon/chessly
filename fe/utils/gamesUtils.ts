import {
    fetchTournament,
    batchUpdatePlayerResults
} from '../api/tournamentAPI.js'

import {
    getCurrentView,
    setCurrentTournament,
} from '../state.js'

import {Matchup, TournamentStatus, Tournament, MatchupResult} from '../types.js'
import {Modal} from './general.js'

import {
    tabBase,
    tabInactive,
    tabActive
} from './navigationUtils.js'

import {getSelectedRoundIdx, setSelectedRoundIdx} from '../state.js'
import {renderTournamentResults} from '../views/tournamentResults.js'
import { renderTournamentGames } from '../views/tournamentGames.js'

export function attachSaveResultsButtonHandler(currentTournament: Tournament) {
    document.getElementById('saveResultsBtn')?.addEventListener('click', async () => {
        const selects = document.querySelectorAll('.result-select');
        const results: MatchupResult[] = [];
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
            Modal.show("Please select a result for every matchup before saving.");
            return;
        }

        // Batch API call to update tournament results
        try {
            await batchUpdatePlayerResults(currentTournament.id, results);
            Modal.show("Results saved successfully!");
            // Refresh tournament data
            try {
                const tournamentRes = await fetchTournament(currentTournament.id);
                setCurrentTournament(tournamentRes)
            } catch (error) {
                Modal.show("Could not refresh tournament data. Please reload the page.");
            }
            renderTournamentGames();
            if (getCurrentView() === 'viewTournamentResults') {
                renderTournamentResults();
            }
        } catch (error: any) {
            console.error(error);
            Modal.show(`Failed to save results: ${error.message}`);
        }
    });
}

export function attachRoundTabHandlers(currentTournament: Tournament) {
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
}

export function renderSelectedRound(currentTournament: Tournament) {
    let roundTableHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        const round = currentTournament.rounds[getSelectedRoundIdx()];
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
    return roundTableHtml;
}

export function renderRoundTabs(currentTournament: Tournament) {
    let roundTabsHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        roundTabsHtml = `<div id="roundTabs" class="flex gap-2 mb-6 overflow-x-auto flex-nowrap pb-4" style="scrollbar-width: thin;">`;
        currentTournament.rounds.forEach((round, idx) => {
            roundTabsHtml += `
                <button
                    class="${tabBase} ${getSelectedRoundIdx() === idx ? tabActive : tabInactive}"
                    id="roundTab${idx}"
                    style="min-width: 120px;">
                    #${round.round_number}
                </button>
            `;
        });
        roundTabsHtml += `</div>`;
    }
    return roundTabsHtml
}
