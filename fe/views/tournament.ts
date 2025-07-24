import {
    setCurrentView,
    getCurrentTournament,
    setCurrentTournament,
    getToken,
    getUserId,
    setTournaments,
    getTournaments
} from '../state'

import {
    fastApiBaseUrl,
    createTournament,
    fetchTournaments,
    deleteTournament
} from '../api'

import {Tournament, TournamentTimeControl} from '../types'
import {showModal, formatDate, isTournament} from '../utils'
import {renderApp} from './home'
import {appContent} from '../dom'


function attachTournamentOperationListeners() {
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
                showModal(`Failed to delete tournament: ${error.message}`);
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
                showModal(`Failed to update tournament: ${error.message}`);
            }
        });
    });
}


async function handleSubmitNewTournament(e: Event): Promise<void> {
    e.preventDefault();

    const tournamentNameInput = document.getElementById('tournamentName') as HTMLInputElement;
    const tournamentStartDateInput = document.getElementById('tournamentStartDate') as HTMLInputElement;
    const tournamentEndDateInput = document.getElementById('tournamentEndDate') as HTMLInputElement;
    const tournamentLocationInput = document.getElementById('tournamentLocation') as HTMLInputElement;
    const tournamentNbOfPlayersInput = document.getElementById('tournamentNbofPlayers') as HTMLInputElement;
    const tournamentTCInput = document.getElementById('tournamentTimeControl') as HTMLSelectElement;
    const tournamentFormatInput = document.getElementById('tournamentFormat') as HTMLSelectElement;

    const tournamentName = tournamentNameInput.value;
    const tournamentStartDate = tournamentStartDateInput.value;
    const tournamentEndDate = tournamentEndDateInput.value;
    const tournamentLocation = tournamentLocationInput.value;
    const tournamentTC = tournamentTCInput.value;
    const tournamentFormat = tournamentFormatInput.value;
    const tournamentNbOfPlayers = tournamentNbOfPlayersInput.value;

   try {
        // Define a type for tournament creation
        // id , players and status are optional (created/set by the backend)
        type TournamentCreate = Omit<Tournament, 'id' | 'players' | 'status' | 'rounds'>;
        const tournamentData: TournamentCreate = {
            name: tournamentName,
            start_date: tournamentStartDate,
            end_date: tournamentEndDate,
            location: tournamentLocation,
            time_control: tournamentTC as TournamentTimeControl,
            format: tournamentFormat,
            nb_of_players: Number(tournamentNbOfPlayers)
        };

        setCurrentTournament(await createTournament(tournamentData));
        setCurrentView('viewTournamentDetail')
        renderApp();
    } catch (error: any) {
        // console.error("Error adding tournament:", error);
        showModal(`Failed to create tournament: ${error.message}`);
    }
}

function renderUpdateTournament(): void {
    const currentTournament = getCurrentTournament();
    if (!currentTournament) {
        showModal("Tournament not found.");
        setCurrentView('viewTournaments')
        renderApp();
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Update Tournament</h2>
            <form id="updateTournamentForm" class="space-y-6">
                <div>
                    <label for="updateTournamentName" class="block text-gray-700 text-sm font-semibold mb-2">Tournament Name</label>
                    <input
                        type="text"
                        id="updateTournamentName"
                        name="name"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${currentTournament.name || ''}"
                        required
                    >
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label for="updateTournamentStartDate" class="block text-gray-700 text-sm font-semibold mb-2">Start Date</label>
                        <input
                            type="date"
                            id="updateTournamentStartDate"
                            name="date"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value="${currentTournament.start_date || ''}"
                            required
                        >
                    </div>
                    <div>
                        <label for="updateTournamentEndDate" class="block text-gray-700 text-sm font-semibold mb-2">End Date</label>
                        <input
                            type="date"
                            id="updateTournamentEndDate"
                            name="date"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value="${currentTournament.end_date || ''}"
                            required
                        >
                    </div>
                </div>
                <div>
                    <label for="updateTournamentLocation" class="block text-gray-700 text-sm font-semibold mb-2">Location</label>
                    <input
                        type="text"
                        id="updateTournamentLocation"
                        name="location"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value="${currentTournament.location || ''}"
                        required
                    >
                </div>
                <div>
                    <label for="updateTournamentNbofPlayers" class="block text-gray-700 text-sm font-semibold mb-2">Nb. of Players</label>
                    <input
                        type="number"
                        id="updateTournamentNbofPlayers"
                        class="flex-1 px-1 py-1 border rounded"
                        value="${currentTournament.nb_of_players || ''}"
                        required
                    >
                </div>
                <div>
                    <label for="updateTournamentTimeControl" class="block text-gray-700 text-sm font-semibold mb-2">Time Control</label>
                    <select
                        id="updateTournamentTimeControl"
                        name="time_control"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select time control</option>
                        <option value="Bullet" ${currentTournament.time_control === "Bullet" ? "selected" : ""}>Bullet</option>
                        <option value="Blitz" ${currentTournament.time_control === "Blitz" ? "selected" : ""}>Blitz</option>
                        <option value="Rapid" ${currentTournament.time_control === "Rapid" ? "selected" : ""}>Rapid</option>
                        <option value="Classical" ${currentTournament.time_control === "Classical" ? "selected" : ""}>Classical</option>
                    </select>
                </div>
                <div>
                    <label for="updateTournamentFormat" class="block text-gray-700 text-sm font-semibold mb-2">Format</label>
                    <select
                        id="updateTournamentFormat"
                        name="tournament_format"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select format</option>
                        <option value="Round-Robin" ${currentTournament.format === "Round-Robin" ? "selected" : ""}>Round-Robin</option>
                        <option value="Double-Round-Robin" ${currentTournament.format === "Double-Round-Robin" ? "selected" : ""}>Double-Round-Robin</option>
                    </select>
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancelUpdateBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                        Cancel
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        Update Tournament
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('cancelUpdateBtn')?.addEventListener('click', () => {
        setCurrentView('viewTournaments')
        renderApp();
    });

    document.getElementById('updateTournamentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (document.getElementById('updateTournamentName') as HTMLInputElement).value;
        const start_date = (document.getElementById('updateTournamentStartDate') as HTMLInputElement).value;
        const end_date = (document.getElementById('updateTournamentEndDate') as HTMLInputElement).value;
        const location = (document.getElementById('updateTournamentLocation') as HTMLInputElement).value;
        const nb_of_players = (document.getElementById('updateTournamentNbofPlayers') as HTMLInputElement).value;
        const time_control = (document.getElementById('updateTournamentTimeControl') as HTMLSelectElement).value;
        const format = (document.getElementById('updateTournamentFormat') as HTMLSelectElement).value;

        try {
            // Define a type for tournament creation
            // id , players and status are optional (created/set by the backend)
            type TournamentUpdate = Omit<Tournament, 'id' | 'players' | 'status' | 'rounds'>;
            const payload: TournamentUpdate = {
                name: name,
                start_date: start_date,
                end_date: end_date,
                location: location,
                time_control: time_control as TournamentTimeControl,
                format: format,
                nb_of_players: Number(nb_of_players)
            };

            if (!isTournament(currentTournament)) {
                showModal("Tournament not found.");
                return;
            }

            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`, {
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
                throw new Error(error.detail || error.message || 'Failed to update tournament.');
            }

            showModal("Tournament updated successfully!");
            setCurrentView('viewTournaments')
            renderApp();
        } catch (error: any) {
            showModal(`Failed to update tournament: ${error.message}`);
        }
    });
}

export function renderCreateTournament(): void {
    appContent.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Create New Tournament</h2>
            ${getUserId() ? `
                <form id="createTournamentForm" class="space-y-6">
                    <div>
                        <label for="tournamentName" class="block text-gray-700 text-sm font-semibold mb-2">Tournament Name</label>
                        <input
                            type="text"
                            id="tournamentName"
                            name="name"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
                                required
                            >
                        </div>
                        <div>
                            <label for="tournamentEndDate" class="block text-gray-700 text-sm font-semibold mb-2">End Date</label>
                            <input
                                type="date"
                                id="tournamentEndDate"
                                name="date"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
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
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
                            placeholder="e.g., Online, Local Chess Club"
                            required
                        >
                    </div>
                    <div>
                        <label for="tournamentNbofPlayers" class="block text-gray-700 text-sm font-semibold mb-2">Nb. of Players</label>
                        <input type="number" id="tournamentNbofPlayers" class="flex-1 px-1 py-1 border rounded" placeholder="min. 2 / max. 64" required>
                    </div>
                    <div>
                        <label for="tournamentTimeControl" class="block text-gray-700 text-sm font-semibold mb-2">Time Control</label>
                        <select
                            id="tournamentTimeControl"
                            name="time_control"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
                            required
                        >
                            <option value="">Select time control</option>
                            <option value="Bullet">Bullet</option>
                            <option value="Blitz">Blitz</option>
                            <option value="Rapid">Rapid</option>
                            <option value="Classical">Classical</option>
                        </select>
                    </div>
                    <div>
                        <label for="tournamentFormat" class="block text-gray-700 text-sm font-semibold mb-2">Time Control</label>
                        <select
                            id="tournamentFormat"
                            name="tournament_format"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
                            required
                        >
                            <option value="">Select format</option>
                            <option value="Round-Robin">Round-Robin</option>
                            <option value="Double-Round-Robin">Double-Round-Robin</option>
                            <!--
                            <option value="Swiss">Swiss</option>
                            <option value="Double-Swiss">Double-Swiss</option>
                            <option value="Elimination">Elimination</option>
                            <option value="Double-Elimination">Double-Elimination</option>
                            -->
                        </select>
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancelCreateBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                            Cancel
                        </button>
                        <button id="generateTournament" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                        Generate
                        </button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                            Create
                        </button>
                    </div>
                </form>
            ` : `
                <p class="text-center text-gray-600 text-lg">Please log in to create a new tournament.</p>
            `}
        </div>
    `;
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => { setCurrentView( 'home'); renderApp(); });
    document.getElementById('createTournamentForm')?.addEventListener('submit', handleSubmitNewTournament);

    document.getElementById('generateTournament')?.addEventListener('click', (e) => {
    e.preventDefault();

    // Fill form fields with random data
    (document.getElementById('tournamentName') as HTMLInputElement).value = `Chessly Cup ${Math.floor(Math.random() * 1000)}`;
    (document.getElementById('tournamentStartDate') as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
    (document.getElementById('tournamentEndDate') as HTMLInputElement).value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    (document.getElementById('tournamentLocation') as HTMLInputElement).value = ["Online", "Iasi", "Bucuresti", "Galati"][Math.floor(Math.random() * 4)];
    (document.getElementById('tournamentNbofPlayers') as HTMLInputElement).value = String(Math.floor(Math.random() * 10) + 2);
    (document.getElementById('tournamentTimeControl') as HTMLSelectElement).value = ["Bullet", "Blitz", "Rapid", "Classical"][Math.floor(Math.random() * 4)];
    (document.getElementById('tournamentFormat') as HTMLSelectElement).value = ["Round-Robin", "Double-Round-Robin"][Math.floor(Math.random() * 2)];
});
}


export async function renderViewTournaments(): Promise<void> {
    let tournamentsHtml = '';
    // Track which tab is active
    let tournamentTab = (window as any).tournamentTab || 'Not Started';

    if (!getUserId() || !getToken()) {
        tournamentsHtml = `<p class="text-center text-gray-600">Please log in to view your tournaments.</p>`;
    } else {
        try {
            setTournaments(await fetchTournaments());

            // Tabs
            const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
            const tabActive = "bg-blue-600 text-white";
            const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

            const normalizeStatus = (status: string) => status.replace(/[\s_]/g, '').toLowerCase();

            // Filter tournaments by status
            const tournaments = getTournaments();
            const filtered = tournaments.filter(t => {
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
        } catch (error: any) {
            tournamentsHtml = `<p class="text-center text-red-600">Failed to load tournaments: ${error.message}</p>`;
        }
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">My Tournaments</h2>
            ${tournamentsHtml}
            <div class="text-center mt-8">
                <button id="backToHomeBtnView" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                    Back to Home
                </button>
            </div>
        </div>
    `;
    attachTournamentOperationListeners();
}
