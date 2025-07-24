// --- DOM Elements ---
const appContent = document.getElementById('app-content') as HTMLElement;
const authButtonsContainer = document.getElementById('authButtons') as HTMLElement;
const homeBtn = document.getElementById('homeBtn') as HTMLButtonElement;
const modalOverlay = document.getElementById('modalOverlay') as HTMLElement;
const modalMessage = document.getElementById('modalMessage') as HTMLElement;
const modalCloseBtn = document.getElementById('modalCloseBtn') as HTMLButtonElement;

// --- State Variables ---
let userId: string | null = null; // User ID from FastAPI
let userUsername: string | null = null;
let userEmail: string | null = null;
let refresh_token: string | null = null;
let token: string | null = null;
let currentView: string = 'home';
let tournaments: any[] = [];

interface Player {
    id: number;
    name: string;
    rating: number;
    tournament_id: number;
}

export enum TournamentStatus {
    NotStarted = "Not Started",
    Ongoing = "Ongoing",
    Finished = "Finished"
}

export enum TournamentTimeContrl {
    BULLET = "Bullet",
    BLITZ = "Blitz",
    RAPID = "Rapid",
    CLASICCAL = "Classical"
}

interface Tournament {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    nb_of_players: number;
    time_control: TournamentTimeContrl;
    format: string;
    status: TournamentStatus;
    players: Player[];
    rounds: Array<any>;
}

let currentTournament: Tournament | null = null;

interface Matchup {
    id: number;
    white_player: Player;
    black_player: Player;
    result?: string;
}

let selectedRoundIdx: number = 0;
let playerSortColumn: 'name' | 'rating' = 'name';
let playerSortDirection: 'asc' | 'desc' = 'asc';

function isTournament(obj: any): obj is Tournament {
    return obj && typeof obj.id === "number" && typeof obj.status === "string";
}

// --- FastAPI Configuration ---
// IMPORTANT: Set this to the base URL of your FastAPI server (e.g., 'http://localhost:8000')
const fastApiBaseUrl: string = 'http://localhost:8000/api/v1';

// --- Modal Functions ---
function showModal(message: string): void {
    modalMessage.textContent = message;
    modalOverlay.classList.add('show');
}

function closeModal(): void {
    modalOverlay.classList.remove('show');
    modalMessage.textContent = '';
}

modalCloseBtn.addEventListener('click', closeModal);


function formatDate(dateStr: string): string {
    // Assumes dateStr is "yyyy-mm-dd"
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
}

async function apiFetch(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
    // Attach token if available
    if (token) {
        init.headers = {
            ...(init.headers || {}),
            'Authorization': `Bearer ${token}`,
        };
    }
    let response = await fetch(input, init);

    // If token expired, try to refresh and retry once
    if (response.status === 401 && retry && refresh_token) {
        // Try to refresh token
        const refreshResp = await fetch(`${fastApiBaseUrl}/auth/refresh_token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refresh_token}`,
                'Content-Type': 'application/json'
            }
        });
        if (refreshResp.ok) {
            const data = await refreshResp.json();
            token = data.access_token;
            localStorage.setItem('chessTournamentToken', token!);
            // Retry original request with new token
            if (token) {
                init.headers = {
                    ...(init.headers || {}),
                    'Authorization': `Bearer ${token}`,
                };
            }
            response = await fetch(input, init);
        } else {
            // Refresh failed, force logout
            await handleLogout();
            throw new Error("Session expired. Please log in again.");
        }
    }
    return response;
}


// --- Authentication Handlers (calling FastAPI) ---
async function handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername') as HTMLInputElement;
    const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch(`${fastApiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password }),
        });

        const data = await response.json();

        if (response.ok) {
            userId = data.user.id
            refresh_token = data.refresh_token
            token = data.token
            userUsername = data.user.username
            userEmail = data.user.email
            localStorage.setItem('chessTournamentUserId', userId as string);
            localStorage.setItem('chessTournamentUsername', userUsername as string);
            localStorage.setItem('chessTournamentEmail', userEmail as string);
            localStorage.setItem('chessTournamentRefreshToken', refresh_token as string);
            localStorage.setItem('chessTournamentToken', token as string);
            currentView = 'home';
            renderApp(); // Re-render after login
        } else {
            // Handle Pydantic validation errors (422)
            if (data.detail && Array.isArray(data.detail)) {
                // Combine all error messages
                const messages = data.detail.map((e: any) => e.msg).join('; ');
                throw new Error(messages);
            }
            throw new Error(data.detail || data.message || 'Login failed.');
        }
    } catch (error: any) {
        console.error("Error logging in:", error);
        showModal(`Login failed: ${error.message}`);
    }
}

async function handleSignup(e: Event): Promise<void> {
    e.preventDefault();
    const usernameInput = document.getElementById('signupUsername') as HTMLInputElement;
    const emailInput = document.getElementById('signupEmail') as HTMLInputElement;
    const passwordInput = document.getElementById('signupPassword') as HTMLInputElement;
    const firstNameInput = document.getElementById('signupFirstName') as HTMLInputElement;
    const lastNameInput = document.getElementById('signupLastName') as HTMLInputElement;

    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const first_name = firstNameInput.value || null;
    const last_name = lastNameInput.value || null;

    try {
        const response = await fetch(`${fastApiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                first_name,
                last_name
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showModal(data.message);
            currentView = 'home';
            renderApp();
        } else {
            // Handle Pydantic validation errors (422)
            if (data.detail && Array.isArray(data.detail)) {
                // Combine all error messages
                const messages = data.detail.map((e: any) => e.msg).join('; ');
                throw new Error(messages);
            }
            throw new Error(data.detail || data.message || 'Signup failed.');
        }
    } catch (error: any) {
        console.error("Error signing up:", error);
        showModal(`Signup failed: ${error.message}`);
    }
}

async function handleLogout(): Promise<void> {
    try {
        // Optionally, inform FastAPI about logout if it manages sessions
        await fetch(`${fastApiBaseUrl}/auth/logout`, { method: 'POST' });

        userId = null;
        localStorage.removeItem('chessTournamentUserId');
        localStorage.removeItem('chessTournamentUsername');
        localStorage.removeItem('chessTournamentRefreshToken');
        localStorage.removeItem('chessTournamentToken');
        localStorage.removeItem('chessTournamentEmail');
        tournaments = []; // Clear tournaments on logout
        currentView = 'home';
        renderApp(); // Re-render after logout
    } catch (error: any) {
        console.error("Error logging out:", error);
        showModal(`Logout failed: ${error.message}`);
    }
}

async function createTournament(payload: any, token: string): Promise<any> {
    const response = await fetch(`${fastApiBaseUrl}/tournament`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to create tournament.');
    }
    return await response.json();
}

async function fetchTournaments(token: string): Promise<any[]> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch tournaments');
    }
    return await response.json();
}

async function retrievePlayersForTournament(tournamentId: Number): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/${tournamentId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch players');
    }
    return await response.json();
}

async function addPlayerToTournament(payload: any, token: string): Promise<any> {
    const { name, rating, tournament_id } = payload;
    const response = await fetch(`${fastApiBaseUrl}/player/${payload.tournament_id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, rating })
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to create player.');
    }
    return await response.json();
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
            time_control: tournamentTC as TournamentTimeContrl,
            format: tournamentFormat,
            nb_of_players: Number(tournamentNbOfPlayers)
        };

        currentTournament = await createTournament(tournamentData, token!);
        currentView = 'viewTournamentDetail';
        renderApp();
    } catch (error: any) {
        // console.error("Error adding tournament:", error);
        showModal(`Failed to create tournament: ${error.message}`);
    }
}

// --- View Rendering Functions ---

function renderHome(): void {
    appContent.innerHTML = `
        <div class="text-center p-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-6">Welcome to Chessly!</h1>
            <p class="text-lg text-gray-600 mb-8">
                Organize and manage your chess tournaments with ease.
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                ${userId ? `
                    <button id="createTournamentBtnHome" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        Create New Tournament
                    </button>
                    <button id="viewTournamentsBtnHome" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        View My Tournaments
                    </button>
                ` : `
                    <p class="text-gray-600 text-lg">Please log in or sign up to create tournaments.</p>
                `}
            </div>
        </div>
    `;
    // Attach event listeners after rendering HTML
    if (userId) {
        document.getElementById('createTournamentBtnHome')?.addEventListener('click', () => { currentView = 'createTournament'; renderApp(); });
    }
    document.getElementById('viewTournamentsBtnHome')?.addEventListener('click', () => { currentView = 'viewTournaments'; renderApp(); });
}

function renderUpdateTournament(): void {
    if (!currentTournament) {
        showModal("Tournament not found.");
        currentView = 'viewTournaments';
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
        currentView = 'viewTournaments';
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
                time_control: time_control as TournamentTimeContrl,
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
                    'Authorization': `Bearer ${token}`
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
            currentView = 'viewTournaments';
            renderApp();
        } catch (error: any) {
            showModal(`Failed to update tournament: ${error.message}`);
        }
    });
}

function renderCreateTournament(): void {
    appContent.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Create New Tournament</h2>
            ${userId ? `
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
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => { currentView = 'home'; renderApp(); });
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

async function deleteTournament(tournamentId: string, token: string): Promise<void> {
    const response = await fetch(`${fastApiBaseUrl}/tournament/${tournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete tournament.');
    }
}

async function deletePlayer(playerId: string, token: string): Promise<void> {
    const response = await fetch(`${fastApiBaseUrl}/player/${playerId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete player.');
    }
}

async function deleteAllPlayers(currentTournamentId: number, token: string): Promise<void> {
    const response = await fetch(`${fastApiBaseUrl}/player/tournament/${currentTournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete players.');
    }
}

async function renderViewTournaments(): Promise<void> {
    let tournamentsHtml = '';
    // Track which tab is active
    let tournamentTab = (window as any).tournamentTab || 'Not Started';

    if (!userId || !token) {
        tournamentsHtml = `<p class="text-center text-gray-600">Please log in to view your tournaments.</p>`;
    } else {
        try {
            tournaments = await fetchTournaments(token);

            // Tabs
            const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
            const tabActive = "bg-blue-600 text-white";
            const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

            const normalizeStatus = (status: string) => status.replace(/[\s_]/g, '').toLowerCase();

            // Filter tournaments by status
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

    document.getElementById('createTournamentBtnHome')?.addEventListener('click', () => { currentView = 'createTournament'; renderApp(); });
    document.getElementById('backToHomeBtnView')?.addEventListener('click', () => { currentView = 'home'; renderApp(); });

    // Render a specific tournament
    document.querySelectorAll('.tournament-card').forEach(card => {
        card.addEventListener('click', () => {
            const tournamentId = (card as HTMLElement).getAttribute('data-tournament-id');
            currentTournament = tournaments.find(t => t.id == tournamentId);
            currentView = 'viewTournamentDetail';
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
                await deleteTournament(tournamentId, token!);
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
            currentTournament = tournaments.find(t => t.id == tournamentId);
            try {
                renderUpdateTournament();
            }
            catch(error: any) {
                showModal(`Failed to update tournament: ${error.message}`);
            }
        });
    });
}

function renderTournamentDetail(): void {
    if (!currentTournament) {
        showModal("Tournament not found.");
        currentView = 'viewTournaments';
        renderApp();
        return;
    }

    // Tab button classes
    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex-1">
                    <div class="flex gap-2 mb-6">
                        <button id="descTab" class="${tabBase} ${currentView === 'viewTournamentDetail' ? tabActive : tabInactive}">
                            Description
                        </button>
                        <button id="playersTab" class="${tabBase} ${currentView === 'viewTournamentPlayers' ? tabActive : tabInactive}">
                            Players
                        </button>
                        <button id="gamesTab" class="${tabBase} ${currentView === 'viewTournamentGames' ? tabActive : tabInactive}">
                            Games
                        </button>
                        <button id="resultsTab" class="${tabBase} ${currentView === 'viewTournamentResults' ? tabActive : tabInactive}">
                            Results
                        </button>
                    </div>
                    <div id="tournamentDetailContent">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">${currentTournament.name}</h2>
                        <p class="mb-2"><strong>Start:</strong> ${formatDate(currentTournament.start_date)}</p>
                        <p class="mb-2"><strong>End:</strong> ${formatDate(currentTournament.end_date)}</p>
                        <p class="mb-2"><strong>Location:</strong> ${currentTournament.location}</p>
                        <p class="mb-2"><strong>Nb. Of Players:</strong> ${currentTournament.nb_of_players}</p>
                        <p class="mb-2"><strong>Time Control:</strong> ${currentTournament.time_control}</p>
                        <p class="mb-2"><strong>Format:</strong> ${currentTournament.format}</p>
                        <p class="mb-2"><strong>Status:</strong> ${currentTournament.status}</p>
                        <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                            Back
                        </button>

                        ${(currentTournament.status === "Not Started")
                            ? `<button id="startTournamentBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                                    Start Tournament
                                </button>`
                            : currentTournament.status === "Ongoing"
                            ? `<button id="finishTournamentBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                                    End Tournament
                                </button>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    // Tab navigation handlers
    document.getElementById('descTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentDetail') {
            currentView = 'viewTournamentDetail';
            renderApp();
        }
    });
    document.getElementById('playersTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentPlayers') {
            currentView = 'viewTournamentPlayers';
            renderApp();
        }
    });
    document.getElementById('gamesTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentGames') {
            currentView = 'viewTournamentGames';
            renderApp();
        }
    });
    document.getElementById('resultsTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentResults') {
            currentView = 'viewTournamentResults';
            renderApp();
        }
    });
    document.getElementById('backToTournamentsBtn')?.addEventListener('click', () => {
        currentView = 'viewTournaments';
        renderApp();
    });

    // Start Tournament button logic
    document.getElementById('startTournamentBtn')?.addEventListener('click', async () => {
        if (!isTournament(currentTournament)) {
            showModal("Tournament not found.");
            return;
        }

        // Check if all players have been created
        const players = currentTournament.players || [];
        if (players.length < currentTournament.nb_of_players) {
            showModal(`You need to add all ${currentTournament.nb_of_players} players before starting the tournament.`);
            // Switch to Players tab
            currentView = 'viewTournamentPlayers';
            renderApp();
            return;
        }
        try {
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to start tournament.');
            }
            showModal("Tournament started! All rounds have been generated.");

            // Refresh tournament data
            const updated = await response.json();
            currentTournament = updated;
            selectedRoundIdx = 0;
            currentView = 'viewTournamentGames'
            renderApp();

            // Frontend is rendering before the backend has finished generating/populating all matchups for the last round
            // Add this to force a refetch after a short delay:
            setTimeout(async () => {
                const resp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (resp.ok) {
                    currentTournament = await resp.json();
                    // If you're still on games view, re-render
                    if (currentView === 'viewTournamentGames') {
                        renderTournamentGames();
                    }
                }
            }, 300); // 300ms delay, adjust as needed
        } catch (error: any) {
            showModal(`Failed to start tournament: ${error.message}`);
        }
    });

    // End Tournament button logic
    document.getElementById('finishTournamentBtn')?.addEventListener('click', async () => {
        if (!isTournament(currentTournament)) {
            showModal("Tournament not found.");
            return;
        }

        try {
            currentTournament.status = TournamentStatus.Finished
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(currentTournament)
            });
            if (!response.ok) {
                currentTournament.status = TournamentStatus.Ongoing
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to end the tournament.');
            }
            showModal("Tournament ended! See the results.");
            currentView = 'viewTournamentResults'
            renderApp();
        } catch (error: any) {
            showModal(`Failed to end the tournament: ${error.message}`);
        }
    });


}


function renderUpdatePlayer(playerId: number): void {
    if (!currentTournament) {
        showModal("Tournament not found.");
        currentView = 'viewTournamentPlayers';
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
        currentView = 'viewTournamentPlayers';
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
                    'Authorization': `Bearer ${token}`
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
                currentTournament = await tournamentResp.json();
            }
            currentView = 'viewTournamentPlayers';
            renderApp();
        } catch (error: any) {
            showModal(`Failed to update player: ${error.message}`);
        }
    });
}


async function renderTournamentPlayers(): Promise<void> {
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
                    <button id="descTab" class="${tabBase} ${currentView === 'viewTournamentDetail' ? tabActive : tabInactive}">
                        Description
                    </button>
                    <button id="playersTab" class="${tabBase} ${currentView === 'viewTournamentPlayers' ? tabActive : tabInactive}">
                        Players
                    </button>
                    <button id="gamesTab" class="${tabBase} ${currentView === 'viewTournamentGames' ? tabActive : tabInactive}">
                        Games
                    </button>
                    <button id="resultsTab" class="${tabBase} ${currentView === 'viewTournamentResults' ? tabActive : tabInactive}">
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
                                        ${playerSortColumn === 'name' ? (playerSortDirection === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th class="px-4 py-2 border-b text-left cursor-pointer" id="sortByRating">
                                        Rating
                                        ${playerSortColumn === 'rating' ? (playerSortDirection === 'asc' ? '▲' : '▼') : ''}
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

    let sortedPlayers = [...(currentTournament.players || [])];
    sortedPlayers.sort((a, b) => {
        if (playerSortColumn === 'name') {
            return playerSortDirection === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        } else {
            return playerSortDirection === 'asc'
                ? a.rating - b.rating
                : b.rating - a.rating;
        }
    });

    // Render players in the table
    const playerTableBody = document.getElementById('playerTableBody');
    if (playerTableBody) {
        playerTableBody.innerHTML = sortedPlayers
            .map((player: Player, idx: number) =>
                `<tr>
                    <td class="px-4 py-2 border-b">${idx + 1}</td>
                    <td class="px-4 py-2 border-b">${player.name}</td>
                    <td class="px-4 py-2 border-b flex items-center justify-between">
                    <span>${player.rating}</span>
                    ${
                        currentTournament?.status === TournamentStatus.NotStarted
                        ? `<span class="flex gap-2 ml-4">
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
                        : ""
                    }
                    </td>
                </tr>`
            ).join('');
    }

    // Render players (if any)
    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = sortedPlayers
            .map((player: any) => `<li>${player.name} (Rating: ${player.rating})</li>`)
            .join('');
    }

    document.getElementById('sortByName')?.addEventListener('click', () => {
        if (playerSortColumn === 'name') {
            playerSortDirection = playerSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            playerSortColumn = 'name';
            playerSortDirection = 'asc';
        }
        renderTournamentPlayers();
    });

    document.getElementById('sortByRating')?.addEventListener('click', () => {
        if (playerSortColumn === 'rating') {
            playerSortDirection = playerSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            playerSortColumn = 'rating';
            playerSortDirection = 'asc';
        }
        renderTournamentPlayers();
    });

    // Add player handler
    document.getElementById('addPlayerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

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
            await addPlayerToTournament(playerData, token!);

            // Fetch updated tournament data
            const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to fetch tournaments');
            }
            currentTournament = await response.json();
            renderApp();

        } catch (error: any) {
            showModal(`Failed to create player: ${error.message}`)
        }
    });


    // Generate players
    const generateBtn = document.getElementById('generatePlayersButton') as HTMLButtonElement | null;
    if (generateBtn && !generateBtn.disabled) {
        generateBtn.addEventListener('click', async (e) => {
            if (!isTournament(currentTournament)) {
                showModal("Tournament not found.");
                return;
            }
            try {
                const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}/generate_players`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || error.message || 'Failed to generate players.');
                }

                const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
                if (tournamentResp.ok) {
                    currentTournament = await tournamentResp.json();
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
            if (!isTournament(currentTournament)) {
                showModal("Tournament not found.");
                return;
            }
            if (!confirm('Are you sure you want to delete all players?')) return;
            try {
                await deleteAllPlayers(currentTournament.id, token!);
                showModal("Players deleted successfully!");

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament.id}`);
                if (response.ok) {
                    currentTournament = await response.json();
                }
                renderTournamentPlayers();
            } catch (error: any) {
                showModal(`Failed to delete players: ${error.message}`);
            }
        });
    }



    // Add event listeners for update and delete buttons
    document.querySelectorAll('.delete-player-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const playerId = (btn as HTMLElement).getAttribute('data-player-id');
            if (!playerId) return;
            if (!confirm('Are you sure you want to delete this player?')) return;
            try {
                await deletePlayer(playerId, token!);
                showModal('Player deleted successfully!');

                const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
                if (response.ok) {
                    currentTournament = await response.json();
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

    // Tab navigation handlers
    document.getElementById('descTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentDetail') {
            currentView = 'viewTournamentDetail';
            renderApp();
        }
    });
    document.getElementById('playersTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentPlayers') {
            currentView = 'viewTournamentPlayers';
            renderApp();
        }
    });
    document.getElementById('gamesTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentGames') {
            currentView = 'viewTournamentGames';
            renderApp();
        }
    });
    document.getElementById('resultsTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentResults') {
            currentView = 'viewTournamentResults';
            renderApp();
        }
    });
    document.getElementById('backToTournamentsBtn')?.addEventListener('click', () => {
        currentView = 'viewTournaments';
        renderApp();
    });
}

async function renderTournamentGames(): Promise<void> {
    if (!currentTournament) {
        showModal("Tournament not found.");
        currentView = 'viewTournaments';
        renderApp();
        return;
    }

    // Reset selectedRoundIdx if out of bounds
    if (
        !currentTournament.rounds ||
        selectedRoundIdx < 0 ||
        selectedRoundIdx >= currentTournament.rounds.length
    ) {
        selectedRoundIdx = 0;
    }

    const tabBase = "flex-1 text-center font-bold py-2 px-4 rounded-lg shadow-md transition duration-200";
    const tabActive = "bg-blue-600 text-white";
    const tabInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer";

    // Build round tabs
    let roundTabsHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        roundTabsHtml = `<div id="roundTabs" class="flex gap-2 mb-6 overflow-x-auto flex-nowrap pb-4" style="scrollbar-width: thin;">`;
        currentTournament.rounds.forEach((round, idx) => {
            roundTabsHtml += `
                <button
                    class="${tabBase} ${selectedRoundIdx === idx ? tabActive : tabInactive}"
                    id="roundTab${idx}"
                    style="min-width: 120px;">
                    #${round.round_number}
                </button>
            `;
        });
        roundTabsHtml += `</div>`;
    }

    // Render only the selected round's table
    let roundTableHtml = "";
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        const round = currentTournament.rounds[selectedRoundIdx];
        if (!round.matchups || !Array.isArray(round.matchups) || round.matchups.length === 0) {
            roundTableHtml = `<p class="text-gray-600">Matchups for this round are not available yet. Please try again in a moment.</p>`;
        } else {
            roundTableHtml = `
                <h4 class="text-lg font-bold mt-6 mb-2">Round ${round.round_number} / ${currentTournament.rounds.length}</h4>
                <table class="min-w-full mb-4 bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 border-b text-center">Board</th>
                            <th class="px-4 py-2 border-b text-center">White</th>
                            <th class="px-4 py-2 border-b text-center">Result</th>
                            <th class="px-4 py-2 border-b text-center">Black</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${round.matchups.map((m: Matchup, idx: number) => `
                            <tr>
                                <td class="px-4 py-2 border-b text-center">${idx + 1}</td>
                                <td class="px-4 py-2 border-b text-center">${m.white_player.name}</td>
                                <td class="px-4 py-2 border-b text-center">
                                    ${
                                        currentTournament!.status === TournamentStatus.Ongoing
                                        ? `<select class="result-select text-center" data-matchup-id="${m.id}" style="text-align-last: center;">
                                                <option value="" ${!m.result ? "selected" : ""}>Select</option>
                                                <option value="White-Wins" ${m.result === "White-Wins" ? "selected" : ""}>1 - 0</option>
                                                <option value="Black-Wins" ${m.result === "Black-Wins" ? "selected" : ""}>0 - 1</option>
                                                <option value="Draw" ${m.result === "Draw" ? "selected" : ""}>½ - ½</option>
                                            </select>`
                                        : (
                                            m.result === "White-Wins" ? "1 - 0"
                                            : m.result === "Black-Wins" ? "0 - 1"
                                            : m.result === "Draw" ? "½ - ½"
                                            : "-"
                                        )
                                    }
                                </td>
                                <td class="px-4 py-2 border-b text-center">${m.black_player.name}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }
    if (currentTournament.status === TournamentStatus.Ongoing) {
        roundTableHtml += `
            <div class="flex justify-end mt-4">
                <button id="saveResultsBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                    Save Results
                </button>
            </div>
        `;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex gap-2 mb-6">
                <button id="descTab" class="${tabBase} ${currentView === 'viewTournamentDetail' ? tabActive : tabInactive}">Description</button>
                <button id="playersTab" class="${tabBase} ${currentView === 'viewTournamentPlayers' ? tabActive : tabInactive}">Players</button>
                <button id="gamesTab" class="${tabBase} ${currentView === 'viewTournamentGames' ? tabActive : tabInactive}">Games</button>
                <button id="resultsTab" class="${tabBase} ${currentView === 'viewTournamentResults' ? tabActive : tabInactive}">Results</button>
            </div>
            <div id="tournamentDetailContent">
                <h3 class="text-xl font-semibold mb-2">Games</h3>
                ${roundTabsHtml}
                ${roundTableHtml}
                <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md mt-4">
                    Back to Tournaments
                </button>
            </div>
        </div>
    `;

    // Tab navigation handlers (existing)
    document.getElementById('descTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentDetail') {
            currentView = 'viewTournamentDetail';
            renderApp();
        }
    });
    document.getElementById('playersTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentPlayers') {
            currentView = 'viewTournamentPlayers';
            renderApp();
        }
    });
    document.getElementById('gamesTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentGames') {
            currentView = 'viewTournamentGames';
            renderApp();
        }
    });
    document.getElementById('resultsTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentResults') {
            currentView = 'viewTournamentResults';
            renderApp();
        }
    });
    document.getElementById('backToTournamentsBtn')?.addEventListener('click', () => {
        currentView = 'viewTournaments';
        renderApp();
    });

    // Round tab handlers
    if (currentTournament.rounds && currentTournament.rounds.length > 0) {
        currentTournament.rounds.forEach((_, idx) => {
            document.getElementById(`roundTab${idx}`)?.addEventListener('click', () => {
                // Save scroll position
                const roundTabsDiv = document.getElementById('roundTabs');
                const scrollLeft = roundTabsDiv ? roundTabsDiv.scrollLeft : 0;

                selectedRoundIdx = idx;
                renderTournamentGames();

                // Restore scroll position after render
                setTimeout(() => {
                    const roundTabsDiv = document.getElementById('roundTabs');
                    if (roundTabsDiv) {
                        roundTabsDiv.scrollLeft = scrollLeft;
                    }
                }, 0);
            });
        });
    }

    document.getElementById('saveResultsBtn')?.addEventListener('click', async () => {
        const selects = document.querySelectorAll('.result-select');
        const results: Array<{ matchupId: string, result: string }> = [];
        let missing = false;

        selects.forEach(select => {
            const matchupId = (select as HTMLSelectElement).getAttribute('data-matchup-id');
            const result = (select as HTMLSelectElement).value;
            if (!result) {
                missing = true;
            }
            results.push({ matchupId: matchupId!, result });
        });

        if (missing) {
            showModal("Please select a result for every matchup before saving.");
            return;
        }

        // Batch API call
        try {
            const response = await fetch(`${fastApiBaseUrl}/tournament/${currentTournament?.id}/round_result/${selectedRoundIdx + 1}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ results })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || error.message || 'Failed to save results.');
            }
            showModal("Results saved successfully!");
            // Optionally refresh tournament data
            const tournamentResp = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournament!.id}`);
            if (tournamentResp.ok) {
                currentTournament = await tournamentResp.json();
                renderTournamentGames();
                if (currentView === 'viewTournamentResults') {
                    renderTournamentResults();
                }
            }
        } catch (error: any) {
            showModal(`Failed to save results: ${error.message}`);
        }
    });
}

async function renderTournamentResults(): Promise<void> {
    if (!currentTournament) {
        showModal("Tournament not found.");
        currentView = 'viewTournaments';
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
                <button id="descTab" class="${tabBase} ${currentView === 'viewTournamentDetail' ? tabActive : tabInactive}">
                    Description
                </button>
                <button id="playersTab" class="${tabBase} ${currentView === 'viewTournamentPlayers' ? tabActive : tabInactive}">
                    Players
                </button>
                <button id="gamesTab" class="${tabBase} ${currentView === 'viewTournamentGames' ? tabActive : tabInactive}">
                    Games
                </button>
                <button id="resultsTab" class="${tabBase} ${currentView === 'viewTournamentResults' ? tabActive : tabInactive}">
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
    document.getElementById('descTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentDetail') {
            currentView = 'viewTournamentDetail';
            renderApp();
        }
    });
    document.getElementById('playersTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentPlayers') {
            currentView = 'viewTournamentPlayers';
            renderApp();
        }
    });
    document.getElementById('gamesTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentGames') {
            currentView = 'viewTournamentGames';
            renderApp();
        }
    });
    document.getElementById('resultsTab')?.addEventListener('click', () => {
        if (currentView !== 'viewTournamentResults') {
            currentView = 'viewTournamentResults';
            renderApp();
        }
    });
    document.getElementById('backToTournamentsBtn')?.addEventListener('click', () => {
        currentView = 'viewTournaments';
        renderApp();
    });
}

function renderLogin(): void {
    appContent.innerHTML = `
        <div class="p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h2>
            <form id="loginForm" class="space-y-6">
                <div>
                    <label for="loginUsername" class="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                    <input
                        type="text"
                        id="loginUsername"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your username"
                        required
                    >
                </div>
                <div>
                    <label for="loginPassword" class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
                    <input
                        type="password"
                        id="loginPassword"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="********"
                        required
                    >
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancelLoginBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                        Cancel
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        Login
                    </button>
                </div>
            </form>
            <p class="text-center text-gray-600 mt-6">
                Don't have an account?
                <button id="goToSignupBtn" class="text-blue-600 hover:underline font-semibold">
                    Sign Up
                </button>
            </p>
        </div>
    `;
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => { currentView = 'home'; renderApp(); });
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('goToSignupBtn')?.addEventListener('click', () => { currentView = 'signup'; renderApp(); });
}

function renderSignup(): void {
    appContent.innerHTML = `
        <div class="p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Sign Up</h2>
            <form id="signupForm" class="space-y-6">
                <div>
                    <label for="signupUsername" class="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                    <input
                        type="text"
                        id="signupUsername"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your username"
                        required
                    >
                </div>
                <div>
                    <label for="signupEmail" class="block text-gray-700 text-sm font-semibold mb-2">Email</label>
                    <input
                        type="email"
                        id="signupEmail"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your@email.com"
                        required
                    >
                </div>
                <div>
                    <label for="signupPassword" class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
                    <input
                        type="password"
                        id="signupPassword"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="********"
                        required
                    >
                </div>
                <div>
                    <label for="signupFirstName" class="block text-gray-700 text-sm font-semibold mb-2">First Name (optional)</label>
                    <input
                        type="text"
                        id="signupFirstName"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="First name"
                    >
                </div>
                <div>
                    <label for="signupLastName" class="block text-gray-700 text-sm font-semibold mb-2">Last Name (optional)</label>
                    <input
                        type="text"
                        id="signupLastName"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Last name"
                    >
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancelSignupBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                        Cancel
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                        Sign Up
                    </button>
                </div>
            </form>
            <p class="text-center text-gray-600 mt-6">
                Already have an account?
                <button id="goToLoginBtn" class="text-blue-600 hover:underline font-semibold">
                    Login
                </button>
            </p>
        </div>
    `;
    document.getElementById('cancelSignupBtn')?.addEventListener('click', () => { currentView = 'home'; renderApp(); });
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
    document.getElementById('goToLoginBtn')?.addEventListener('click', () => { currentView = 'login'; renderApp(); });
}

// --- Main Render Function ---
function renderApp(): void {
    // Render header authentication buttons
    if (userId) {
        authButtonsContainer.innerHTML = `
            <button id="createBtnHeader" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Create
            </button>
            <button id="viewBtnHeader" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Tournaments
            </button>
            <button id="viewUser" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                ${userUsername || 'User'}
            </button>
            <button id="logoutBtnHeader" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300">
                Logout
            </button>
        `;
        document.getElementById('createBtnHeader')?.addEventListener('click', () => { currentView = 'createTournament'; renderApp(); });
        document.getElementById('viewBtnHeader')?.addEventListener('click', () => { currentView = 'viewTournaments'; renderApp(); });
        document.getElementById('logoutBtnHeader')?.addEventListener('click', handleLogout);
    } else {
        authButtonsContainer.innerHTML = `
            <button id="loginBtnHeader" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300">
                Login
            </button>
            <button id="signupBtnHeader" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300">
                Sign Up
            </button>
        `;
        document.getElementById('loginBtnHeader')?.addEventListener('click', () => { currentView = 'login'; renderApp(); });
        document.getElementById('signupBtnHeader')?.addEventListener('click', () => { currentView = 'signup'; renderApp(); });
    }

    // Render main content based on currentView
    switch (currentView) {
        case 'home':
            renderHome();
            break;
        case 'createTournament':
            renderCreateTournament();
            break;
        case 'viewTournaments':
            renderViewTournaments();
            break;
        case 'viewTournamentDetail':
            renderTournamentDetail();
            break;
        case 'viewTournamentGames':
            renderTournamentGames();
            break;
        case 'viewTournamentPlayers':
            renderTournamentPlayers();
            break;
        case 'viewTournamentResults':
            renderTournamentResults();
            break;
        case 'login':
            renderLogin();
            break;
        case 'signup':
            renderSignup();
            break;
        default:
            renderHome();
            break;
    }
}

// --- Initial Setup on Window Load ---
window.onload = function() {
    renderApp();
    // Attach global event listener for Home button
    homeBtn.addEventListener('click', () => { currentView = 'home'; renderApp(); });
    // Make the Chessly logo clickable to go home
    document.getElementById('logoHome')?.addEventListener('click', () => {
        currentView = 'home';
        renderApp();
    });
};