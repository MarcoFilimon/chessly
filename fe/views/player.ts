import {
    setCurrentView,
    getCurrentTournament,
    setCurrentTournament,
    getToken
} from '../state'

import {
    apiFetch,
    fastApiBaseUrl,
} from '../api'

import {showModal, isTournament} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'

export function renderUpdatePlayer(playerId: number): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        showModal("Tournament not found.");
        setCurrentView('viewTournamentPlayers');
        renderApp();
        return;
    }

    const player = currentTournament.players.find(p => p.id === playerId);
    if (!player) {
        showModal("Player not found.");
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
                showModal("Tournament not found.");
                return;
            }

            showModal("Player updated successfully!");
            // Refresh tournament data
            const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
            if (tournamentResp.ok) {
                setCurrentTournament(await tournamentResp.json());
            }
            setCurrentView('viewTournamentPlayers');
            renderApp();
        } catch (error: any) {
            showModal(`Failed to update player: ${error.message}`);
        }
    });
}