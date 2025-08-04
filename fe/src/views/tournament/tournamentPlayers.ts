import {
    getPlayerSortColumn,
    getPlayerSortDirection,
    getCurrentTournament
} from '../../state.js'

import { Modal } from '../../utils/general.js'
import { isTournament } from '../../utils/tournamentUtils.js'
import {appContent} from '../../dom.js'
import {attachTournamentTabNavHandlers} from '../../utils/navigationUtils.js'
import { attachPlayerTableListeners, attachSortHandlers, renderPlayerRow, getSortedPlayers} from '../../utils/playerUtils.js'
import { renderTournamentTabs } from '../../utils/navigationUtils.js'

export async function renderTournamentPlayers(): Promise<void> {
    const currentTournament = getCurrentTournament();
    if (!isTournament(currentTournament)) {
        Modal.show("Tournament not found.");
        return;
    }

    const playersCount = currentTournament.players?.length ?? 0;
    const maxPlayersReached = playersCount >= currentTournament.nb_of_players;

    appContent.innerHTML = `
            <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
                ${renderTournamentTabs()}
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

    // Sort players
    const sortedPlayers = getSortedPlayers(
        currentTournament.players || [],
        getPlayerSortColumn(),
        getPlayerSortDirection()
    );

    // Render players in the table
    const playerTableBody = document.getElementById('playerTableBody');
    if (playerTableBody) {
        playerTableBody.innerHTML = sortedPlayers
            .map((player, idx) => renderPlayerRow(player, idx, currentTournament!.status === "Not Started"))
            .join('');
    }

    attachSortHandlers();
    attachPlayerTableListeners();
    attachTournamentTabNavHandlers();
}