import { getChallenges, acceptChallenge, declineChallenge } from '../../api/lichessAPI.js';

import { Modal } from "../../utils/general.js";

import { renderLichess } from './lichess.js';

import { cancelChallenge, challengeAI, createChallenge } from '../../api/lichessAPI.js';


async function renderChallenges() {
    const challengesDiv = document.getElementById('challengesToAcceptSection');
    if (!challengesDiv) return;
    challengesDiv.innerHTML = ''; // Clear previous

    try {
        const result = await getChallenges();
        const challenges = result.data.in || [];

        // Always render heading and refresh button
        challengesDiv.innerHTML = `
            <div class="flex items-center mb-2">
                <h3 class="text-xl font-bold mr-2">Incoming Challenges</h3>
                <button id="refreshChallengesBtn" class="ml-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded" title="Refresh">
                    &#x21bb;
                </button>
            </div>
            <table class="min-w-full divide-y divide-gray-200 mb-4">
                <thead>
                    <tr>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Speed</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                        challenges.length > 0
                        ? challenges.map((challenge: any) => `
                            <tr class="bg-white border-b">
                                <td class="font-semibold text-center">${challenge.challenger.name}</td>
                                <td class="font-semibold text-center">${challenge.challenger.rating ?? 'N/A'}</td>
                                <td class="font-semibold text-center">${challenge.speed ?? 'N/A'}</td>
                                <td class="font-semibold text-center">
                                    <button class="accept-challenge-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded" data-challenge-id="${challenge.id}">Accept</button>
                                    <button class="decline-challenge-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded" data-challenge-id="${challenge.id}">Decline</button>
                                </td>
                            </tr>
                        `).join('')
                        : `<tr><td colspan="4" class="text-center text-gray-400 py-4">No incoming challenges.</td></tr>`
                    }
                </tbody>
            </table>
        `;

        // Attach refresh handler
        document.getElementById('refreshChallengesBtn')?.addEventListener('click', async () => {
            await renderChallenges();
        });

        // Attach event listeners for accept/decline
        challengesDiv.querySelectorAll('.accept-challenge-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const challengeId = (e.currentTarget as HTMLElement).getAttribute('data-challenge-id');
                try {
                    await acceptChallenge(challengeId!);
                    Modal.show("Challenge accepted!");
                    await renderLichess();
                } catch (error: any) {
                    Modal.show("Failed to accept challenge: " + error.message);
                }
            });
        });
        challengesDiv.querySelectorAll('.decline-challenge-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const challengeId = (e.currentTarget as HTMLElement).getAttribute('data-challenge-id');
                try {
                    await declineChallenge(challengeId!);
                    Modal.show("Challenge declined.");
                    await renderLichess();
                } catch (error: any) {
                    Modal.show("Failed to decline challenge: " + error.message);
                }
            });
        });
    } catch (error: any) {
        challengesDiv.innerHTML = `<div class="text-red-600">Failed to load challenges: ${error.message}</div>`;
    }
}

async function renderChallengePlayers() {
    // Fetch outgoing challenges
    let outgoingChallenges: any[] = [];
    try {
        const result = await getChallenges();
        outgoingChallenges = result.data.out || [];
    } catch (error) {
        // handle error or leave outgoingChallenges empty
    }

    let outgoingTable = '';
    if (outgoingChallenges.length > 0) {
        outgoingTable = `
            <h3 class="text-xl font-bold mb-2">Outgoing Challenges</h3>
            <table class="min-w-full divide-y divide-gray-200 mb-4">
                <thead>
                    <tr>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Opponent</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Speed</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${outgoingChallenges.map((challenge: any) => `
                        <tr class="bg-white border-b">
                            <td class="font-semibold text-center">${challenge.destUser.name}</td>
                            <td class="font-semibold text-center">${challenge.destUser?.rating ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${challenge.speed ?? 'N/A'}</td>
                            <td class="font-semibold text-center">
                                <button class="cancel-challenge-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded" data-challenge-id="${challenge.id}">Cancel</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

   const content = `
        <h2 class="text-2xl font-bold mb-2 text-center">Challenge another player</h2>
        <form id="challengePlayer" class="space-y-3 mb-8">
            <div>
                <label class="block text-gray-700 font-semibold mb-1" for="challengePlayerInput">Name</label>
                <input id="challengePlayerInput" type="text" class="w-full px-3 py-2 border rounded" placeholder="Enter username (or LichessAI to play against an AI)" required>
            </div>
            <div class="flex justify-end">
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
                    Challenge
                </button>
            </div>
        </form>
        ${outgoingTable}
    `

    // Render content
    const container = document.getElementById('challengePlayersSection');
    if (container) container.innerHTML = content;

    // Attach cancel handlers
    document.querySelectorAll('.cancel-challenge-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const challengeId = (e.currentTarget as HTMLElement).getAttribute('data-challenge-id');
            try {
                await cancelChallenge(challengeId!);
                Modal.show("Challenge canceled.");
                await renderLichess();
            } catch (error: any) {
                Modal.show("Failed to cancel challenge: " + error.message);
            }
        });
    });

    document.getElementById("challengePlayer")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = (document.getElementById("challengePlayerInput") as HTMLInputElement).value.trim();
        try {
            if (username === "LichessAI")
                await challengeAI();
            else
                await createChallenge(username);
            Modal.show("Challenge sent succesfully!");
            await renderChallengePlayers();
        } catch (error: any) {
            Modal.show("Failed to send challenge: " + error.message);
        }
    });

}

export async function renderChallengeTab() {
    // const tab = (window as any).lichessTab;
    const container = document.getElementById('lichessTabContent');
    if (!container) return;

    let content = `
        <div id="challengePlayersSection"></div>
        <div id="challengesToAcceptSection" class="mb-8"></div>
    `;
    container.innerHTML = content;
    await renderChallengePlayers();
    await renderChallenges();
}