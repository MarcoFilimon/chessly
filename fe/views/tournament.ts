import {
    getUserId,
    setTournaments,
} from '../state.js'

import {
    fetchTournaments,
} from '../api.js'

import {renderTournamentsTabContent, attachTournamentCreateListeners} from '../utils/tournamentUtils.js'
import {appContent} from '../dom.js'

import {
    attachTournamentOperationListeners,
    renderTournamentForm,
} from '../utils/tournamentUtils.js'


export function renderCreateTournament(): void {
    appContent.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Create New Tournament</h2>
            ${getUserId() ? renderTournamentForm({
                formId: 'createTournamentForm',
                submitLabel: 'Create',
                showGenerate: true,
                cancelBtnId: 'cancelCreateBtn'
            }) : `<p class="text-center text-gray-600 text-lg">Please log in to create a new tournament.</p>`}
        </div>
    `;
    attachTournamentCreateListeners();
}

export async function renderViewTournaments(): Promise<void> {
    let tournamentsHtml = '';
    try {
        setTournaments(await fetchTournaments());
        tournamentsHtml = renderTournamentsTabContent();
    } catch (error: any) {
        tournamentsHtml = `<p class="text-center text-red-600">Failed to load tournaments: ${error.message}</p>`;
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
