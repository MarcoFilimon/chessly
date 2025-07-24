import {
    getCurrentView,
    setPlayerSortColumn,
    setPlayerSortDirection,
    getPlayerSortColumn,
    getPlayerSortDirection,
    getToken,
    setCurrentTournament,
    getCurrentTournament
} from '../state'

import {
    addPlayerToTournament,
    apiFetch,
    fastApiBaseUrl,
    fetchTournament,
    deleteAllPlayers,
    deletePlayer
} from '../api'

import {isTournament, showModal, getSortedPlayers} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'
import {Player, TournamentStatus, Tournament} from '../types'
import {renderUpdatePlayer} from './player'
import {attachTabNavigationHandlers} from './navigation'


function attachSortHandlers() {
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

function attachPlayerTableListeners() {
    // Add player handler
    document.getElementById('addPlayerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentTournament = getCurrentTournament();

        if (!isTournament(currentTournament)) {
            showModal("Tournament not found.");
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
            showModal(`Failed to create player: ${error.message}`)
        }
    });


    // Generate players
    const generateBtn = document.getElementById('generatePlayersButton') as HTMLButtonElement | null;
    if (generateBtn && !generateBtn.disabled) {
        generateBtn.addEventListener('click', async (e) => {
            const currentTournament = getCurrentTournament();
            if (!isTournament(currentTournament)) {
                showModal("Tournament not found.");
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
                showModal(`Failed to generate players: ${error.message}`);
            }
        });
    }


    const deleteAllBtn = document.getElementById('deleteAllPlayersButton') as HTMLButtonElement | null;
    if (deleteAllBtn && !deleteAllBtn.disabled) {
        deleteAllBtn.addEventListener('click', async (e) => {
            const currentTournament = getCurrentTournament();
            if (!isTournament(currentTournament)) {
                showModal("Tournament not found.");
                return;
            }
            if (!confirm('Are you sure you want to delete all players?')) return;
            try {
                await deleteAllPlayers(currentTournament.id);
                showModal("Players deleted successfully!");

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
                if (response.ok) {
                    setCurrentTournament(await response.json());
                }
                renderTournamentPlayers();
            } catch (error: any) {
                showModal(`Failed to delete players: ${error.message}`);
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
                showModal('Player deleted successfully!');

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (response.ok) {
                    setCurrentTournament(await response.json());
                }
                await renderTournamentPlayers();
            } catch (error: any) {
                showModal(`Failed to delete player: ${error.message}`);
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

function renderPlayerRow(player: Player, idx: number, canEdit: boolean): string {
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


export async function renderTournamentPlayers(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!isTournament(currentTournament)) {
        showModal("Tournament not found.");
        return;
    }

    // Tab button classes
    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    const playersCount = currentTournament.players?.length ?? 0;
    const maxPlayersReached = playersCount >= currentTournament.nb_of_players;

    appContent.innerHTML = `
            <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
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
                    <h3 class="text-xl font-semibold mb-4">Players</h3>
                    <div class="overflow-x-auto mb-4">
                        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr>
                                    <th class="px-4 py-2 border-b text-left">#</th>
                                    <th class="px-4 py-2 border-b text-left cursor-pointer" id="sortByName">
                                        Name
                                        ${getPlayerSortColumn() === 'name' ? (getPlayerSortDirection() === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th class="px-4 py-2 border-b text-left cursor-pointer" id="sortByRating">
                                        Rating
                                        ${getPlayerSortColumn() === 'rating' ? (getPlayerSortDirection() === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="playerTableBody">
                                <!-- Player rows will be rendered here -->
                            </tbody>
                        </table>
                    </div>
                    <form id="addPlayerForm" class="flex gap-2 mb-4">
                        <input type="text" id="playerNameInput" class="flex-1 px-1 py-1 border rounded" placeholder="Name" required>
                        <input type="number" id="playerRatingInput" class="flex-1 px-1 py-1 border rounded" placeholder="Rating" required>
                        <button
                            type="submit"
                            id="addPlayerButton"
                            class="${maxPlayersReached || currentTournament.status !== "Not Started"
                                ? "bg-gray-400 text-gray-600 font-bold py-2 px-4 rounded-lg shadow-md cursor-not-allowed opacity-60"
                                : "bg-blue-600 text-white px-4 py-1 rounded"}"
                            ${maxPlayersReached || currentTournament.status !== "Not Started" ? "disabled" : ""}
                        >
                            ${maxPlayersReached ? "Max Players" : "Add Player"}
                        </button>
                    </form>
                    <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                        Back to Tournaments
                    </button>
                    ${(currentTournament.status === "Not Started")
                        ?   `<button id="generatePlayersButton"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200
                                    ${maxPlayersReached ? 'cursor-not-allowed opacity-60 bg-green-400 hover:bg-green-400' : ''}"
                                    ${maxPlayersReached ? 'disabled' : ''}>
                                Generate
                            </button>
                            <button id="deleteAllPlayersButton" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                                Delete all
                            </button>`
                        :   `<button id="generatePlayersButton" class="bg-green-400 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 cursor-not-allowed opacity-60" disabled>
                                Generate
                            </button>
                            <button id="deleteAllPlayersButton" class="bg-red-400 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 cursor-not-allowed opacity-60" disabled>
                                Delete all
                            </button>`
                    }
                </div>
            </div>
        `;

    const sortedPlayers = getSortedPlayers(
        currentTournament.players || [],
        getPlayerSortColumn(),
        getPlayerSortDirection()
    );

    // Render players in the table
    const playerTableBody = document.getElementById('playerTableBody');
    if (playerTableBody) {
        playerTableBody.innerHTML = sortedPlayers
            .map((player, idx) => renderPlayerRow(player, idx, currentTournament!.status === TournamentStatus.NotStarted))
            .join('');
    }

    // Render players (if any)
    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = sortedPlayers
            .map((player: any) => `<li>${player.name} (Rating: ${player.rating})</li>`)
            .join('');
    }

    attachSortHandlers();
    attachPlayerTableListeners();
    attachTabNavigationHandlers();
}