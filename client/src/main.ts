import { homeBtn, logoHome, modalCloseBtn } from "./dom.js";
import { Modal } from "./utils/general.js";
import { renderApp } from "./views/home.js";
import Cookies from 'js-cookie'

import {
    setCurrentView,
    setUserUsername,
    setUserId,
    setToken,
    setRefreshToken,
} from './state.js'

function attachGlobalEvents() {
    homeBtn.addEventListener('click', () => {
        setCurrentView('home');
        renderApp();
    });
    logoHome.addEventListener('click', () => {
        setCurrentView('home');
        renderApp();
    });
    modalCloseBtn.addEventListener('click', Modal.close);
}

window.onload = function() {
    setUserId(Cookies.get('chessTournamentUserId')!);
    setUserUsername(Cookies.get('chessTournamentUsername')!);
    renderApp();

    // To be implemented properly.
    const urlParams = new URLSearchParams(window.location.search);
    const verificationToken = urlParams.get('verify');
    if (verificationToken) {
        Modal.show("Your account has been verified! You can now log in.");
    }
    attachGlobalEvents();
};