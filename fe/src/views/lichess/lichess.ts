import { appContent } from "../../dom.js";

import {
    getLichessUserInfo,
} from '../../api/lichessAPI.js'

import { tabBase, tabActive, tabInactive } from '../../utils/navigationUtils.js';

import { renderProfileSection } from './lichessProfile.js'

import { renderChallengeTab } from './lichessChallenges.js'

import { renderOngoingGames } from './lichessGames.js'

import { currentPollingCleanup } from '../../utils/lichessUtils.js';

import { Modal } from "../../utils/general.js";
import { setCurrentView } from "../../state.js";
import { renderApp } from "../home.js";

async function renderLichessTabContent() {
    const tab = (window as any).lichessTab;
    const container = document.getElementById('lichessTabContent');
    if (!container) return;

    // Always show spinner first
    //! FIX for other tabs.
    container.innerHTML = `
        <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-50 mb-4"></div>
            <span class="text-lg text-gray-600">Loading...</span>
        </div>
    `;

    if (tab === 'userInfo') {
        try {
            const profile = await getLichessUserInfo();
            container.innerHTML = renderProfileSection(profile);
        } catch (error: any) {
            Modal.show(error)
            setCurrentView('viewUser')
            renderApp()
        }
    } else if (tab === 'userChallenges') {
        renderChallengeTab();
    } else if (tab === 'userGames') {
        await renderOngoingGames();
    }
}

export function attachLichessTabListeners() {
    document.getElementById('userInfo')?.addEventListener('click', async () => {
        (window as any).lichessTab = 'userInfo';
        await renderLichess();
    });
    document.getElementById('userChallenges')?.addEventListener('click', async () => {
        (window as any).lichessTab = 'userChallenges';
        await renderLichess();
    });
    document.getElementById('userGames')?.addEventListener('click', async () => {
        (window as any).lichessTab = 'userGames';
        await renderLichess();
    });
}

export async function renderLichess() {
    if (currentPollingCleanup) currentPollingCleanup();

    //! Default to userInfo tab if not set
    if (!(window as any).lichessTab) (window as any).lichessTab = 'userInfo';

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div class="flex border-b mb-6 space-x-4">
                <button id="userInfo" class="${tabBase} ${(window as any).lichessTab === 'userInfo' ? tabActive : tabInactive}">Profile</button>
                <button id="userChallenges" class="${tabBase} ${(window as any).lichessTab === 'userChallenges' ? tabActive : tabInactive}">Challenges</button>
                <button id="userGames" class="${tabBase} ${(window as any).lichessTab === 'userGames' ? tabActive : tabInactive}">Games</button>
            </div>
            <div id="lichessTabContent"></div>
        </div>
    `;

    await renderLichessTabContent();
    attachLichessTabListeners();
}