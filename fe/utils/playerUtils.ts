import {
    setPlayerSortColumn,
    setPlayerSortDirection,
    getPlayerSortColumn,
    getPlayerSortDirection,
    getToken,
    setCurrentTournament,
    getCurrentTournament,
    setCurrentView
} from '../state.js'

import {
    addPlayerToTournament,
    apiFetch,
    fastApiBaseUrl,
    fetchTournament,
    deleteAllPlayers,
    deletePlayer
} from '../api.js'

import { Modal } from './general.js'
import { isTournament } from './tournamentUtils.js'
import {renderApp} from '../views/home.js'
import {Player, Matchup, Tournament} from '../types.js'
import { renderTournamentPlayers } from '../views/tournamentPlayers.js'
import {appContent} from '../dom.js'


export function getPlayerStats(tournament: Tournament) {
    const numRounds = tournament.rounds ? tournament.rounds.length : 0;
    return (tournament.players || []).map((player, idx) => {
        let points = 0;
        let roundCells = "";
        for (let r = 0; r < numRounds; r++) {
            const round = tournament.rounds![r];
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
        return { idx, player, points, roundCells };
    });
}

export function getSortedPlayers(
    players: ReadonlyArray<Player>,
    column: 'name' | 'rating',
    direction: 'asc' | 'desc'
): Player[] {
    return [...players].sort((a, b) => {
        if (column === 'name') {
            return direction === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        } else {
            return direction === 'asc'
                ? a.rating - b.rating
                : b.rating - a.rating;
        }
    });
}


export function renderPlayerRows(playerStats: any[]): string {
    return playerStats.map((stat, rank) => `
        <tr>
            <td class="px-4 py-2 border-b text-center">${rank + 1}</td>
            <td class="px-4 py-2 border-b text-left">${stat.player.name}</td>
            <td class="px-4 py-2 border-b text-center">${stat.player.rating}</td>
            <td class="px-4 py-2 border-b text-center font-bold">${stat.points % 1 === 0 ? stat.points : stat.points.toFixed(1)}</td>
            ${stat.roundCells}
        </tr>
    `).join('');
}

export function renderRoundHeaders(numRounds: number): string {
    let roundHeaders = '<th class="px-4 py-2 border-b text-center">Pts.</th>';
    for (let i = 1; i <= numRounds; i++) {
        roundHeaders += `<th class="px-4 py-2 border-b text-center">R${i}</th>`;
    }
    return roundHeaders;
}

export function renderPlayerRow(player: Player, idx: number, canEdit: boolean): string {
    return `
        <tr>
            <td class="px-4 py-2 border-b">${idx + 1}</td>
            <td class="px-4 py-2 border-b">${player.name}</td>
            <td class="px-4 py-2 border-b flex items-center justify-between">
                <span>${player.rating}</span>
                ${canEdit ?
                    `<span class="flex gap-2 ml-4">
                        <button type="button" class="update-player-btn" data-player-id="${player.id}" title="Update">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 hover:text-blue-700 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l3.586 3.586a1 1 0 010 1.414L13 17H9v-4z" />
                            </svg>
                        </button>
                        <button type="button" class="delete-player-btn" data-player-id="${player.id}" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 hover:text-red-700 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>`
                    :
                    ""}
            </td>
        </tr>
    `;
}

export function renderUpdatePlayer(playerId: number): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        Modal.show("Tournament not found.");
        setCurrentView('viewTournamentPlayers');
        renderApp();
        return;
    }

    const player = (currentTournament.players || []).find(p => p.id === playerId);
    if (!player) {
        Modal.show("Player not found.");
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Update Player</h2>
            <form id="updatePlayerForm" class="space-y-6">
                <div>
                    <label for="updatePlayerName" class="block text-gray-700 text-sm font-semibold mb-2">Player Name</label>
                    <input
                        type="text"
                        id="updatePlayerName"
                        name="name"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${player.name || ''}"
                        required
                    >
                </div>
                <div>
                    <label for="updatePlayerRating" class="block text-gray-700 text-sm font-semibold mb-2">Rating</label>
                    <input
                        type="number"
                        id="updatePlayerRating"
                        name="rating"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${player.rating || ''}"
                        required
                    >
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancelUpdatePlayerBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                        Cancel
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        Update Player
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('cancelUpdatePlayerBtn')?.addEventListener('click', () => {
        setCurrentView('viewTournamentPlayers');
        renderApp();
    });

    document.getElementById('updatePlayerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (document.getElementById('updatePlayerName') as HTMLInputElement).value.trim();
        const rating = Number((document.getElementById('updatePlayerRating') as HTMLInputElement).value);

        try {
            const payload = { name, rating };
            const response = await fetch(`${fastApiBaseUrl}/player/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.detail && Array.isArray(error.detail)) {
                    const messages = error.detail.map((e: any) => e.msg).join('; ');
                    throw new Error(messages);
                }
                throw new Error(error.detail || error.message || 'Failed to update player.');
            }

            if (!isTournament(currentTournament)) {
                Modal.show("Tournament not found.");
                return;
            }

            Modal.show("Player updated successfully!");
            // Refresh tournament data
            const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
            if (tournamentResp.ok) {
                setCurrentTournament(await tournamentResp.json());
            }
            setCurrentView('viewTournamentPlayers');
            renderApp();
        } catch (error: any) {
            Modal.show(`Failed to update player: ${error.message}`);
        }
    });
}

export function attachSortHandlers() {
    document.getElementById('sortByName')?.addEventListener('click', () => {
        if (getPlayerSortColumn() === 'name') {
            setPlayerSortDirection(getPlayerSortDirection() === 'asc' ? 'desc' : 'asc');
        } else {
            setPlayerSortColumn('name');
            setPlayerSortDirection('asc');
        }
        renderTournamentPlayers();
    });

    document.getElementById('sortByRating')?.addEventListener('click', () => {
        if (getPlayerSortColumn() === 'rating') {
            setPlayerSortDirection(getPlayerSortDirection() === 'asc' ? 'desc' : 'asc');
        } else {
            setPlayerSortColumn('rating');
            setPlayerSortDirection('asc');
        }
        renderTournamentPlayers();
    });
}

export function attachPlayerTableListeners() {
    // Add player handler
    document.getElementById('addPlayerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentTournament = getCurrentTournament();

        if (!isTournament(currentTournament)) {
            Modal.show("Tournament not found.");
            return;
        }

        const addPlayerButton = document.getElementById('addPlayerButton') as HTMLButtonElement | null;
        if (!addPlayerButton || addPlayerButton.disabled) return;

        const playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
        const playerRatingInput = document.getElementById('playerRatingInput') as HTMLInputElement;

        const playerName = playerNameInput.value.trim();
        const playerRating = playerRatingInput.value.trim();

        if (!playerName || !playerRating) return;

        try {
            type PlayerCreate = Omit<Player, 'id'>;
            const playerData: PlayerCreate = {
                name: playerName,
                rating: Number(playerRating),
                tournament_id: currentTournament.id
            };
            await addPlayerToTournament(playerData);

            // Fetch updated tournament data
            const tournament : Tournament = await fetchTournament(currentTournament.id);
            setCurrentTournament(tournament);
            renderApp();

        } catch (error: any) {
            Modal.show(`Failed to create player: ${error.message}`)
        }
    });


    // Generate players
    const generateBtn = document.getElementById('generatePlayersButton') as HTMLButtonElement | null;
    if (generateBtn && !generateBtn.disabled) {
        generateBtn.addEventListener('click', async (e) => {
            const currentTournament = getCurrentTournament();
            if (!isTournament(currentTournament)) {
                Modal.show("Tournament not found.");
                return;
            }
            try {
                const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}/generate_players`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || error.message || 'Failed to generate players.');
                }

                const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
                if (tournamentResp.ok) {
                    setCurrentTournament(await tournamentResp.json());
                }
                renderTournamentPlayers();
            } catch (error: any) {
                Modal.show(`Failed to generate players: ${error.message}`);
            }
        });
    }


    const deleteAllBtn = document.getElementById('deleteAllPlayersButton') as HTMLButtonElement | null;
    if (deleteAllBtn && !deleteAllBtn.disabled) {
        deleteAllBtn.addEventListener('click', async (e) => {
            const currentTournament = getCurrentTournament();
            if (!isTournament(currentTournament)) {
                Modal.show("Tournament not found.");
                return;
            }
            if (!confirm('Are you sure you want to delete all players?')) return;
            try {
                await deleteAllPlayers(currentTournament.id);
                Modal.show("Players deleted successfully!");

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
                if (response.ok) {
                    setCurrentTournament(await response.json());
                }
                renderTournamentPlayers();
            } catch (error: any) {
                Modal.show(`Failed to delete players: ${error.message}`);
            }
        });
    }

    document.querySelectorAll('.delete-player-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const currentTournament = getCurrentTournament();
            const playerId = (btn as HTMLElement).getAttribute('data-player-id');
            if (!playerId) return;
            if (!confirm('Are you sure you want to delete this player?')) return;
            try {
                await deletePlayer(playerId);
                Modal.show('Player deleted successfully!');

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (response.ok) {
                    setCurrentTournament(await response.json());
                }
                await renderTournamentPlayers();
            } catch (error: any) {
                Modal.show(`Failed to delete player: ${error.message}`);
            }

        });
    });

    document.querySelectorAll('.update-player-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playerId = Number((btn as HTMLElement).getAttribute('data-player-id'));
            renderUpdatePlayer(playerId);
        });
    });

}