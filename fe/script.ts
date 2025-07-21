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
let currentTournament: any = null;

let nbOfPlayers: number | null = null;

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
            // showModal(data.message);
            currentView = 'home';
            renderApp(); // Re-render after login
        } else {
            throw new Error(data.message || 'Login failed');
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
            throw new Error(data.message || 'Signup failed');
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
        throw new Error(error.message || 'Failed to create tournament');
    }
    return await response.json();
}


async function fetchTournaments(token: string): Promise<any[]> {
    const response = await fetch(`${fastApiBaseUrl}/tournament`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Use backend's detail field if present
        throw new Error(error.detail || error.message || 'Failed to fetch tournaments');
    }
    return await response.json();
}

// --- Tournament Management Handlers ---
async function handleSubmitNewTournament(e: Event): Promise<void> {
    e.preventDefault();
    if (!userId) {
        showModal("User not logged in. Please log in to create a tournament.");
        return;
    }

    const tournamentNameInput = document.getElementById('tournamentName') as HTMLInputElement;
    const tournamentStartDateInput = document.getElementById('tournamentStartDate') as HTMLInputElement;
    const tournamentEndDateInput = document.getElementById('tournamentEndDate') as HTMLInputElement;
    const tournamentLocationInput = document.getElementById('tournamentLocation') as HTMLInputElement;
    const tournamentTimeControl = document.getElementById('tournamentTimeControl') as HTMLInputElement;

    const tournamentName = tournamentNameInput.value;
    const tournamentStartDate = tournamentStartDateInput.value;
    const tournamentEndDate = tournamentEndDateInput.value;
    const tournamentLocation = tournamentLocationInput.value;
    const tournamentTC = tournamentTimeControl.value;

   try {
    const tournamentData = {
        name: tournamentName,
        start_date: tournamentStartDate,
        end_date: tournamentEndDate, // or use a separate end date field if you have one
        location: tournamentLocation, // or use a separate field if you have one
        time_control: tournamentTC // adjust as needed for your backend
    };

    await createTournament(tournamentData, token!);

    showModal("Tournament created successfully!");
    // Clear form fields
    // tournamentNameInput.value = '';
    // tournamentStartDateInput.value = '';
    // tournamentEndDateInput.value = '';
    // tournamentLocationInput.value = '';
    // tournamentTimeControl.value = '';


    currentView = 'viewTournaments';
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
            <h1 class="text-4xl font-bold text-gray-800 mb-6">Welcome to Chess Tournaments!</h1>
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
                        <label for="tournamentTimeControl" class="block text-gray-700 text-sm font-semibold mb-2">Time Control</label>
                        <input
                            type="text"
                            id="tournamentTimeControl"
                            name="location"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500"
                            placeholder="e.g., Online, Local Chess Club"
                            required
                        >
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancelCreateBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
                            Cancel
                        </button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                            Create Tournament
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
}

async function renderViewTournaments(): Promise<void> {
    let tournamentsHtml = '';

    if (!userId || !token) {
        tournamentsHtml = `<p class="text-center text-gray-600">Please log in to view your tournaments.</p>`;
    } else {
        try {
            // Fetch tournaments from backend
            tournaments = await fetchTournaments(token);

            if (tournaments.length === 0) {
                tournamentsHtml = `<p class="text-center text-gray-600">No tournaments created yet. Why not create one?</p>`;
            } else {
                tournamentsHtml = `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${tournaments.map(tournament => `
                            <div class="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200 cursor-pointer tournament-card"
                            data-tournament-id="${tournament.id}">
                                <h3 class="text-xl font-semibold text-gray-800 mb-2">${tournament.name}</h3>
                                <p class="text-gray-600 text-sm mb-1"><strong>Start:</strong> ${tournament.start_date}</p>
                                <p class="text-gray-600 text-sm mb-1"><strong>End:</strong> ${tournament.end_date}</p>
                                <p class="text-gray-600 text-sm mb-1"><strong>Location:</strong> ${tournament.location}</p>
                                <p class="text-gray-600 text-sm mb-1"><strong>Time Control:</strong> ${tournament.time_control}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
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
    document.getElementById('backToHomeBtnView')?.addEventListener('click', () => { currentView = 'home'; renderApp(); });

    // After rendering tournamentsHtml
    document.querySelectorAll('.tournament-card').forEach(card => {
        card.addEventListener('click', () => {
            const tournamentId = (card as HTMLElement).getAttribute('data-tournament-id');
            currentTournament = tournaments.find(t => t.id == tournamentId);
            currentView = 'tournamentDetail';
            renderApp();
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

    appContent.innerHTML = `
        <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">${currentTournament.name}</h2>
            <p class="mb-2"><strong>Start:</strong> ${currentTournament.start_date}</p>
            <p class="mb-2"><strong>End:</strong> ${currentTournament.end_date}</p>
            <p class="mb-2"><strong>Location:</strong> ${currentTournament.location}</p>
            <p class="mb-2"><strong>Time Control:</strong> ${currentTournament.time_control}</p>
            <hr class="my-4"/>
            <h3 class="text-xl font-semibold mb-2">Players</h3>
            <ul id="playerList" class="mb-4">
                <!-- Render players here -->
            </ul>
            <form id="addPlayerForm" class="flex gap-2 mb-4">
                <input type="text" id="playerNameInput" class="flex-1 px-2 py-1 border rounded" placeholder="Name" required>
                <input type="text" id="playerRatingInput" class="flex-1 px-2 py-1 border rounded" placeholder="Rating" required>
                <button type="submit" class="bg-blue-600 text-white px-4 py-1 rounded">Add Player</button>
            </form>
            <button id="backToTournamentsBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                Back to Tournaments
            </button>
        </div>
    `;

    // Render players (if any)
    const playerList = document.getElementById('playerList');
    if (playerList) {
        playerList.innerHTML = (currentTournament.players || [])
            .map((player: string) => `<li>${player}</li>`)
            .join('');
    }

    // Add player handler
    document.getElementById('addPlayerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
        const playerRatingInput = document.getElementById('playerRatingInput') as HTMLInputElement;
        const playerName = playerNameInput.value.trim();
        const playerRating = playerRatingInput.value.trim();
        if (!playerName || !playerRating) return;

        // TODO: Send API request to add player to tournament
        // Example:
        // await addPlayerToTournament(currentTournament.id, playerName, token!);

        // For now, just update locally:
        if (!currentTournament.players) currentTournament.players = [];
        currentTournament.players.push(playerName);
        renderTournamentDetail();
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
                View My Tournaments
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
        case 'tournamentDetail':
            renderTournamentDetail();
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
};