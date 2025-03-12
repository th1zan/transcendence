import { logout } from './auth.js';
import { changeLanguage, navigateTo, logger } from "./app.js";

export async function fetchAndStoreAvatarUrl() {
  try {
    const response = await fetch("/api/auth/user/", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user data.");
    }
    const user = await response.json();
    const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";
    localStorage.setItem("avatarUrl", avatarUrl);
    return avatarUrl;
  } catch (error) {
    logger.error("Error fetching avatar URL:", error);
    const defaultUrl = "/media/avatars/avatar1.png";
    localStorage.setItem("avatarUrl", defaultUrl);
    return defaultUrl;
  }
}

export async function displayMenu(avatarUrl = null) {
  const avatarPicture = avatarUrl || await fetchAndStoreAvatarUrl();

  document.getElementById('app_top').className = 'semi-transparent-bg p-3 text-dark';
  document.getElementById('app_main').className = 'semi-transparent-bg flex-grow-1 p-3 text-dark';
  document.getElementById('app_bottom').className = 'semi-transparent-bg p-3 text-dark';

  const menuDiv = document.getElementById("menu");
  if (!menuDiv) {
    logger.error("Element #menu not found in DOM");
    return;
  }

  menuDiv.innerHTML = `
      <div class="container-fluid">
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
              <div class="menu-container d-flex flex-column h-100" style="width: 300px;">
                  <img src="${avatarPicture}" class="rounded-circle object-fit-cover align-self-center my-4" alt="${i18next.t('menu.profilePicture')}" />
                  <button id="welcomeButton" style="word-break: auto-phrase;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.welcome')}</button>
                  <button id="playButton" style="word-break: auto-phrase;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.play')}</button>
                  <button id="tournamentButton" style="word-break: break-all;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.tournament')}</button>
                  <button id="statsButton" style="word-break: break-all;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.statistics')}</button>
                  <button id="friendsButton" style="word-break: break-all;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.friends')}</button>
                  <div class="flex-grow-1"></div>
                  <button id="settingsButton" style="word-break: break-all;" class="btn btn-primary nav-link menu-button w-100 mb-2">${i18next.t('menu.settings')}</button>
                  <button id="logoutButton" style="word-break: break-all;" class="btn btn-danger nav-link menu-button w-100 mb-2">${i18next.t('menu.logout')}</button>
              </div>
          </div>
      </div>
  `;

  // Ajouter les écouteurs d'événements
  document.getElementById("welcomeButton").addEventListener("click", () => navigateTo('welcome'));
  document.getElementById("playButton").addEventListener("click", () => navigateTo('game'));
  document.getElementById("tournamentButton").addEventListener("click", () => navigateTo('tournament'));
  document.getElementById("statsButton").addEventListener("click", () => navigateTo('stats'));
  document.getElementById("friendsButton").addEventListener("click", () => navigateTo('friends'));
  document.getElementById("settingsButton").addEventListener("click", () => navigateTo('settings'));
  document.getElementById("logoutButton").addEventListener("click", logout);

  const menu = document.getElementById('menu');
  const navbarCollapse = menu.querySelector('.navbar-collapse');

  function hideMenuIfScroll() {
      const scrollThreshold = 200; // Seuil en pixels (ajustable selon tes besoins)
      const scrollPosition = window.scrollY || window.pageYOffset;

      if (scrollPosition > scrollThreshold) {
          navbarCollapse.classList.remove('show'); // Ferme le menu si ouvert
      }
  }

  // Écouter le défilement de la page
  window.addEventListener('scroll', hideMenuIfScroll);

  // Initialiser l’état au chargement
  hideMenuIfScroll();
}
