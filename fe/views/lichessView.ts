import { appContent } from "../dom.js";
import { getLichessUserInfo, getOngoingGames, makeMove} from '../api/lichessAPI.js'
import { Modal } from "../utils/general.js";

declare global {
    interface Window {
        Chessboard: any;
    }
}

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
        gamesListDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opponent</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Playing as</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Game Link</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Go Play</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map((game: any) => {
                        const opponent = game.opponent;
                        const opponentName = opponent.username;
                        const opponentRating = opponent.rating;
                        const opponentProfile = `https://lichess.org/@/${opponentName}`;
                        return `
                            <tr class="bg-white border-b">
                                <td class="px-4 py-2">
                                    <a href="${opponentProfile}" target="_blank" class="text-blue-600 underline">
                                        ${opponentName}
                                    </a>
                                </td>
                                <td class="px-4 py-2">${opponentRating}</td>
                                <td class="px-4 py-2">${game.color}</td>
                                <td class="px-4 py-2">
                                    <a href="https://lichess.org/${game.fullId}" target="_blank" class="text-blue-600 underline">View</a>
                                </td>
                                <td class="px-4 py-2">
                                    <button type="button" class="go-play-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded" data-game-id="${game.fullId}">
                                        Go Play
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Attach event listeners for "Go Play" buttons
        document.querySelectorAll('.go-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = (e.currentTarget as HTMLElement).getAttribute('data-game-id');
                const game = games.find((g: any) => g.fullId === gameId);
                if (game) {
                    renderGameBoard(game);
                }
            });
        });
    } catch (error: any) {
        gamesListDiv.innerHTML = `<div class="text-red-600">Failed to load games: ${error.message}</div>`;
    }
}

function renderGameBoard(game: any) {
    appContent.innerHTML = `
        <div class="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <button id="backToGamesBtn" class="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-4 rounded">
                ← Back to Games
            </button>
            <h2 class="text-2xl font-bold mb-4 text-center">Game vs
                <a href="https://lichess.org/@/${game.opponent.username}" target="_blank" class="text-blue-600 underline">
                    ${game.opponent.username}
                </a>
            </h2>
            <div class="flex flex-col items-center mb-4">
                <div id="board-${game.fullId}" style="width: 400px"></div>
                <div class="mt-4 flex gap-2">
                    <input type="text" id="moveInput" class="px-4 py-2 border rounded" placeholder="Enter move (UCI, e.g. e2e4)">
                    <button id="sendMoveBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Send Move</button>
                </div>
            </div>
            <div class="text-center text-gray-600">
                <span>Playing as: <strong>${game.color}</strong></span>
                <span class="ml-4">Game: <a href="https://lichess.org/${game.fullId}" target="_blank" class="text-blue-600 underline">${game.fullId}</a></span>
            </div>
        </div>
    `;

    try {
        const my_chess = new Chess(game.fen || 'start');
        const board = window.Chessboard(`board-${game.fullId}`, {
            position: my_chess.fen(),
            draggable: true,
            onDrop: (source: string, target: string) => {
                const move = my_chess.move({ from: source, to: target, promotion: 'q' });
                if (move === null) return 'snapback';
                // Optionally send move to backend here
                board.position(my_chess.fen()); // Update board after valid move
            }
        });
        console.log(`Chessboard initialized for game ${game.fullId}`); // Add a log for debugging
    } catch (error) {
        console.error("Error initializing Chessboard:", error);
        // You might want to display a user-friendly error message here
        Modal.show("Failed to load chess board. Please check console for details.");
    }


    // Back button event
    // Attach event listeners AFTER the HTML is in the DOM
    document.getElementById('backToGamesBtn')?.addEventListener('click', async () => {
        await renderLichess();
    });

    // Send move event
    document.getElementById('sendMoveBtn')?.addEventListener('click', async () => {
        const move = (document.getElementById('moveInput') as HTMLInputElement).value.trim();
        if (!move) {
            Modal.show("Please enter a move in UCI format (e.g. e2e4)");
            return;
        }
        try {
            await makeMove(game.fullId, move);
            Modal.show("Move sent!");
            // Optionally, update the board position here or re-fetch game state
        } catch (error: any) {
            Modal.show("Failed to send move: " + error.message);
        }
    });
}