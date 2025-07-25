import { homeBtn, logoHome, modalCloseBtn } from "./dom";
import { Modal } from "./utils/general";
import { setCurrentView } from "./state";
import { renderApp } from "./views/home";

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
    attachGlobalEvents();
};