import {
    setCurrentView,
    getCurrentView,
    getCurrentTournament,
    setCurrentTournament,
    getToken,
    getTournaments,
    setSelectedRoundIdx
} from '../state.js'

import {
    apiFetch,
    fastApiBaseUrl,
    deleteTournament,
    createTournament
} from '../api.js'

import {
    tabActive,
    tabInactive,
    tabBase
} from './navigationUtils.js'


import {TournamentStatus, Tournament} from '../types.js'
import {Modal, formatDate} from './general.js'
import {renderApp} from '../views/home.js'
import {renderTournamentGames} from '../views/tournamentGames.js'
import {renderViewTournaments} from '../views/tournament.js'
import {appContent} from '../dom.js'

export function isTournament(obj: unknown): obj is Tournament {
    return typeof obj === "object" && obj !== null &&
        "id" in obj && typeof (obj as any).id === "number" &&
        "status" in obj && typeof (obj as any).status === "string";
}

export function attachStartEndTournamentHandlers() {
    // Start Tournament button logic
    document.getElementById('startTournamentBtn')?.addEventListener('click', async () => {
        const currentTournament = getCurrentTournament();
        if (!isTournament(currentTournament)) {
            Modal.show("Tournament not found.");
            return;
        }

        // Check if all players have been created
        const players = currentTournament.players || [];
        if (players.length < currentTournament.nb_of_players) {
            Modal.show(`You need to add all ${currentTournament.nb_of_players} players before starting the tournament.`);
            setCurrentView('viewTournamentPlayers');
            renderApp();
            return;
        }
        try {
            const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to start tournament.');
            }
            Modal.show("Tournament started! All rounds have been generated.");

            // Refresh tournament data
            setCurrentTournament(await response.json());
            setSelectedRoundIdx(0);
            setCurrentView('viewTournamentGames');
            renderApp();

            // Frontend is rendering before the backend has finished generating/populating all matchups for the last round
            // Add this to force a refetch after a short delay:
            setTimeout(async () => {
                const resp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (resp.ok) {
                    setCurrentTournament(await resp.json());
                    // If you're still on games view, re-render
                    if (getCurrentView() === 'viewTournamentGames') {
                        renderTournamentGames();
                    }
                }
            }, 300); // 300ms delay, adjust as needed
        } catch (error: any) {
            Modal.show(`Failed to start tournament: ${error.message}`);
        }
    });

    // End Tournament button logic
    document.getElementById('finishTournamentBtn')?.addEventListener('click', async () => {
        const currentTournament = getCurrentTournament();
        if (!isTournament(currentTournament)) {
            Modal.show("Tournament not found.");
            return;
        }

        try {
            currentTournament.status = TournamentStatus.Finished
            const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(currentTournament)
            });
            if (!response.ok) {
                currentTournament.status = TournamentStatus.Ongoing
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to end the tournament.');
            }
            Modal.show("Tournament ended! See the results.");
            setCurrentView('viewTournamentResults');
            renderApp();
        } catch (error: any) {
            Modal.show(`Failed to end the tournament: ${error.message}`);
        }
    });
}

function renderUpdateTournament(): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        Modal.show("Tournament not found.");
        setCurrentView('viewTournaments');
        renderApp();
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Update Tournament</h2>
            ${renderTournamentForm({
                formId: 'updateTournamentForm',
                submitLabel: 'Update Tournament',
                initial: currentTournament,
                cancelBtnId: 'cancelUpdateBtn'
            })}
        </div>
    `;

    document.getElementById('cancelUpdateBtn')?.addEventListener('click', () => {
        setCurrentView('viewTournaments');
        renderApp();
    });

    document.getElementById('updateTournamentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = getTournamentFormValues();
        try {
            type TournamentUpdate = Omit<Tournament, 'id' | 'players' | 'status' | 'rounds'>;
            if (!isTournament(currentTournament)) {
                Modal.show("Tournament not found.");
                return;
            }
            const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(values as TournamentUpdate)
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.detail && Array.isArray(error.detail)) {
                    const messages = error.detail.map((e: any) => e.msg).join('; ');
                    throw new Error(messages);
                }
                throw new Error(error.detail || error.message || 'Failed to update tournament.');
            }

            Modal.show("Tournament updated successfully!");
            setCurrentView('viewTournaments');
            renderApp();
        } catch (error: any) {
            Modal.show(`Failed to update tournament: ${error.message}`);
        }
    });
}

export function attachTournamentOperationListeners() {
    // Tab switching logic
    document.getElementById('notStartedTab')?.addEventListener('click', () => {
        (window as any).tournamentTab = 'Not Started';
        renderViewTournaments();
    });
    document.getElementById('ongoingTab')?.addEventListener('click', () => {
        (window as any).tournamentTab = 'Ongoing';
        renderViewTournaments();
    });
    document.getElementById('finishedTab')?.addEventListener('click', () => {
        (window as any).tournamentTab = 'Finished';
        renderViewTournaments();
    });

    document.getElementById('createTournamentBtnHome')?.addEventListener('click', () => { setCurrentView('createTournament') ; renderApp(); });
    document.getElementById('backToHomeBtnView')?.addEventListener('click', () => { setCurrentView('home') ; renderApp(); });

    // Render a specific tournament
    document.querySelectorAll('.tournament-card').forEach(card => {
        card.addEventListener('click', () => {
            const tournamentId = (card as HTMLElement).getAttribute('data-tournament-id');
            if (!tournamentId) return;
            const tournaments = getTournaments();
            setCurrentTournament(tournaments.find(t => t.id == Number(tournamentId)) || null);
            setCurrentView('viewTournamentDetail');
            renderApp();
        });
    });

    // Handle tournament deletion
    document.querySelectorAll('.delete-tournament-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent triggering the card click event
            const tournamentId = (btn as HTMLElement).getAttribute('data-tournament-id');
            if (!tournamentId) return;
            if (!confirm('Are you sure you want to delete this tournament?')) return;
            try {
                await deleteTournament(tournamentId);
                // Refresh the tournaments list
                await renderViewTournaments();
            } catch (error: any) {
                Modal.show(`Failed to delete tournament: ${error.message}`);
            }
        });
    });

    // Handle tournament updating
    document.querySelectorAll('.update-tournament-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tournamentId = (btn as HTMLElement).getAttribute('data-tournament-id');
            if (!tournamentId) return;
            const tournaments = getTournaments();
            setCurrentTournament(tournaments.find(t => t.id == Number(tournamentId)) || null);
            try {
                renderUpdateTournament();
            }
            catch(error: any) {
                Modal.show(`Failed to update tournament: ${error.message}`);
            }
        });
    });
}

export function attachTournamentCreateListeners() {
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => {
        setCurrentView('home');
        renderApp();
    });

    document.getElementById('createTournamentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const values = getTournamentFormValues();
        try {
            type TournamentCreate = Omit<Tournament, 'id' | 'players' | 'status' | 'rounds'>;
            setCurrentTournament(await createTournament(values as TournamentCreate));
            setCurrentView('viewTournamentDetail');
            renderApp();
        } catch (error: any) {
            Modal.show(`Failed to create tournament: ${error.message}`);
        }
    });

    document.getElementById('generateTournament')?.addEventListener('click', (e) => {
        e.preventDefault();
        (document.getElementById('tournamentName') as HTMLInputElement).value = `Chessly Cup ${Math.floor(Math.random() * 1000)}`;
        (document.getElementById('tournamentStartDate') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
        (document.getElementById('tournamentEndDate') as HTMLInputElement).value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        (document.getElementById('tournamentLocation') as HTMLInputElement).value = ["Online", "Iasi", "Bucuresti", "Galati"][Math.floor(Math.random() * 4)];
        (document.getElementById('tournamentNbofPlayers') as HTMLInputElement).value = String(Math.floor(Math.random() * 10) + 2);
        (document.getElementById('tournamentTimeControl') as HTMLSelectElement).value = ["Bullet", "Blitz", "Rapid", "Classical"][Math.floor(Math.random() * 4)];
        (document.getElementById('tournamentFormat') as HTMLSelectElement).value = ["Round-Robin", "Double-Round-Robin"][Math.floor(Math.random() * 2)];
    });
}

export function renderTournamentForm(options: {
    formId: string,
    submitLabel: string,
    initial?: Partial<Tournament>,
    showGenerate?: boolean,
    cancelBtnId: string
}) {
    const t = options.initial || {};
    return `
        <form id="${options.formId}" class="space-y-6">
            <div>
                <label for="tournamentName" class="block text-gray-700 text-sm font-semibold mb-2">Tournament Name</label>
                <input
                    type="text"
                    id="tournamentName"
                    name="name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value="${t.name || ''}"
                    placeholder="e.g., Grand Chess Championship"
                    required
                >
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label for="tournamentStartDate" class="block text-gray-700 text-sm font-semibold mb-2">Start Date</label>
                    <input
                        type="date"
                        id="tournamentStartDate"
                        name="date"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${t.start_date || ''}"
                        required
                    >
                </div>
                <div>
                    <label for="tournamentEndDate" class="block text-gray-700 text-sm font-semibold mb-2">End Date</label>
                    <input
                        type="date"
                        id="tournamentEndDate"
                        name="date"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${t.end_date || ''}"
                        required
                    >
                </div>
            </div>
            <div>
                <label for="tournamentLocation" class="block text-gray-700 text-sm font-semibold mb-2">Location</label>
                <input
                    type="text"
                    id="tournamentLocation"
                    name="location"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value="${t.location || ''}"
                    placeholder="e.g., Online, Local Chess Club"
                    required
                >
            </div>
            <div>
                <label for="tournamentNbofPlayers" class="block text-gray-700 text-sm font-semibold mb-2">Nb. of Players</label>
                <input type="number" id="tournamentNbofPlayers" class="flex-1 px-1 py-1 border rounded" value="${t.nb_of_players || ''}" placeholder="min. 2 / max. 64" required>
            </div>
            <div>
                <label for="tournamentTimeControl" class="block text-gray-700 text-sm font-semibold mb-2">Time Control</label>
                <select
                    id="tournamentTimeControl"
                    name="time_control"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
                    <option value="">Select time control</option>
                    <option value="Bullet" ${t.time_control === "Bullet" ? "selected" : ""}>Bullet</option>
                    <option value="Blitz" ${t.time_control === "Blitz" ? "selected" : ""}>Blitz</option>
                    <option value="Rapid" ${t.time_control === "Rapid" ? "selected" : ""}>Rapid</option>
                    <option value="Classical" ${t.time_control === "Classical" ? "selected" : ""}>Classical</option>
                </select>
            </div>
            <div>
                <label for="tournamentFormat" class="block text-gray-700 text-sm font-semibold mb-2">Format</label>
                <select
                    id="tournamentFormat"
                    name="tournament_format"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
                    <option value="">Select format</option>
                    <option value="Round-Robin" ${t.format === "Round-Robin" ? "selected" : ""}>Round-Robin</option>
                    <option value="Double-Round-Robin" ${t.format === "Double-Round-Robin" ? "selected" : ""}>Double-Round-Robin</option>
                </select>
            </div>
            <div class="flex justify-end gap-4">
                <button type="button" id="${options.cancelBtnId}" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                    Cancel
                </button>
                ${options.showGenerate ? `<button id="generateTournament" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">Generate</button>` : ""}
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                    ${options.submitLabel}
                </button>
            </div>
        </form>
    `;
}

export function getTournamentFormValues() {
    return {
        name: (document.getElementById('tournamentName') as HTMLInputElement).value,
        start_date: (document.getElementById('tournamentStartDate') as HTMLInputElement).value,
        end_date: (document.getElementById('tournamentEndDate') as HTMLInputElement).value,
        location: (document.getElementById('tournamentLocation') as HTMLInputElement).value,
        nb_of_players: Number((document.getElementById('tournamentNbofPlayers') as HTMLInputElement).value),
        time_control: (document.getElementById('tournamentTimeControl') as HTMLSelectElement).value,
        format: (document.getElementById('tournamentFormat') as HTMLSelectElement).value,
    };
}

export function renderTournamentsTabContent() {
    // Track which tab is active
    let tournamentTab = (window as any).tournamentTab || 'Not Started';
    let tournamentsHtml = '';

    const normalizeStatus = (status: string) => status.replace(/[\s_]/g, '').toLowerCase();

    const filtered = getTournaments().filter(t => {
        const status = normalizeStatus(t.status);
        if (tournamentTab === "Not Started") return status === "notstarted";
        if (tournamentTab === "Ongoing") return status === "ongoing";
        if (tournamentTab === "Finished") return status === "finished";
        return true;
    });

    if (filtered.length === 0 && tournamentTab === "Not Started") {
        tournamentsHtml = `
            <div class="flex flex-col items-center justify-center gap-4">
                <p class="text-center text-gray-600">No tournaments in this category.</p>
                <button id="createTournamentBtnHome" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                    Create New Tournament
                </button>
            </div>
        `;
    } else if (filtered.length === 0 && tournamentTab !== "Not Started") {
        tournamentsHtml = `
            <div class="flex flex-col items-center justify-center gap-4">
                <p class="text-center text-gray-600">No tournaments in this category.</p>
            </div>
        `;
    } else {
        tournamentsHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${filtered.map(tournament => `
                    <div class="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200 cursor-pointer tournament-card"
                    data-tournament-id="${tournament.id}">
                        <h3 class="text-xl font-semibold text-gray-800 mb-2">${tournament.name}</h3>
                        <p class="text-gray-600 text-sm mb-1"><strong>Start:</strong> ${formatDate(tournament.start_date)}</p>
                        <p class="text-gray-600 text-sm mb-1"><strong>End:</strong> ${formatDate(tournament.end_date)}</p>
                        <p class="text-gray-600 text-sm mb-1"><strong>Location:</strong> ${tournament.location}</p>
                        <p class="text-gray-600 text-sm mb-1"><strong>Nb. of Players:</strong> ${tournament.nb_of_players}</p>
                        <p class="text-gray-600 text-sm mb-1"><strong>Time Control:</strong> ${tournament.time_control}</p>
                        <p class="text-gray-600 text-sm mb-1"><strong>Format:</strong> ${tournament.format}</p>
                        <div class="mt-4 flex gap-4">
                            ${(tournament.status === "Not Started") ? `
                            <button type="button" class="update-tournament-btn" data-tournament-id="${tournament.id}" title="Update">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500 hover:text-blue-700 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l3.586 3.586a1 1 0 010 1.414L13 17H9v-4z" />
                                </svg>
                            </button>
                            ` : ""
                            }
                            <button type="button" class="delete-tournament-btn" data-tournament-id="${tournament.id}" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 hover:text-red-700 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    const tournaments = getTournaments();
    const notStartedCount = tournaments.filter(t => normalizeStatus(t.status) === "notstarted").length;
    const ongoingCount = tournaments.filter(t => normalizeStatus(t.status) === "ongoing").length;
    const finishedCount = tournaments.filter(t => normalizeStatus(t.status) === "finished").length;

    // Tabs HTML
    tournamentsHtml = `
        <div class="flex gap-2 mb-6">
            <button id="notStartedTab" class="${tabBase} ${tournamentTab === 'Not Started' ? tabActive : tabInactive}">
                Not Started (${notStartedCount})
            </button>
            <button id="ongoingTab" class="${tabBase} ${tournamentTab === 'Ongoing' ? tabActive : tabInactive}">
                Ongoing (${ongoingCount})
            </button>
            <button id="finishedTab" class="${tabBase} ${tournamentTab === 'Finished' ? tabActive : tabInactive}">
                Finished (${finishedCount})
            </button>
        </div>
        ${tournamentsHtml}
    `;
    return tournamentsHtml;
}