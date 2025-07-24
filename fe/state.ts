import { Tournament } from './types';

// --- Private state variables ---
let userId: string | null = null;
let userUsername: string | null = null;
let userEmail: string | null = null;
let refresh_token: string | null = null;
let token: string | null = null;
let currentView: string = 'home';

let selectedRoundIdx: number = 0;
let playerSortColumn: 'name' | 'rating' = 'name';
let playerSortDirection: 'asc' | 'desc' = 'asc';

let _tournaments: Tournament[] = [];
let _currentTournament: Tournament | null = null;

// --- Getters and setters ---
export function setUserId(id: string | null) {
    userId = id;
}
export function getUserId(): string | null {
    return userId;
}

export function setUserUsername(username: string | null) {
    userUsername = username;
}
export function getUserUsername(): string | null {
    return userUsername;
}

export function setUserEmail(email: string | null) {
    userEmail = email;
}
export function getUserEmail(): string | null {
    return userEmail;
}

export function setRefreshToken(tokenValue: string | null) {
    refresh_token = tokenValue;
}
export function getRefreshToken(): string | null {
    return refresh_token;
}

export function setToken(newToken: string | null) {
    token = newToken;
}
export function getToken(): string | null {
    return token;
}

export function setCurrentView(newCurrentView: string) {
    currentView = newCurrentView;
}
export function getCurrentView(): string {
    return currentView;
}

export function setSelectedRoundIdx(roundIdx: number) {
    selectedRoundIdx = roundIdx;
}
export function getSelectedRoundIdx(): number {
    return selectedRoundIdx;
}

export function setPlayerSortColumn(sortBy: 'name' | 'rating') {
    playerSortColumn = sortBy;
}
export function getPlayerSortColumn(): 'name' | 'rating' {
    return playerSortColumn;
}

export function setPlayerSortDirection(sortOrder: 'asc' | 'desc') {
    playerSortDirection = sortOrder;
}
export function getPlayerSortDirection(): 'asc' | 'desc' {
    return playerSortDirection;
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