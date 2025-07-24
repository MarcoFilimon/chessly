
export interface Player {
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

export enum TournamentTimeControl {
    BULLET = "Bullet",
    BLITZ = "Blitz",
    RAPID = "Rapid",
    CLASICCAL = "Classical"
}

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
    players: Player[];
    rounds: Array<any>;
}

export interface Matchup {
    id: number;
    white_player: Player;
    black_player: Player;
    result?: string;
}