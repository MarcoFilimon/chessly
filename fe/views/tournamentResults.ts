import {setCurrentView, getCurrentView, getCurrentTournament} from '../state'
import {Matchup} from '../types'
import {showModal} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'
import {attachTabNavigationHandlers} from './navigation'

export async function renderTournamentResults(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        showModal("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }
    const tournament = currentTournament; // Now TypeScript knows it's not null

    // Tab button classes
    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    // Build table headers
    let roundHeaders = '<th class="px-4 py-2 border-b text-center">Pts.</th>';
    for (let i = 1; i <= tournament.rounds.length; i++) {
        roundHeaders += `<th class="px-4 py-2 border-b text-center">R${i}</th>`;
    }

    const playerStats = (tournament.players || []).map((player, idx) => {
        let points = 0;
        let roundCells = "";
        for (let r = 0; r < tournament.rounds.length; r++) {
            const round = tournament.rounds[r];
            const matchup = round.matchups.find(
                (m: Matchup) => m.white_player.id === player.id || m.black_player.id === player.id
            );
            let cell = "-";
            if (matchup && matchup.result) {
                if (matchup.result === "Draw") {
                    cell = "½";
                    points += 0.5;
                } else if (matchup.result === "White-Wins") {
                    if (matchup.white_player.id === player.id) {
                        cell = "1";
                        points += 1;
                    } else {
                        cell = "0";
                    }
                } else if (matchup.result === "Black-Wins") {
                    if (matchup.black_player.id === player.id) {
                        cell = "1";
                        points += 1;
                    } else {
                        cell = "0";
                    }
                }
            }
            roundCells += `<td class="px-4 py-2 border-b text-center">${cell}</td>`;
        }
        return {
            idx,
            player,
            points,
            roundCells
        };
    });

    // 2. Sort by points descending
    playerStats.sort((a, b) => b.points - a.points);

    // 3. Build the table rows
    let playerRows = playerStats.map((stat, rank) => `
        <tr>
            <td class="px-4 py-2 border-b text-center">${rank + 1}</td>
            <td class="px-4 py-2 border-b text-left">${stat.player.name}</td>
            <td class="px-4 py-2 border-b text-center">${stat.player.rating}</td>
            <td class="px-4 py-2 border-b text-center font-bold">${stat.points % 1 === 0 ? stat.points : stat.points.toFixed(1)}</td>
            ${stat.roundCells}
        </tr>
    `).join('');

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
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
    attachTabNavigationHandlers();
}
