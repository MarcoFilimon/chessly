import { appContent } from "../dom.js";
import { getLichessUserInfo, getOngoingGames, makeMove} from '../api/lichessAPI.js'
import { Modal } from "../utils/general.js";

let gamesInterval: number | undefined;

export async function renderLichess() {
    appContent.innerHTML = `
        <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-50 mb-4"></div>
            <span class="text-lg text-gray-600">Loading Lichess profile...</span>
        </div>
    `;
    try {
        const profile = await getLichessUserInfo();

        appContent.innerHTML = `
            <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-6 text-center">Lichess Profile</h2>
                <div class="space-y-4 mb-8">
                    <div>
                        <span class="font-semibold">Username:</span>
                        <a href="${profile.data.url}" target="_blank" class="text-blue-600 underline">${profile.data.username}</a>
                    </div>
                    <div>
                        <span class="font-semibold">Created At:</span>
                        ${profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                        <span class="font-semibold">Blitz Rating:</span>
                        ${profile.data.perfs?.blitz?.rating ?? 'N/A'}
                    </div>
                </div>
                <div id="lichessGamesSection">
                    <h3 class="text-xl font-bold mb-2">Ongoing Games</h3>
                    <div id="lichessGamesList" class="space-y-2"></div>
                </div>
            </div>
        `;

    // Initial render of games
    await renderOngoingGames();

    // // Clear previous interval if any
    // if (gamesInterval) clearInterval(gamesInterval);

    // // Auto-refresh ongoing games every 10 seconds
    // gamesInterval = window.setInterval(renderOngoingGames, 10000);
    } catch (error: any) {
        Modal.show("Lichess error: " + error.message);
    }
}

async function renderOngoingGames() {
    const gamesListDiv = document.getElementById('lichessGamesList');
    if (!gamesListDiv) return;
    gamesListDiv.innerHTML = `<div class="text-gray-500">Loading games...</div>`;
    try {
        const result = await getOngoingGames();
        if (!result.data.nowPlaying || result.data.nowPlaying.length === 0) {
            gamesListDiv.innerHTML = `<div class="text-gray-500">No ongoing games.</div>`;
            return;
        }
        const games = result.data.nowPlaying;
        gamesListDiv.innerHTML = games.map((game: any) => {
            const opponent = game.opponent;
            const opponentName = opponent.username;
            const opponentRating = opponent.rating;
            const opponentProfile = `https://lichess.org/@/${opponentName}`;
            // Unique IDs for input and button
            return `
                <div class="p-2 border rounded flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <a href="${opponentProfile}" target="_blank" class="text-blue-600 underline">
                            Opponent: ${opponentName} (${opponentRating})
                        </a>
                        <span>Playing as: ${game.color}</span>
                        <a href="https://lichess.org/${game.fullId}" target="_blank" class="text-blue-600 underline">Game link</a>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input
                            type="text"
                            id="moveToMake-${game.fullId}"
                            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter move (e.g. e4)"
                        >
                        <button type="button" id="sendMove-${game.fullId}" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                            Make move!
                        </button>

                    </div>
                    <div id="board-${game.fullId}" style="width: 400px"></div>
                </div>
            `;
        }).join('');

        // Attach event listeners for each move button
        games.forEach((game: any) => {
            // const boardDivId = `board-${game.fullId}`;
            // const boardDiv = document.getElementById(boardDivId);
            // if (boardDiv) {
            //     Chessboard(boardDivId, 'start');
            // }

            const btn = document.getElementById(`sendMove-${game.fullId}`);
            const input = document.getElementById(`moveToMake-${game.fullId}`) as HTMLInputElement;
            if (btn && input) {
                btn.addEventListener('click', async () => {
                    const moveStr = input.value.trim();
                    if (!moveStr) {
                        Modal.show("Please enter a move.");
                        return;
                    }
                    try {
                        await makeMove(game.fullId, moveStr);
                        input.value = "";
                    } catch (error: any) {
                        Modal.show("Failed to send move: " + error.message);
                    }
                });
            }
        });
    } catch (error: any) {
        gamesListDiv.innerHTML = `<div class="text-red-600">Failed to load games: ${error.message}</div>`;
    }
}
