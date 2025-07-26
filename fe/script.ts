import { homeBtn, logoHome, modalCloseBtn } from "./dom.js";
import { Modal } from "./utils/general.js";
import { setCurrentView } from "./state.js";
import { renderApp } from "./views/home.js";

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
    renderApp();


    // To be implemented properly.
    const urlParams = new URLSearchParams(window.location.search);
    const verificationToken = urlParams.get('verify');
    if (verificationToken) {
        Modal.show("Your account has been verified! You can now log in.");
    }
    attachGlobalEvents();
};