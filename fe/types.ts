
export interface User {
    id?: number,
    username: string;
    password?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    is_verified?: boolean;
}

export type UserUpdate = {
    username?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
};

export interface Player {
    id: number;
    name: string;
    rating: number;
    tournament_id: number;
}

export type PlayerUpdate = {
    name?: string;
    rating?: number;
}

export interface Round {
    id: number;
    round_number: number;
    matchups: Matchup[];
}

export enum TournamentStatus {
    NotStarted = "Not Started",
    Ongoing = "Ongoing",
    Finished = "Finished"
}

export enum TournamentTimeControl {
    BULLET = "Bullet",
    BLITZ = "Blitz",
    RAPID = "Rapid",
    CLASSICAL = "Classical"
}

export type MatchResult = "White-Wins" | "Black-Wins" | "Draw" | "";

export interface Matchup {
    id: number;
    white_player: Player;
    black_player: Player;
    result?: MatchResult;
}

export type MatchupResult = { matchupId: string; result: string };

export interface Tournament {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    nb_of_players: number;
    time_control: TournamentTimeControl;
    format: string;
    status: TournamentStatus;
    players?: Array<Player>;
    rounds?: Array<Round>;
}