"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Firebase Firestore imports
var firebase_app_js_1 = require("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
var firebase_firestore_js_1 = require("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
var appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
var firebaseConfig = {
    apiKey: "AIzaSyAgkDElUxkoUwrYRme8VC2S8SAi4DueoHU",
    authDomain: "chey-c6c68.firebaseapp.com",
    projectId: "chey-c6c68",
    storageBucket: "chey-c6c68.firebasestorage.app",
    messagingSenderId: "277812666639",
    appId: "1:277812666639:web:fee5df5dc30ff7a353de7a",
    measurementId: "G-1WQCMFPR9P"
};
{ }
;
// --- DOM Elements ---
var appContent = document.getElementById('app-content');
var authButtonsContainer = document.getElementById('authButtons');
var homeBtn = document.getElementById('homeBtn');
var modalOverlay = document.getElementById('modalOverlay');
var modalMessage = document.getElementById('modalMessage');
var modalCloseBtn = document.getElementById('modalCloseBtn');
// --- State Variables ---
var db; // Firestore instance
var userId = null; // User ID from FastAPI
var userEmail = null; // User Email from FastAPI (optional, for display)
var currentView = 'home';
var tournaments = [];
var loadingUser = true; // To indicate if user state is being loaded
// --- FastAPI Configuration ---
// IMPORTANT: Set this to the base URL of your FastAPI server (e.g., 'http://localhost:8000')
var fastApiBaseUrl = 'http://localhost:8000';
// --- Modal Functions ---
function showModal(message) {
    modalMessage.textContent = message;
    modalOverlay.classList.add('show');
}
function closeModal() {
    modalOverlay.classList.remove('show');
    modalMessage.textContent = '';
}
modalCloseBtn.addEventListener('click', closeModal);
// --- Firebase Firestore Initialization and User Load from localStorage ---
function initializeAppAndUser() {
    return __awaiter(this, void 0, void 0, function () {
        var app, storedUserId, storedUserEmail;
        return __generator(this, function (_a) {
            try {
                app = (0, firebase_app_js_1.initializeApp)(firebaseConfig);
                db = (0, firebase_firestore_js_1.getFirestore)(app); // Assign to global db variable
                storedUserId = localStorage.getItem('chessTournamentUserId');
                storedUserEmail = localStorage.getItem('chessTournamentUserEmail');
                if (storedUserId && storedUserEmail) {
                    userId = storedUserId;
                    userEmail = storedUserEmail;
                    console.log("Loaded user from localStorage:", userId);
                }
                loadingUser = false; // User loading is complete
                renderApp(); // Initial render after loading user
            }
            catch (error) {
                console.error("Failed to initialize Firebase Firestore:", error);
                showModal("Failed to initialize Firebase Firestore: ".concat(error.message));
                loadingUser = false;
                renderApp(); // Render even if initialization fails
            }
            return [2 /*return*/];
        });
    });
}
// --- Firestore Data Listener ---
var unsubscribeTournaments = null; // To store the unsubscribe function
function setupFirestoreListener() {
    if (unsubscribeTournaments) {
        unsubscribeTournaments(); // Unsubscribe from previous listener if exists
    }
    if (!db || !userId) {
        console.log("Firestore not ready or userId not available. Skipping data fetch.");
        tournaments = []; // Clear tournaments if user logs out or not available
        renderApp(); // Re-render to show empty state
        return;
    }
    console.log("Attempting to fetch tournaments for userId: ".concat(userId));
    var userTournamentsCollectionRef = (0, firebase_firestore_js_1.collection)(db, "artifacts/".concat(appId, "/users/").concat(userId, "/tournaments"));
    var q = (0, firebase_firestore_js_1.query)(userTournamentsCollectionRef);
    unsubscribeTournaments = (0, firebase_firestore_js_1.onSnapshot)(q, function (snapshot) {
        tournaments = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
        console.log("Fetched tournaments:", tournaments);
        renderApp(); // Re-render when data changes
    }, function (error) {
        console.error("Error fetching tournaments:", error);
        showModal("Error fetching tournaments: ".concat(error.message));
    });
}
// --- Authentication Handlers (calling FastAPI) ---
function handleLogin(e) {
    return __awaiter(this, void 0, void 0, function () {
        var emailInput, passwordInput, email, password, response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    emailInput = document.getElementById('loginEmail');
                    passwordInput = document.getElementById('loginPassword');
                    email = emailInput.value;
                    password = passwordInput.value;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("".concat(fastApiBaseUrl, "/login"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, password: password }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        userId = data.user_id;
                        userEmail = email; // Assume FastAPI sends back the email or we use the input
                        localStorage.setItem('chessTournamentUserId', userId);
                        localStorage.setItem('chessTournamentUserEmail', userEmail);
                        showModal("Logged in successfully!");
                        currentView = 'home';
                        renderApp(); // Re-render after login
                        setupFirestoreListener(); // Setup listener for new user
                    }
                    else {
                        throw new Error(data.detail || 'Login failed');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("Error logging in:", error_1);
                    showModal("Login failed: ".concat(error_1.message));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function handleSignup(e) {
    return __awaiter(this, void 0, void 0, function () {
        var emailInput, passwordInput, email, password, response, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    emailInput = document.getElementById('signupEmail');
                    passwordInput = document.getElementById('signupPassword');
                    email = emailInput.value;
                    password = passwordInput.value;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("".concat(fastApiBaseUrl, "/signup"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, password: password }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        userId = data.user_id;
                        userEmail = email; // Assume FastAPI sends back the email or we use the input
                        localStorage.setItem('chessTournamentUserId', userId);
                        localStorage.setItem('chessTournamentUserEmail', userEmail);
                        showModal("Account created and logged in successfully!");
                        currentView = 'home';
                        renderApp(); // Re-render after signup
                        setupFirestoreListener(); // Setup listener for new user
                    }
                    else {
                        throw new Error(data.detail || 'Signup failed');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.error("Error signing up:", error_2);
                    showModal("Signup failed: ".concat(error_2.message));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function handleLogout() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // Optionally, inform FastAPI about logout if it manages sessions
                    return [4 /*yield*/, fetch("".concat(fastApiBaseUrl, "/logout"), { method: 'POST' })];
                case 1:
                    // Optionally, inform FastAPI about logout if it manages sessions
                    _a.sent();
                    userId = null;
                    userEmail = null;
                    localStorage.removeItem('chessTournamentUserId');
                    localStorage.removeItem('chessTournamentUserEmail');
                    tournaments = []; // Clear tournaments on logout
                    showModal("Logged out successfully!");
                    currentView = 'home';
                    renderApp(); // Re-render after logout
                    setupFirestoreListener(); // Clear listener as user is logged out
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error("Error logging out:", error_3);
                    showModal("Logout failed: ".concat(error_3.message));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// --- Tournament Management Handlers ---
function handleSubmitNewTournament(e) {
    return __awaiter(this, void 0, void 0, function () {
        var tournamentNameInput, tournamentDateInput, tournamentTimeInput, tournamentLocationInput, tournamentPlayersInput, tournamentName, tournamentDate, tournamentTime, tournamentLocation, tournamentPlayers, playersArray, tournamentData, userTournamentsCollectionRef, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (!db || !userId) {
                        showModal("Database not ready or user not logged in. Please log in to create a tournament.");
                        return [2 /*return*/];
                    }
                    tournamentNameInput = document.getElementById('tournamentName');
                    tournamentDateInput = document.getElementById('tournamentDate');
                    tournamentTimeInput = document.getElementById('tournamentTime');
                    tournamentLocationInput = document.getElementById('tournamentLocation');
                    tournamentPlayersInput = document.getElementById('tournamentPlayers');
                    tournamentName = tournamentNameInput.value;
                    tournamentDate = tournamentDateInput.value;
                    tournamentTime = tournamentTimeInput.value;
                    tournamentLocation = tournamentLocationInput.value;
                    tournamentPlayers = tournamentPlayersInput.value;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    playersArray = tournamentPlayers.split(',').map(function (p) { return p.trim(); }).filter(function (p) { return p !== ''; });
                    tournamentData = {
                        name: tournamentName,
                        date: tournamentDate,
                        time: tournamentTime,
                        location: tournamentLocation,
                        players: playersArray,
                        createdAt: new Date().toISOString(), // Add a timestamp
                        createdBy: userId, // Link to the user who created it
                    };
                    userTournamentsCollectionRef = (0, firebase_firestore_js_1.collection)(db, "artifacts/".concat(appId, "/users/").concat(userId, "/tournaments"));
                    return [4 /*yield*/, (0, firebase_firestore_js_1.addDoc)(userTournamentsCollectionRef, tournamentData)];
                case 2:
                    _a.sent();
                    showModal("Tournament created successfully!");
                    // Clear form fields
                    tournamentNameInput.value = '';
                    tournamentDateInput.value = '';
                    tournamentTimeInput.value = '';
                    tournamentLocationInput.value = '';
                    tournamentPlayersInput.value = '';
                    currentView = 'viewTournaments';
                    renderApp(); // Re-render to show updated list
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error("Error adding tournament:", error_4);
                    showModal("Failed to create tournament: ".concat(error_4.message));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// --- View Rendering Functions ---
function renderHome() {
    var _a, _b;
    appContent.innerHTML = "\n        <div class=\"text-center p-8\">\n            <h1 class=\"text-4xl font-bold text-gray-800 mb-6\">Welcome to Chess Tournaments!</h1>\n            <p class=\"text-lg text-gray-600 mb-8\">\n                Organize and manage your chess tournaments with ease.\n            </p>\n            ".concat(userId ? "\n                <p class=\"text-md text-gray-700 mb-4\">\n                    You are logged in as: <span class=\"font-semibold\">".concat(userEmail || 'User', "</span>\n                    <br/>\n                    Your User ID: <span class=\"font-mono text-sm break-all\">").concat(userId, "</span>\n                </p>\n            ") : '', "\n            <div class=\"flex flex-col sm:flex-row justify-center gap-4\">\n                ").concat(userId ? "\n                    <button id=\"createTournamentBtnHome\" class=\"bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105\">\n                        Create New Tournament\n                    </button>\n                " : "\n                    <p class=\"text-gray-600 text-lg\">Please log in or sign up to create tournaments.</p>\n                ", "\n                <button id=\"viewTournamentsBtnHome\" class=\"bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105\">\n                    View My Tournaments\n                </button>\n            </div>\n        </div>\n    ");
    // Attach event listeners after rendering HTML
    if (userId) {
        (_a = document.getElementById('createTournamentBtnHome')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'createTournament'; renderApp(); });
    }
    (_b = document.getElementById('viewTournamentsBtnHome')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function () { currentView = 'viewTournaments'; renderApp(); });
}
function renderCreateTournament() {
    var _a, _b;
    appContent.innerHTML = "\n        <div class=\"p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg\">\n            <h2 class=\"text-3xl font-bold text-gray-800 mb-6 text-center\">Create New Tournament</h2>\n            ".concat(userId ? "\n                <form id=\"createTournamentForm\" class=\"space-y-6\">\n                    <div>\n                        <label for=\"tournamentName\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Tournament Name</label>\n                        <input\n                            type=\"text\"\n                            id=\"tournamentName\"\n                            name=\"name\"\n                            class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500\"\n                            placeholder=\"e.g., Grand Chess Championship\"\n                            required\n                        >\n                    </div>\n                    <div class=\"grid grid-cols-1 sm:grid-cols-2 gap-6\">\n                        <div>\n                            <label for=\"tournamentDate\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Date</label>\n                            <input\n                                type=\"date\"\n                                id=\"tournamentDate\"\n                                name=\"date\"\n                                class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500\"\n                                required\n                            >\n                        </div>\n                        <div>\n                            <label for=\"tournamentTime\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Time</label>\n                            <input\n                                type=\"time\"\n                                id=\"tournamentTime\"\n                                name=\"time\"\n                                class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500\"\n                                required\n                            >\n                        </div>\n                    </div>\n                    <div>\n                        <label for=\"tournamentLocation\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Location</label>\n                        <input\n                            type=\"text\"\n                            id=\"tournamentLocation\"\n                            name=\"location\"\n                            class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500\"\n                            placeholder=\"e.g., Online, Local Chess Club\"\n                            required\n                        >\n                    </div>\n                    <div>\n                        <label for=\"tournamentPlayers\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Players (comma-separated names)</label>\n                        <textarea\n                            id=\"tournamentPlayers\"\n                            name=\"players\"\n                            rows=\"4\"\n                            class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus-ring-blue-500\"\n                            placeholder=\"e.g., Magnus Carlsen, Hikaru Nakamura, Fabiano Caruana\"\n                            required\n                        ></textarea>\n                    </div>\n                    <div class=\"flex justify-end gap-4\">\n                        <button type=\"button\" id=\"cancelCreateBtn\" class=\"bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out\">\n                            Cancel\n                        </button>\n                        <button type=\"submit\" class=\"bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105\">\n                            Create Tournament\n                        </button>\n                    </div>\n                </form>\n            " : "\n                <p class=\"text-center text-gray-600 text-lg\">Please log in to create a new tournament.</p>\n            ", "\n        </div>\n    ");
    (_a = document.getElementById('cancelCreateBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'home'; renderApp(); });
    (_b = document.getElementById('createTournamentForm')) === null || _b === void 0 ? void 0 : _b.addEventListener('submit', handleSubmitNewTournament);
}
function renderViewTournaments() {
    var _a;
    var tournamentsHtml = '';
    var userTournaments = tournaments.filter(function (t) { return t.createdBy === userId; }); // Filter by current user
    if (loadingUser) {
        tournamentsHtml = "<p class=\"text-center text-gray-600\">Loading user session...</p>";
    }
    else if (!userId) {
        tournamentsHtml = "<p class=\"text-center text-gray-600\">Please log in to view your tournaments.</p>";
    }
    else if (userTournaments.length === 0) {
        tournamentsHtml = "<p class=\"text-center text-gray-600\">No tournaments created yet. Why not create one?</p>";
    }
    else {
        tournamentsHtml = "\n            <div class=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">\n                ".concat(userTournaments.map(function (tournament) { return "\n                    <div class=\"bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200\">\n                        <h3 class=\"text-xl font-semibold text-gray-800 mb-2\">".concat(tournament.name, "</h3>\n                        <p class=\"text-gray-600 text-sm mb-1\"><strong>Date:</strong> ").concat(tournament.date, "</p>\n                        <p class=\"text-gray-600 text-sm mb-1\"><strong>Time:</strong> ").concat(tournament.time, "</p>\n                        <p class=\"text-gray-600 text-sm mb-1\"><strong>Location:</strong> ").concat(tournament.location, "</p>\n                        <div class=\"mt-3\">\n                            <h4 class=\"text-md font-medium text-gray-700 mb-1\">Players:</h4>\n                            <ul class=\"list-disc list-inside text-gray-600 text-sm\">\n                                ").concat(tournament.players.map(function (player) { return "<li>".concat(player, "</li>"); }).join(''), "\n                            </ul>\n                        </div>\n                        <p class=\"text-gray-500 text-xs mt-2\">Created by: ").concat(tournament.createdBy, "</p>\n                    </div>\n                "); }).join(''), "\n            </div>\n        ");
    }
    appContent.innerHTML = "\n        <div class=\"p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg\">\n            <h2 class=\"text-3xl font-bold text-gray-800 mb-6 text-center\">My Tournaments</h2>\n            ".concat(tournamentsHtml, "\n            <div class=\"text-center mt-8\">\n                <button id=\"backToHomeBtnView\" class=\"bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out\">\n                    Back to Home\n                </button>\n            </div>\n        </div>\n    ");
    (_a = document.getElementById('backToHomeBtnView')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'home'; renderApp(); });
}
function renderLogin() {
    var _a, _b, _c;
    appContent.innerHTML = "\n        <div class=\"p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg\">\n            <h2 class=\"text-3xl font-bold text-gray-800 mb-6 text-center\">Login</h2>\n            <form id=\"loginForm\" class=\"space-y-6\">\n                <div>\n                    <label for=\"loginEmail\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Email</label>\n                    <input\n                        type=\"email\"\n                        id=\"loginEmail\"\n                        class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500\"\n                        placeholder=\"your@email.com\"\n                        required\n                    >\n                </div>\n                <div>\n                    <label for=\"loginPassword\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Password</label>\n                    <input\n                        type=\"password\"\n                        id=\"loginPassword\"\n                        class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500\"\n                        placeholder=\"********\"\n                        required\n                    >\n                </div>\n                <div class=\"flex justify-end gap-4\">\n                    <button type=\"button\" id=\"cancelLoginBtn\" class=\"bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out\">\n                        Cancel\n                    </button>\n                    <button type=\"submit\" class=\"bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105\">\n                        Login\n                    </button>\n                </div>\n            </form>\n            <p class=\"text-center text-gray-600 mt-6\">\n                Don't have an account?\n                <button id=\"goToSignupBtn\" class=\"text-blue-600 hover:underline font-semibold\">\n                    Sign Up\n                </button>\n            </p>\n        </div>\n    ";
    (_a = document.getElementById('cancelLoginBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'home'; renderApp(); });
    (_b = document.getElementById('loginForm')) === null || _b === void 0 ? void 0 : _b.addEventListener('submit', handleLogin);
    (_c = document.getElementById('goToSignupBtn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', function () { currentView = 'signup'; renderApp(); });
}
function renderSignup() {
    var _a, _b, _c;
    appContent.innerHTML = "\n        <div class=\"p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg\">\n            <h2 class=\"text-3xl font-bold text-gray-800 mb-6 text-center\">Sign Up</h2>\n            <form id=\"signupForm\" class=\"space-y-6\">\n                <div>\n                    <label for=\"signupEmail\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Email</label>\n                    <input\n                        type=\"email\"\n                        id=\"signupEmail\"\n                        class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500\"\n                        placeholder=\"your@email.com\"\n                        required\n                    >\n                </div>\n                <div>\n                    <label for=\"signupPassword\" class=\"block text-gray-700 text-sm font-semibold mb-2\">Password</label>\n                    <input\n                        type=\"password\"\n                        id=\"signupPassword\"\n                        class=\"w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500\"\n                        placeholder=\"********\"\n                        required\n                    >\n                </div>\n                <div class=\"flex justify-end gap-4\">\n                    <button type=\"button\" id=\"cancelSignupBtn\" class=\"bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out\">\n                        Cancel\n                    </button>\n                    <button type=\"submit\" class=\"bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105\">\n                        Sign Up\n                    </button>\n                </div>\n            </form>\n            <p class=\"text-center text-gray-600 mt-6\">\n                Already have an account?\n                <button id=\"goToLoginBtn\" class=\"text-blue-600 hover:underline font-semibold\">\n                    Login\n                </button>\n            </p>\n        </div>\n    ";
    (_a = document.getElementById('cancelSignupBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'home'; renderApp(); });
    (_b = document.getElementById('signupForm')) === null || _b === void 0 ? void 0 : _b.addEventListener('submit', handleSignup);
    (_c = document.getElementById('goToLoginBtn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', function () { currentView = 'login'; renderApp(); });
}
// --- Main Render Function ---
function renderApp() {
    var _a, _b, _c, _d, _e;
    // Render header authentication buttons
    if (userId) {
        authButtonsContainer.innerHTML = "\n            <button id=\"createBtnHeader\" class=\"text-gray-700 hover:text-blue-600 font-medium transition duration-200\">\n                Create\n            </button>\n            <button id=\"viewBtnHeader\" class=\"text-gray-700 hover:text-blue-600 font-medium transition duration-200\">\n                View My Tournaments\n            </button>\n            <span class=\"text-gray-600 text-sm hidden md:inline\">\n                Welcome, ".concat(userEmail || 'User', "\n            </span>\n            <button id=\"logoutBtnHeader\" class=\"bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300\">\n                Logout\n            </button>\n        ");
        (_a = document.getElementById('createBtnHeader')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function () { currentView = 'createTournament'; renderApp(); });
        (_b = document.getElementById('viewBtnHeader')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', function () { currentView = 'viewTournaments'; renderApp(); });
        (_c = document.getElementById('logoutBtnHeader')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', handleLogout);
    }
    else {
        authButtonsContainer.innerHTML = "\n            <button id=\"loginBtnHeader\" class=\"bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300\">\n                Login\n            </button>\n            <button id=\"signupBtnHeader\" class=\"bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300\">\n                Sign Up\n            </button>\n        ";
        (_d = document.getElementById('loginBtnHeader')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', function () { currentView = 'login'; renderApp(); });
        (_e = document.getElementById('signupBtnHeader')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', function () { currentView = 'signup'; renderApp(); });
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
window.onload = function () {
    initializeAppAndUser(); // Initialize Firebase and load user from localStorage
    setupFirestoreListener(); // Set up Firestore listener (will only fetch if userId is present)
    // Attach global event listener for Home button
    homeBtn.addEventListener('click', function () { currentView = 'home'; renderApp(); });
};
