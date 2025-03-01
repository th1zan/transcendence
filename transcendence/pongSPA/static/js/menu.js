import { logout } from './auth.js';
import { navigateTo, logger } from "./app.js";


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
    return avatarUrl; // Retourne l'URL pour un usage éventuel
  } catch (error) {
    logger.error("Error fetching avatar URL:", error);
    const defaultUrl = "/media/avatars/avatar1.png";
    localStorage.setItem("avatarUrl", defaultUrl);
    return defaultUrl;
  }
}

export async function displayMenu(avatarUrl = null) {
  const avatarPicture = avatarUrl || await fetchAndStoreAvatarUrl();
 
  ;// Vider les conteneurs
  document.getElementById('app_top').className = 'semi-transparent-bg p-3 text-dark';
  document.getElementById('app_main').className = 'semi-transparent-bg flex-grow-1 p-3 text-dark';
  document.getElementById('app_bottom').className = 'semi-transparent-bg p-3 text-dark';

  // Class et CSS pour le conteneur du menu
  const menuDiv = document.getElementById("menu");

  menuDiv.innerHTML = `
      <div class="container-fluid">
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
              <div class="menu-container d-flex flex-column h-100 w-100">
                  <img src="${avatarPicture}"  class="rounded-circle object-fit-cover align-self-center my-4" alt="Profile picture"  />
                  
                  <button id="welcomeButton" class="btn btn-primary nav-link menu-button w-100 mb-2">Welcome page</button>
                  <button id="playButton" class="btn btn-primary nav-link menu-button w-100 mb-2" role="button">Play a game</button>
                  <button id="tournamentButton" class="btn btn-primary nav-link menu-button w-100 mb-2">Tournament</button>
                  <button id="statsButton" class="btn btn-primary nav-link menu-button w-100 mb-2">Statistics</button>
                  <button id="friendsButton" class="btn btn-primary nav-link menu-button w-100 mb-2">Friends</button>
                  <div class="flex-grow-1"></div>
                  <button id="settingsButton" class="btn btn-primary nav-link menu-button w-100 mb-2">Settings</button>
                  <button id="logoutButton" class="btn btn-danger nav-link menu-button w-100 mb-2">Logout</button>
              </div>
          </div>
      </div>
  `;

  // Ajouter les écouteurs d'événements après avoir inséré le HTML
  document.getElementById("welcomeButton").addEventListener("click", function() {
      navigateTo('welcome');
  });

  document.getElementById("playButton").addEventListener("click", function() {
      navigateTo('game');
  });

  document.getElementById("tournamentButton").addEventListener("click", function() {
      navigateTo('tournament');
  });

  document.getElementById("statsButton").addEventListener("click", function() {
      navigateTo('stats');
  });

  document.getElementById("friendsButton").addEventListener("click", function() {
      navigateTo('friends');
  });

  document.getElementById("settingsButton").addEventListener("click", function() {
      navigateTo('settings');
  });

  document.getElementById("logoutButton").addEventListener("click", function() {
      logout();
  });
}


document.addEventListener('DOMContentLoaded', () => {

    const menu = document.getElementById('menu');
    const navbarToggler = menu.querySelector('.navbar-toggler');
    const navbarCollapse = menu.querySelector('.navbar-collapse');

    function toggleMenuBasedOnScroll() {
        const scrollThreshold = 200; // Seuil en pixels (ajustable selon tes besoins)
        const scrollPosition = window.scrollY || window.pageYOffset;

        if (scrollPosition > scrollThreshold) {
            // Passer en mode burger
            menu.classList.remove('col-md-2');
            menu.classList.add('col-12');
            navbarToggler.style.display = 'block'; // Montre le bouton hamburger
            navbarCollapse.classList.remove('show'); // Ferme le menu si ouvert
            navbarCollapse.classList.add('collapse'); // Assure que le menu est collapsé
        } else {
            // Retourner en mode menu latéral
            menu.classList.remove('col-12');
            menu.classList.add('col-md-2');
            navbarToggler.style.display = 'none'; // Cache le bouton hamburger sur grands écrans
            navbarCollapse.classList.remove('collapse'); // Assure que le menu est visible
            navbarCollapse.classList.add('show'); // Ouvre le menu sur grands écrans
        }
    }

    // Écouter le défilement de la page
    window.addEventListener('scroll', toggleMenuBasedOnScroll);

    // Initialiser l’état au chargement
    toggleMenuBasedOnScroll();
});
