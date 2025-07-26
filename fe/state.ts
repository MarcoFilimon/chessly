import { Tournament } from './types.js';

// --- State variables (saved in local storage) ---
let _userId: string | null = null;
let _userUsername: string | null = null;
let _userFirstName: string | null = null;
let _userLastName: string | null = null;
let _userEmail: string | null = null;
let _refresh_token: string | null = null;
let _token: string | null = null;

// --- Other state variables ---

let _selectedRoundIdx: number = 0;
let _playerSortColumn: 'name' | 'rating' = 'name';
let _playerSortDirection: 'asc' | 'desc' = 'asc';

let _tournaments: Tournament[] = [];
let _currentTournament: Tournament | null = null;

type View = 'home' | 'viewTournamentDetail' | 'viewTournamentPlayers' |
            'viewTournamentGames' | 'viewTournamentResults' | 'createTournament' |
            'viewTournaments' | 'signup' | 'login' | 'viewUser';
let _currentView: View = 'home'; // default is home


// --- Getters and setters ---
export function setUserId(id: string | null) {
    _userId = id;
}
export function getUserId(): string | null {
    return _userId;
}

export function setUserUsername(username: string | null) {
    _userUsername = username;
}
export function getUserUsername(): string | null {
    return _userUsername;
}

export function setFirstName(firstName: string | null) {
    _userFirstName = firstName;
}
export function getFirstName(): string | null {
    return _userFirstName;
}

export function setLastName(lastName: string | null) {
    _userLastName = lastName;
}
export function getLastName(): string | null {
    return _userLastName;
}

export function setUserEmail(email: string | null) {
    _userEmail = email;
}

export function getUserEmail(): string | null {
    return _userEmail;
}

export function setRefreshToken(tokenValue: string | null) {
    _refresh_token = tokenValue;
}
export function getRefreshToken(): string | null {
    return _refresh_token;
}

export function setToken(newToken: string | null) {
    _token = newToken;
}
export function getToken(): string | null {
    return _token;
}

export function setCurrentView(newCurrentView: View) {
    _currentView = newCurrentView;
}
export function getCurrentView(): View {
    return _currentView;
}

export function setSelectedRoundIdx(roundIdx: number) {
    _selectedRoundIdx = roundIdx;
}
export function getSelectedRoundIdx(): number {
    return _selectedRoundIdx;
}

export function setPlayerSortColumn(sortBy: 'name' | 'rating') {
    _playerSortColumn = sortBy;
}
export function getPlayerSortColumn(): 'name' | 'rating' {
    return _playerSortColumn;
}

export function setPlayerSortDirection(sortOrder: 'asc' | 'desc') {
    _playerSortDirection = sortOrder;
}
export function getPlayerSortDirection(): 'asc' | 'desc' {
    return _playerSortDirection;
}

export function setTournaments(tournaments: Tournament[]) {
    _tournaments = tournaments;
}
export function getTournaments(): Tournament[] {
    return _tournaments;
}

export function setCurrentTournament(tournament: Tournament | null) {
    _currentTournament = tournament;
}
export function getCurrentTournament(): Tournament | null {
    return _currentTournament;
}