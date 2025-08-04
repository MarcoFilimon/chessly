import {
    setCurrentView,
    getCurrentView,
    setUserUsername,
    getUserUsername,
    setUserId,
    getUserId,
    setUserEmail,
    getUserEmail,
    setToken,
    getToken,
    setTournaments,
    setRefreshToken,
    getRefreshToken,
    setFirstName,
    setLastName
} from '../state.js'

import {
    login,
    register,
    logout
} from '../api/authAPI.js'

import {Modal} from '../utils/general.js'
import {appContent, authButtonsContainer} from '../dom.js'

import {
    renderCreateTournament,
    renderViewTournaments,
} from './tournament/tournament.js'

import {
    renderTournamentDetail
} from './tournament/tournamentDetail.js'

import {renderTournamentGames} from './tournament/tournamentGames.js'

import {renderTournamentPlayers} from './tournament/tournamentPlayers.js'

import {renderTournamentResults} from './tournament/tournamentResults.js'

import { renderViewUser } from './profile.js'

import type { User } from '../types.js'

import { renderLichess } from './lichess/lichess.js'

import { getCurrentPollingCleanup, setCurrentPollingCleanup } from '../utils/lichessUtils.js';

async function handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername') as HTMLInputElement;
    const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const userData = await login(username, password);
        setToken(userData.token);
        setRefreshToken(userData.refresh_token)
        setUserId(userData.user.id);
        setUserUsername(userData.user.username);
        setUserEmail(userData.user.email);
        setFirstName(userData.user.first_name);
        setLastName(userData.user.last_name)
        localStorage.setItem('chessTournamentUserId', getUserId() as string);
        localStorage.setItem('chessTournamentUsername', getUserUsername() as string);
        localStorage.setItem('chessTournamentEmail', getUserEmail() as string);
        localStorage.setItem('chessTournamentRefreshToken', getRefreshToken() as string);
        localStorage.setItem('chessTournamentToken', getToken() as string);
        setCurrentView('home');
        renderApp(); // Re-render after login

    } catch (error: any) {
        console.error("Error logging in:", error);
        Modal.show(`Login failed: ${error.message}`);
    }
}

async function handleSignup(e: Event): Promise<void> {
    e.preventDefault();
    const usernameInput = document.getElementById('signupUsername') as HTMLInputElement;
    const emailInput = document.getElementById('signupEmail') as HTMLInputElement;
    const passwordInput = document.getElementById('signupPassword') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmSignupPassword') as HTMLInputElement;
    const firstNameInput = document.getElementById('signupFirstName') as HTMLInputElement;
    const lastNameInput = document.getElementById('signupLastName') as HTMLInputElement;

    const payload: Partial<User> = {
        username: usernameInput.value,
        email: emailInput.value,
        password: passwordInput.value,
        confirmPassword: confirmPasswordInput.value
    };

    if (firstNameInput.value.trim()) {
        payload.first_name = firstNameInput.value.trim();
    }
    if (lastNameInput.value.trim()) {
        payload.last_name = lastNameInput.value.trim();
    }
    // Password validation
    if (payload.password || payload.confirmPassword) {
        if (payload.password !== payload.confirmPassword) {
            Modal.show("Passwords don't match.");
            return;
        }
        if (!payload.password || payload.password.length < 3) {
            Modal.show("Password must be at least 3 characters.");
            return;
        }
    }
    try {
        await register(payload);
        Modal.show("Account Created! Check your email to verify the account.")
        setCurrentView('home');
        renderApp();
    } catch (error: any) {
        console.error("Error signing up:", error);
        Modal.show(`Signup failed: ${error.message}`);
    }
}

export async function handleLogout(): Promise<void> {
    try {
        await logout();
        setUserId(null);
        localStorage.removeItem('chessTournamentUserId');
        localStorage.removeItem('chessTournamentUsername');
        localStorage.removeItem('chessTournamentRefreshToken');
        localStorage.removeItem('chessTournamentToken');
        localStorage.removeItem('chessTournamentEmail');
        setTournaments([]);
        setCurrentView('home');
        renderApp(); // Re-render after logout
    } catch (error: any) {
        console.error("Error logging out:", error);
        Modal.show(`Logout failed: ${error.message}`);
    }
}

function renderHome(): void {
    appContent.innerHTML = `
        <div class="text-center p-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-6">Welcome to Chessly!</h1>
            <p class="text-lg text-gray-600 mb-8">
                Organize and manage your chess tournaments with ease.
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
                ${getUserId() ? `
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
    if (getUserId()) {
        document.getElementById('createTournamentBtnHome')?.addEventListener('click', () => { setCurrentView( 'createTournament'); renderApp(); });
    }
    document.getElementById('viewTournamentsBtnHome')?.addEventListener('click', () => { setCurrentView('viewTournaments') ; renderApp(); });
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
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => { setCurrentView('home') ; renderApp(); });
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('goToSignupBtn')?.addEventListener('click', () => { setCurrentView('signup') ; renderApp(); });
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
                    <label for="confirmSignupPassword" class="block text-gray-700 text-sm font-semibold mb-2">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmSignupPassword"
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
    document.getElementById('cancelSignupBtn')?.addEventListener('click', () => { setCurrentView( 'home') ; renderApp(); });
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
    document.getElementById('goToLoginBtn')?.addEventListener('click', () => { setCurrentView( 'login') ; renderApp(); });
}

function renderHeaderButtons(): void {
    if (getUserId()) {
        authButtonsContainer.innerHTML = `
            <button id="createBtnHeader" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Create
            </button>
            <button id="viewBtnHeader" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Tournaments
            </button>
            <button id="viewLichess" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                Lichess
            </button>
            <button id="viewUser" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200">
                ${getUserUsername()}
            </button>
            <button id="logoutBtnHeader" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300">
                Logout
            </button>
        `;
        document.getElementById('createBtnHeader')?.addEventListener('click', () => { setCurrentView('createTournament') ; renderApp(); });
        document.getElementById('viewBtnHeader')?.addEventListener('click', () => { setCurrentView('viewTournaments') ; renderApp(); });
        document.getElementById('viewUser')?.addEventListener('click', () => { setCurrentView('viewUser') ; renderApp(); });
        document.getElementById('viewLichess')?.addEventListener('click', () => { setCurrentView('viewLichess') ; renderApp(); });
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
        document.getElementById('loginBtnHeader')?.addEventListener('click', () => { setCurrentView('login') ; renderApp(); });
        document.getElementById('signupBtnHeader')?.addEventListener('click', () => { setCurrentView('signup') ; renderApp(); });
    }
}

// --- Main Render Function ---
export function renderApp(): void {
    // Always stop polling before rendering a new view
    const cleanup = getCurrentPollingCleanup();
    if (cleanup) {
        cleanup();
        setCurrentPollingCleanup(undefined);
    }
    renderHeaderButtons();

    // Render main content based on currentView
    switch (getCurrentView()) {
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
        case 'viewUser':
            renderViewUser();
            break;
        case 'viewLichess':
            renderLichess();
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