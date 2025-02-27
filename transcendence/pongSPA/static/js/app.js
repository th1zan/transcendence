import { startGameSetup, gameInterval, stopGameProcess } from "./pong.js";
import { displayStats } from "./stats.js";
import { validateToken } from "./auth.js";
import { createTournamentForm, validateSearch, displayUserTournaments, checkUserExists, checkPlayerExists } from "./tournament.js";
import {
  anonymizeAccount,
  createAccount,
  deleteAccount,
  getToken,
  logout,
  refreshToken,
  updateProfile,
  uploadAvatar,
  getCookie,
  toggle2FA,
  update2FAStatus,
  verifyOTP,
  verify2FALogin,
} from "./auth.js";
import { sendFriendRequest, respondToFriendRequest, fetchFriends, fetchFriendRequests, removeFriend } from "./friends.js";
import { displayConnectionFormular, displayRegistrationForm } from "./login.js";
import { displayMenu } from "./menu.js";
import { loadPrivacyPolicyModal } from "./privacy_policy.js";


let isUserLoggedIn = false; //false for connection formular

document.addEventListener("DOMContentLoaded", () => {

  console.log('Cookies at DOM load:', document.cookie);

  //when the DOM is loaded, this event is triggered and it will:

  //  0. Clear all cookies
  //
  //  COMMENTED FOR DEBUGIN
  // document.cookie.split(";").forEach((c) => {
  //   console.log('clear the cookies');
  //   document.cookie = c
  //     .replace(/^ +/, "")
  //     .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  // });

  loadPrivacyPolicyModal();

  // 1. Determine the initial route based on the URL hash
  let initialRoute = window.location.hash.replace('#', '') || 'login';
  console.log('Initial route determined:', initialRoute);

  // Variable globale pour l'état de connexion
  let isUserLoggedIn = false;

  // 2. Check if the user is logged in
  validateToken().then((isTokenValid) => {
    console.log('validateToken resolved with:', isTokenValid);
    isUserLoggedIn = isTokenValid;
    if (isUserLoggedIn) {
      console.log('User is logged in based on cookies');
    } else {
      console.log('User is not logged in');
    }

    // 3. Set initial state based on login status and initial route
    if (isUserLoggedIn && initialRoute === 'login') {
      console.log('User logged in but on login page, redirecting to welcome');
      initialRoute = 'welcome';
      history.replaceState({ page: 'welcome' }, ' ', '#welcome');
    } else if (!isUserLoggedIn && initialRoute !== 'login') {
      console.log('User not logged in but not on login page, redirecting to login');
      initialRoute = 'login';
      history.replaceState({ page: 'login' }, 'Login', '#login');
    }

    // Handle the initial route
    console.log('Calling handleRouteChange with route:', initialRoute);
    handleRouteChange(initialRoute);
  }).catch((error) => {
    console.error('Error checking user login status:', error);
    console.log('User is not logged in due to an error');
    handleRouteChange('login');
  });

  // 4. Plan the refreshing interval for the authentication Token
  console.log('Setting up token refresh interval');
  setInterval(async () => {
    console.log('Refreshing token via interval...');
    const refreshed = await refreshToken();
    if (!refreshed) {
      console.warn('Interval refresh failed, consider re-authenticating.');
      showModal(
        'Warning',
        'Your session may have expired. Please log in again.',
        'OK',
        () => navigateTo('login')
      );
    }
  }, 10 * 60 * 1000); // Rafraîchir toutes les 10 minutes

  // 5. Listener for history changes
  window.addEventListener("popstate", function (event) {
    console.log('Popstate event triggered. Current state:', event.state);
    let route;
    if (event.state) {
      route = event.state.page;
    } else {
      route = window.location.hash.replace('#', '') || 'welcome';
    }
    console.log('Navigating to route:', route);
    console.log('Custom History:', customHistory);
    handleRouteChange(route);
  });
});

// Variable pour stocker l'historique des routes
let customHistory = [];

// Fonction pour ajouter à l'historique personnalisé
function addToCustomHistory(route) {
  if (customHistory[customHistory.length - 1] !== route) {
    customHistory.push(route);
  }
  console.log('Custom History updated:', customHistory);
}

// Fonction pour naviguer et mettre à jour l'UI
export function navigateTo(route) {
  console.log('Navigating to:', route);

  // Vérifier si le jeu Pong est en cours et l'arrêter
  if (gameInterval) {
    console.log("Game is running. Stopping game before navigation...");
    stopGameProcess(false); // Ne pas marquer comme terminé, juste arrêter
  }

  history.pushState({ page: route }, '', `#${route}`);
  console.log('pushstate: ', history.state);
  addToCustomHistory(route);
  handleRouteChange(route);
}

// Fonction pour mettre à jour l'interface complète
function updateUI(routeFunction) {
  // Chargement du menu
  displayMenu();

  // Puis, mettez à jour la partie principale en fonction de la route
  routeFunction();
}

let redirectAttempts = 0;
const MAX_REDIRECT_ATTEMPTS = 3;

function handleRouteChange(route) {
  console.log('handleRouteChange called with route:', route);
  addToCustomHistory(route);

  if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
    console.error('Maximum redirect attempts reached, stopping to prevent infinite loop');
    showModal(
      'Error',
      'An authentication error occurred. Please refresh the page or log in again.',
      'OK',
      () => navigateTo('login')
    );
    return;
  }

  validateToken().then((isTokenValid) => {
    console.log('Token validation in handleRouteChange:', isTokenValid);
    isUserLoggedIn = isTokenValid;

    const publicRoutes = ['login', 'register'];

    if (publicRoutes.includes(route) || isUserLoggedIn) {
      console.log('Route is public or user is logged in');
      redirectAttempts = 0; // Réinitialiser le compteur si la validation réussit
      switch (route) {
        case 'login':
          if (!isUserLoggedIn) {
            displayConnectionFormular();
          } else {
            navigateTo('welcome'); // Rediriger vers /welcome pour rester cohérent
          }
          break;
        case 'register':
          displayRegistrationForm();
          break;
        case 'welcome':
          updateUI(displayWelcomePage);
          break;
        case 'game':
          updateUI(displayGameForm);
          break;
        case 'tournament':
          updateUI(displayTournament);
          break;
        case 'stats':
          updateUI(displayStats);
          break;
        case 'userStats':
          updateUI(fetchResultats);
          break;
        case 'ranking':
          updateUI(fetchRanking);
          break;
        case 'friends':
          updateUI(displayFriends);
          break;
        case 'settings':
          updateUI(displaySettings);
          break;
        default:
          console.log('Unknown route:', route);
          if (!isUserLoggedIn) {
            navigateTo('login');
          } else {
            navigateTo('welcome'); // Rediriger vers /welcome par défaut
          }
      }
    } else {
      console.log('User not logged in, attempting to refresh token before redirect');
      refreshToken().then(refreshed => {
        if (refreshed) {
          console.log('Token refreshed successfully, retrying route change');
          redirectAttempts = 0; // Réinitialiser après succès
          handleRouteChange(route); // Réessayer une seule fois
        } else {
          console.log('Refresh failed, redirecting to login');
          redirectAttempts++;
          navigateTo('login');
        }
      }).catch(error => {
        console.error('Error refreshing token during redirect:', error);
        redirectAttempts++;
        navigateTo('login');
      });
    }
  }).catch((error) => {
    console.error('Error validating token during route change:', error);
    refreshToken().then(refreshed => {
      if (refreshed) {
        console.log('Token refreshed successfully after validation error, retrying route change');
        redirectAttempts = 0;
        handleRouteChange(route); // Réessayer une seule fois
      } else {
        console.log('Refresh failed after validation error, redirecting to login');
        redirectAttempts++;
        navigateTo('login');
      }
    }).catch(error => {
      console.error('Error refreshing token after validation failure:', error);
      redirectAttempts++;
      navigateTo('login');
    });
  });
}

export function showModal(title, message, actionText, actionCallback) {
  const modalId = 'oneButtonModal';
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    console.error(`Modal element with ID ${modalId} not found`);
    return;
  }

  const modal = new bootstrap.Modal(modalElement, {
    backdrop: 'static', // Empêche la fermeture en cliquant à côté
    keyboard: false     // Empêche la fermeture avec la touche Échap
  });

  // Mise à jour du titre
  const titleElement = document.getElementById(`${modalId}Label`);
  if (titleElement) {
    titleElement.textContent = title;
  } else {
    console.error(`Title element for ${modalId}Label not found`);
  }

  // Mise à jour du message
  const bodyElement = document.getElementById(`${modalId}Body`);
  if (bodyElement) {
    bodyElement.textContent = message;
  } else {
    console.error(`Modal body element not found for ${modalId}`);
  }

  // Mise à jour du bouton d'action
  const actionButton = document.getElementById(`${modalId}Action`);
  if (actionButton) {
    actionButton.textContent = actionText || 'Close'; // Utiliser actionText ou "Close" par défaut
    actionButton.removeEventListener('click', actionButton.handler);
    actionButton.addEventListener('click', function handler() {
      if (actionCallback) {
        actionCallback(); // Exécuter l’action supplémentaire si nécessaire
      }
      modal.hide(); // Toujours fermer la modale après l’action
    });
    actionButton.handler = actionButton.onclick;
  } else {
    console.error(`Action button for ${modalId}Action not found`);
  }

  // Affiche la modale et déplace le focus
  modal.show();
  if (actionButton) {
    actionButton.focus();
  }
}

function displayQuickStats(data, playerName) {
  // Vérifier si les données sont invalides ou vides
  if (!Array.isArray(data) || data.length === 0) {
    return `
      <div class="card shadow-sm pending-tournament-card">
          <div class="card-body">
              <h4 class="card-title mb-3">Quick Stats for ${playerName || "You"}</h4>
              <div>
                  <ul class="list-group" id="quickStatsList">
                      <li class="list-group-item text-center" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">No data available.</li>
                  </ul>
              </div>
          </div>
      </div>
    `;
  }

  const playedMatches = data.filter(match => match.is_played === true);
  if (playedMatches.length === 0) {
    return `
      <div class="card shadow-sm pending-tournament-card">
          <div class="card-body">
              <h4 class="card-title mb-3">Quick Stats for ${playerName || "You"}</h4>
              <div>
                  <ul class="list-group" id="quickStatsList">
                      <li class="list-group-item text-center" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">No data available.</li>
                  </ul>
              </div>
          </div>
      </div>
    `;
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;
  const normalizedPlayerName = (playerName || "You").toLowerCase();

  const sortedMatches = playedMatches.sort((a, b) => new Date(b.date_played) - new Date(a.date_played));

  playedMatches.forEach((match) => {
    const isPlayer1 = match.player1_name.toLowerCase() === normalizedPlayerName;
    const isPlayer2 = match.player2_name.toLowerCase() === normalizedPlayerName;
    const winnerName = (match.winner_name || "").toLowerCase();

    if (!isPlayer1 && !isPlayer2) return;

    if (winnerName === normalizedPlayerName) {
      wins++;
    } else if (winnerName && winnerName !== "no winner" && winnerName !== "in progress" && winnerName !== "") {
      losses++;
    } else {
      draws++;
    }
  });

  const lastThreeMatches = sortedMatches.slice(0, 3);
  let lastMatchesTable = '';
  if (lastThreeMatches.length > 0) {
    lastMatchesTable = `
      <table class="table table-sm table-striped bg-transparent border border-white" style="background: rgba(255, 255, 255, 0.9); border-radius: 10px;">
        <thead>
          <tr>
            <th scope="col">Match</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          ${lastThreeMatches.map(match => {
            const player1 = match.player1_name || "Unknown Player 1";
            const player2 = match.player2_name || "Unknown Player 2";
            const setScore = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
            return `
              <tr class="bg-transparent">
                <td class="bg-transparent">${player1} vs ${player2}</td>
                <td class="bg-transparent">${setScore}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    lastMatchesTable = '<p class="text-muted small">No recent matches.</p>';
  }

  return `
    <div class="card mb-4 shadow-sm h-100 bg-transparent" style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
      <div class="card-body">
        <h4 class="card-title">Quick Stats for ${playerName || "You"}</h4>
        <ul class="list-group list-group-flush mb-3">
          <li class="list-group-item"><strong>Wins:</strong> ${wins}</li>
          <li class="list-group-item"><strong>Losses:</strong> ${losses}</li>
          <li class="list-group-item"><strong>Draws:</strong> ${draws}</li>
        </ul>
        <h5 class="mb-2">Last 3 Matches</h5>
        ${lastMatchesTable}
      </div>
    </div>
  `;
}


export async function displayWelcomePage() {
  // Attendre l'URL de l'avatar
  const avatarPicture = localStorage.getItem("avatarUrl"); // Fallback pour username
  const username = localStorage.getItem("username") || "Guest"; // Fallback pour username

  // Vider tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  // app_top reste vide
  const appTop = document.getElementById('app_top');
  appTop.innerHTML = '';

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
      <div class="container py-5">
          <div class="row justify-content-center">
              <div class="col-md-6 d-flex flex-column gap-4">
                  <!-- Welcome Card -->
                  <div class="card shadow-sm welcome-card">
                      <div class="card-body d-flex align-items-center">
                          <div class="rounded-circle overflow-hidden me-3">
                              <img src="${avatarPicture}" class="object-fit-cover" alt="Profile picture" />
                          </div>
                          <h3 class="card-title mb-0">Welcome ${username}</h3>
                      </div>
                  </div>
                  <!-- Pending Friend Requests Card -->
                  <div class="card shadow-sm pending-friend-card">
                      <div class="card-body">
                          <h4 class="card-title mb-3">Pending Friend Requests</h4>
                          <ul class="list-group" id="pendingFriendRequests"></ul>
                      </div>
                  </div>
                  <!-- Pending Tournament Authentications Card -->
                  <div class="card shadow-sm pending-tournament-card">
                      <div class="card-body">
                          <h4 class="card-title mb-3">Pending Tournament Authentications</h4>
                          <ul class="list-group" id="pendingTournamentAuthentications"></ul>
                      </div>
                  </div>
              </div>
              <div class="col-md-6" id="quickStatsContainer">
                  <!-- Les stats rapides seront insérées ici -->
              </div>
          </div>
      </div>
  `;

  const appBottom = document.getElementById("app_bottom");
  appBottom.innerHTML = `
    <!-- Footer de la page -->
  `;

  // Charger les requêtes d’amis et les tournois non authentifiés
  fetchPendingFriendRequests();
  fetchPendingTournamentAuthentications();

  // Charger les stats rapides et les derniers matchs
  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const quickStatsContainer = document.getElementById("quickStatsContainer");
      quickStatsContainer.innerHTML = displayQuickStats(data, username);
    })
    .catch(error => {
      console.error("Error fetching quick stats:", error);
      const quickStatsContainer = document.getElementById("quickStatsContainer");
      quickStatsContainer.innerHTML = `<p class="text-danger">Error loading quick stats: ${error.message}</p>`;
    });
}

function fetchPendingTournamentAuthentications() {
  fetch("/api/user/pending-tournament-authentications/", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(response => response.json())
    .then(data => {
      const authList = document.getElementById("pendingTournamentAuthentications");
      authList.innerHTML = "";

      if (data.pending_authentications && data.pending_authentications.length > 0) {
        data.pending_authentications.forEach(tournament => {
          const listItem = document.createElement("li");
          listItem.className = "list-group-item d-flex justify-content-between align-items-center";
          listItem.innerHTML = `
          <span>${tournament.tournament_name} (as ${tournament.player_name})</span>
          <button class="btn btn-primary btn-sm confirm-auth" data-tournament-id="${tournament.tournament_id}" data-player-name="${tournament.player_name}">Confirm Participation</button>
        `;
          authList.appendChild(listItem);
        });

        // Ajouter des événements pour les boutons "Confirm Participation"
        document.querySelectorAll(".confirm-auth").forEach(button => {
          button.addEventListener("click", event => {
            const tournamentId = event.target.getAttribute("data-tournament-id");
            const playerName = event.target.getAttribute("data-player-name");
            confirmTournamentParticipation(tournamentId, playerName);
          });
        });
      } else {
        authList.innerHTML = `<li class="list-group-item text-center bg-transparent border border-white" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">No pending tournament authentications.</li>`;
      }
    })
    .catch(error => {
      console.error("Error fetching pending tournament authentications:", error);
      const authList = document.getElementById("pendingTournamentAuthentications");
      authList.innerHTML = `<li class="list-group-item text-center text-danger" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">Error loading tournament authentications.</li>`;
    });
}

function confirmTournamentParticipation(tournamentId, playerName) {
  fetch(`/api/auth/confirm-participation/${tournamentId}/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: playerName // Pas besoin de username, car request.user le gère
    }),
  })
  .then(response => {
    if (!response.ok) throw new Error("Authentication failed: " + response.status);
    return response.json();
  })
  .then(data => {
    if (data.message === "Player authenticated successfully") {
      console.log(`Participation confirmed for ${playerName} in tournament ${tournamentId}`);
      showModal('Success', 'Participation confirmed successfully!', 'OK', () => {
        fetchPendingTournamentAuthentications(); // Rafraîchir la liste
      });
    } else {
      throw new Error("Unexpected response");
    }
  })
  .catch(error => {
    console.error("Error confirming participation:", error);
    showModal('Error', 'Failed to confirm participation. Please try again.', 'OK', () => {});
  });
}


// Nouvelle fonction pour les requêtes d’amis dans #app_main
export function fetchPendingFriendRequests() {
  fetch("/api/friends/requests/", {
    method: "GET",
    credentials: "include",
  })
    .then(response => response.json())
    .then(requestsData => {
      const requestList = document.getElementById("pendingFriendRequests");
      requestList.innerHTML = "";

      if (requestsData.requests && requestsData.requests.length > 0) {
        requestsData.requests.forEach(request => {
          const listItem = document.createElement("li");
          listItem.className = "list-group-item d-flex justify-content-between align-items-center";
          listItem.innerHTML = `
            <span>${request.sender}</span>
            <div>
              <button class="btn btn-success btn-sm accept-request me-2" data-username="${request.sender}">Accept</button>
              <button class="btn btn-danger btn-sm decline-request" data-username="${request.sender}">Decline</button>
            </div>
          `;
          requestList.appendChild(listItem);
        });

        // Ajouter les événements pour les boutons "Accept" et "Decline"
        document.querySelectorAll(".accept-request").forEach(button => {
          button.addEventListener("click", event => {
            const friendUsername = event.target.getAttribute("data-username");
            respondToFriendRequest(friendUsername, "accept");
          });
        });

        document.querySelectorAll(".decline-request").forEach(button => {
          button.addEventListener("click", event => {
            const friendUsername = event.target.getAttribute("data-username");
            respondToFriendRequest(friendUsername, "decline");
          });
        });
      } else {
        requestList.innerHTML = `<li class="list-group-item text-center bg-transparent border border-white" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">No pending friend requests.</li>`;
      }
    })
    .catch(error => {
      console.error("Error fetching friend requests:", error);
      const requestList = document.getElementById("pendingFriendRequests");
      requestList.innerHTML = `<li class="list-group-item text-center text-danger">Error loading friend requests.</li>`;
    });
}

export function displayTournament() {
  console.log('Tournament');
  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <div class="container py-4">
      <ul class="nav nav-pills mb-3 d-flex justify-content-center gap-3" role="tablist">
        <li class="nav-item" role="presentation">
          <button id="myTournamentButton" class="nav-link btn btn-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
            My Tournaments
          </button>
        </li><li class="nav-item" role="presentation">
          <button id="newTournamentButton" class="nav-link btn btn-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
            New Tournament
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <div class="d-flex align-items-center gap-2" id="searchTournament">
            <input 
              type="text" 
              id="tournamentNameInput" 
              class="form-control rounded-pill bg-transparent" 
              placeholder="Tournament Name" 
              style="font-family: 'Press Start 2P', cursive; font-size: 15px; border: 2px solid #007bff;"
            >
            <button id="tournamentSearchButton" class="nav-link btn btn-outline-primary px-4 py-2 bg-transparent" type="button" style="font-family: 'Press Start 2P', cursive; font-size: 15px; border-radius: 10px; transition: transform 0.3s ease;">
              Search
            </button>
          </div>
        </li>
      </ul>
    </div>
  `;

  displayUserTournaments();
  // let resultDiv = document.getElementById("app_main");
  //   resultDiv.style.display = "block";

  document.getElementById("myTournamentButton").addEventListener("click", displayTournament);
  document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);

  document.getElementById("tournamentSearchButton").addEventListener("click", () => {
    const tournamentNameInput = document.getElementById("tournamentNameInput");
    if (!tournamentNameInput) {
      console.error("The element 'tournamentNameInput'  is not available.");
      return;
    }

    const tournamentName = tournamentNameInput.value;
    if (!tournamentName) {
      showModal(
        'Warning',
        'Please enter a tournament name.',
        'OK',
        () => {} // Action vide, juste fermer la modale
      );
      return;
    }

    localStorage.setItem("tournamentName", tournamentName);
    validateSearch();
  });
}




export function displayFriends() {
  // Vide tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_main");
  appTop.innerHTML = `
    <div class="container mt-4">
      <div class="row g-4">
        <!-- Colonne 1 : Carte pour envoyer une demande d'ami -->
        <div class="col-12 col-md-4">
          <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
            <div class="card-body text-center">
              <h5 class="card-title mb-3" >Send Friend Request</h5>
              <div class="form-group mt-2">
                <label for="friendUsername" class="form-label" >Username</label>
                <input type="text" id="friendUsername" placeholder="Username" class="form-control bg-transparent" required >
                <button id="sendFriendRequestButton" class="btn btn-outline-success mt-2 w-100 shadow-sm" >
                  Send Friend Request
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Colonne 2 : 3 cartes pour les demandes et amis -->
        <div class="col-12 col-md-6">
          <div class="row g-4">
            <!-- Carte pour les demandes d'amis en attente -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" >Pending Friend Requests</h4>
                  <ul id="friendRequests" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte pour la liste des amis -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" >My Friends</h4>
                  <ul id="friendList" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte vide pour équilibrer la mise en page (facultatif, peut être retirée si le contenu est dynamique) -->
            <div class="col-12 d-md-none d-lg-block" style="height: 0;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("sendFriendRequestButton").addEventListener("click", () => {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (friendUsername) {
      sendFriendRequest(friendUsername);
    } else {
      // Remplacer une éventuelle alert par oneButtonModal
      showModal(
        'Warning',
        'Please enter a username.',
        'OK', // Texte du bouton
        () => {} // Action vide, juste fermer la modale
      );
    }
  });

  fetchFriendRequests();
  fetchFriends();
}

function displayHTMLforSettings(user) {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/avatar1.png";
  const appTop = document.getElementById("app_main");

  appTop.innerHTML = `
  <div class="container mt-4">
    <h3 class="text-center">Account Management</h3>

    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Update Profile Picture</h4>
      <div class="d-flex flex-column align-items-center">
        <img id="profilePic" src="${avatarUrl}" alt="Profile Picture" class="rounded-circle border" width="150" height="150">

        <div class="mt-3 w-75">
          <label class="form-label">Choose a new profile picture:</label>
          <div class="input-group">
            <input type="file" id="avatarInput" accept="image/*" class="form-control">
            <button id="uploadAvatarButton" class="btn btn-primary">Upload</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Profile Information Update -->
    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Edit Profile Information</h4>
      <div class="form-group mt-2">
        <label>Username:</label>
        <input type="text" id="usernameInput" class="form-control" value="${user.username}">
      </div>
      <div class="form-group mt-2">
        <label>Email:</label>
        <input type="email" id="emailInput" class="form-control" value="${user.email}">
      </div>
      <div class="form-group mt-2">
        <label>Phone Number:</label>
        <input type="text" id="phoneInput" class="form-control" value="${user.phone_number || ''}">
      </div>
      <div class="d-flex justify-content-center mt-3">
        <button id="saveProfileButton" class="btn btn-success px-4">Save Changes</button>
      </div>
    </div>

    <!-- ✅ 2FA Section -->
    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Two-Factor Authentication (2FA)</h4>
      <p class="text-center" id="2fa_status">${user.is_2fa_enabled ? "2FA is Enabled ✅" : "2FA is Disabled ❌"}</p>
      <div class="d-flex justify-content-center">
        <button id="toggle2FAButton" class="btn ${user.is_2fa_enabled ? "btn-danger" : "btn-success"}">
          ${user.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      </div>
      <div id="otpSection" class="text-center mt-3" style="display:none;">
        <input type="text" id="otpInput" class="form-control text-center w-50 mx-auto" placeholder="Enter OTP">
        <button id="verifyOTPButton" class="btn btn-primary mt-2">Verify OTP</button>
      </div>
    </div>

    <!-- Account Actions -->
    <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-link nav-link text-danger">Delete account</button>
      <button id="anonymizeAccountButton" class="btn btn-link nav-link text-success">Anonimize account</button>
    </div>
  `;

  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
  document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
  document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
  document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
  document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
  document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
  update2FAStatus();
}

export function displaySettings() {


  const user = localStorage.getItem("username");

  // 1. fetch the user's settings
  fetch("/api/auth/user/", {
    method: "GET",
    credentials: "include", // Ensures authentication cookies are sent
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch user data.");
      }
      return response.json();
    })
    .then(user => {
      //2. display the settings
      displayHTMLforSettings(user);
    })
    .catch(error => {
    const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/avatar1.png";

      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
    <div class="container mt-4">
      <h3 class="text-center">Account Management</h3>

      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Update Profile Picture</h4>
        <div class="d-flex flex-column align-items-center">
          <img id="profilePic" src="${avatarUrl}" alt="Profile Picture" class="rounded-circle border" width="150" height="150">

          <div class="mt-3 w-75">
            <label class="form-label">Choose a new profile picture:</label>
            <div class="input-group">
              <input type="file" id="avatarInput" accept="image/*" class="form-control">
              <button id="uploadAvatarButton" class="btn btn-primary">Upload</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile Information Update -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Edit Profile Information</h4>
        <div class="form-group mt-2">
          <label>Username:</label>
          <input type="text" id="usernameInput" class="form-control" value="${user.username}">
        </div>
        <div class="form-group mt-2">
          <label>Email:</label>
          <input type="email" id="emailInput" class="form-control" required>
          <div class="invalid-feedback">
            Please enter a valid email address with "@" and a domain (e.g., user@example.com).
          </div>
        </div>
        <div class="form-group mt-2">
          <label>Phone Number:</label>
          <input type="text" id="phoneInput" class="form-control" value="${user.phone_number || ''}">
        </div>
        <div class="d-flex justify-content-center mt-3">
          <button id="saveProfileButton" class="btn btn-success px-4">Save Changes</button>
        </div>
      </div>

      <!-- ✅ 2FA Section -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Two-Factor Authentication (2FA)</h4>
        <p class="text-center" id="2fa_status">${user.is_2fa_enabled ? "2FA is Enabled ✅" : "2FA is Disabled ❌"}</p>
        <div class="d-flex justify-content-center">
          <button id="enable2FAButton" class="btn ${user.is_2fa_enabled ? "btn-danger" : "btn-success"}">
            ${user.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
        <div id="otpSection" class="text-center mt-3" style="display:none;">
          <input type="text" id="otpInput" class="form-control text-center w-50 mx-auto" placeholder="Enter OTP">
          <button id="verifyOTPButton" class="btn btn-primary mt-2">Verify OTP</button>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-danger px-4" style="margin-right: 38px;">Delete Account</button>
      <button id="anonymizeAccountButton" class="btn btn-warning">Anonymize Account</button>
       </div>
    `;

    document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
    document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
    document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
    document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
    document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
    document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
    update2FAStatus();
  })
  .catch(error => {
    console.error("Error loading user data:", error);
    });

}


export function displayGameForm() {
  // Vide tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  localStorage.setItem("isTournamentMatch", false);
  const formContainer = document.getElementById("app_main");
  const username = localStorage.getItem("username");

  let gameSettings = {
    mode: "solo",
    difficulty: "easy",
    design: "retro",
    numberOfGames: 2, // entre 1 et 5
    setsPerGame: 1, // entre 1 et 5
    player1: localStorage.getItem("username"),
    player2: "Bot-AI",
    control1: "arrows",
    control2: "wasd",
    isTournamentMatch: false,
    isAIActive: true // Ajouté pour clarifier la logique IA
  };

  formContainer.innerHTML = `
  <form id="gameForm" class="container w-100">

    <ul class="nav nav-pills nav-justified mb-3 d-flex justify-content-between" id="pills-tab" role="tablist">
    
      <li class="nav-item" role="presentation">
        <button class="nav-link active border border-primary rounded-0 bg-transparent" id="pills-game-settings-tab"
        data-bs-toggle="pill" data-bs-target="#pills-game-settings" type="button" role="tab"
        aria-controls="pills-game-settings" aria-selected="true">Game Settings</button>
      </li>

      <li class="nav-item" role="presentation">
        <button class="nav-link border border-primary rounded-0 bg-transparent" id="pills-player-settings-tab"
        data-bs-toggle="pill" data-bs-target="#pills-player-settings" type="button" role="tab"
        aria-controls="pills-player-settings" aria-selected="false">Player Settings</button>
      </li>

      <li class="nav-item" role="presentation">
        <button class="nav-link border border-primary rounded-0 bg-transparent" id="pills-match-settings-tab"
        data-bs-toggle="pill" data-bs-target="#pills-match-settings" type="button" role="tab"
        aria-controls="pills-match-settings" aria-selected="false">Match Settings</button>
      </li>

   
  </ul>


  <div class="tab-content" id="pills-tabContent">
  <div class="tab-pane fade show active" id="pills-game-settings" role="tabpanel" aria-labelledby="pills-game-settings-tab">
    <div class="d-flex justify-content-center mt-3">
      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Settings</h3>
        <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Game Mode:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Game Mode">
              <button id="onePlayer" class="mode-button btn ${gameSettings.mode === "solo" ? "btn-primary" : "btn-outline-primary"}" type="button">1 Player</button>
              <button id="twoPlayers" class="mode-button btn ${gameSettings.mode === "multiplayer" ? "btn-primary" : "btn-outline-primary"}" type="button">2 Players</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Difficulty:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Difficulty">
              <button class="difficult-button btn ${gameSettings.difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
              <button class="difficult-button btn ${gameSettings.difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
              <button class="difficult-button btn ${gameSettings.difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Design:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Design">
              <button class="design-button btn ${gameSettings.design === "retro" ? "btn-primary" : "btn-outline-primary"}" id="retro" type="button">Retro</button>
              <button class="design-button btn ${gameSettings.design === "neon" ? "btn-primary" : "btn-outline-primary"}" id="neon" type="button">Neon</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <div class="tab-pane fade" id="pills-player-settings" role="tabpanel" aria-labelledby="pills-player-settings-tab">
    <div class="d-flex justify-content-between align-items-stretch mt-3">
      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 1</h3>
        <div
          class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
          <div class="mb-3">
            <label for="player1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              class="form-label">Name:</label>
            <input type="text" id="player1" value="${gameSettings.player1}"
              style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-control bg-transparent"
              disabled>
          </div>
          <div class="mb-3">
            <label for="control1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;"
              class="form-label">Control:</label>
            <select id="control1" class="form-select bg-transparent">
              <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="arrows"
                ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
              <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="wasd"
                ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
              <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="mouse"
                ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
            </select>
          </div>
        </div>
      </div>
      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 2</h3>
        <div
          class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
          <div class="mb-3">
            <label for="player2" class="form-label"
              style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Name:</label>
            <input type="text" id="player2" value="${gameSettings.player2}" class="form-control bg-transparent"
              style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
          </div>
          <div id="control2Container" class="mb-3" style="${gameSettings.mode === "solo" ? "display:none;" : "display:block;"}">
            <label for="control2" class="form-label">Control:</label>
            <select id="control2" class="form-select bg-transparent">
              <option value="wasd" ${gameSettings.control2 === "wasd" ? "selected" : ""}>WASD</option>
              <option value="arrows" ${gameSettings.control2 === "arrows" ? "selected" : ""}>Arrow Keys
              </option>
              <option value="mouse" ${gameSettings.control2 === "mouse" ? "selected" : ""}>Mouse
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="tab-pane fade" id="pills-match-settings" role="tabpanel" aria-labelledby="pills-match-settings-tab">
    <div class="d-flex justify-content-center mt-3">
      <!-- Match Settings Container -->
      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Match Settings</h3>
        <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
          <div class="mb-3">
            <label for="numberOfGames" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Number of Games:</label>
            <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" class="form-control p-2 bg-transparent" style="width: 60px;">
          </div>
          <div class="mb-3">
            <label for="setsPerGame" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Sets per Game:</label>
            <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" class="form-control bg-transparent" style="width: 60px;">
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</form>


</form>

  <div class="text-center mt-4">
    <button id="startGameButton" class="btn btn-success" type="button">Start Game</button>
  </div>

  <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>

    <!-- Modale personnalisée ajoutée ici -->

  `;

  // Fonction pour basculer les boutons actifs
  function toggleActiveButton(group, selectedId) {
    document.querySelectorAll(group).forEach(button => {
      button.classList.remove('btn-primary');
      button.classList.add('btn-outline-primary');
    });
    document.getElementById(selectedId).classList.remove('btn-outline-primary');
    document.getElementById(selectedId).classList.add('btn-primary');
  }

  // Ajout des écouteurs pour les boutons de mode, difficulté et design
  document.querySelectorAll(".mode-button, .difficulty-button, .design-button").forEach(button => {
    button.addEventListener("click", function() {
      toggleActiveButton(`.${this.classList[0]}`, this.id);
    });
  });

  let isTwoPlayerMode = false;

  // Gestion du mode "One Player"
  document.getElementById("onePlayer").addEventListener("click", function() {
    const player2Input = document.getElementById("player2");
    const control2Container = document.getElementById("control2Container");

    player2Input.value = "Bot-AI";
    gameSettings.player2 = "Bot-AI";
    gameSettings.isAIActive = true;
    player2Input.disabled = true;
    control2Container.style.display = "none";

    const control1 = document.getElementById("control1");
    const control2 = document.getElementById("control2");
    control1.value = "arrows";
    control2.value = "wasd";
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);

    isTwoPlayerMode = false;
    gameSettings.mode = "solo";
    toggleActiveButton(".mode-button", "onePlayer");
  });

  // Gestion du mode "Two Players"
  document.getElementById("twoPlayers").addEventListener("click", function() {
    const player2Input = document.getElementById("player2");
    const control2Container = document.getElementById("control2Container");

    player2Input.value = "";
    gameSettings.player2 = "";
    gameSettings.isAIActive = false;
    player2Input.disabled = false;
    control2Container.style.display = "block";

    const control1 = document.getElementById("control1");
    const control2 = document.getElementById("control2");
    control1.value = "arrows";
    control2.value = "wasd";
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector("option[value='wasd']").disabled = true;
    control2.querySelector("option[value='arrows']").disabled = true;

    isTwoPlayerMode = true;
    gameSettings.mode = "multiplayer";
    toggleActiveButton(".mode-button", "twoPlayers");
  });

  // Mise à jour des paramètres via les inputs
  document.getElementById("numberOfGames").addEventListener("input", function() {
    gameSettings.numberOfGames = parseInt(this.value);
  });

  document.getElementById("setsPerGame").addEventListener("input", function () {
    gameSettings.setsPerGame = parseInt(this.value);
  });

  document.getElementById("player2").addEventListener("input", function () {
    gameSettings.player2 = this.value;
  });

  document.getElementById("control1").addEventListener("change", function() {
    const selected = this.value;
    gameSettings.control1 = this.value;
    const control2 = document.getElementById("control2");
    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.getElementById("control2").addEventListener("change", function() {
    const selected = this.value;
    gameSettings.control2 = this.value;
    const control1 = document.getElementById("control1");
    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.querySelectorAll(".difficulty-button").forEach(button => {
    button.addEventListener("click", function () {
      gameSettings.difficulty = this.id;
    });
  });

  document.querySelectorAll(".design-button").forEach(button => {
    button.addEventListener("click", function () {
      gameSettings.design = this.id;
    });
  });

  let alertShown = false;
  let lastCheckedPlayer2 = "";
  let needAuth = false;

  // Gestion du bouton "Start Game"
  document.getElementById("startGameButton").addEventListener("click", async () => {
    const player1 = username;
    let player2 = document.getElementById("player2").value.trim();
    const numberOfGames = parseInt(document.getElementById("numberOfGames").value);
    const setsPerGame = parseInt(document.getElementById("setsPerGame").value);

    console.log("Start button clicked");

    if (!alertShown || player2 !== lastCheckedPlayer2) {
      alertShown = false;
      needAuth = false;
      if (isTwoPlayerMode) {
        try {
          const playerData = await checkPlayerExists(player2);

          if (playerData.exists && !playerData.is_guest) {
            // Utiliser oneButtonModal pour indiquer qu'une authentification est requise
            showModal(
              'Utilisateur enregistré',
              'Cet utilisateur est enregistré. Une authentification est requise.',
              'OK',
              () => {
                alertShown = true;
                lastCheckedPlayer2 = player2;
                needAuth = true;
              }
            );
            return;
          } else if (playerData.exists) {
            // Utiliser oneButtonModal pour confirmer la continuation avec un invité
            showModal(
              'Joueur invité',
              'Cet utilisateur est un invité. Voulez-vous continuer ?',
              'OK',
              () => {
                alertShown = true;
                lastCheckedPlayer2 = player2;
              }
            );
            return;
          } else {
            startGameSetup(gameSettings);
            return;
          }
        } catch (error) {
          console.error("Error checking player existence:", error);
          // Utiliser oneButtonModal pour un message d'erreur
          showModal(
            'Utilisateur introuvable',
            'There was an error checking player existence. Please try again.',
            'OK',
            () => {}
          );
          return;
        }
      } else {
        startGameSetup(gameSettings);
        return;
      }
    }

    if (needAuth) {
      const authResult = await authenticateNow(player2, player1, numberOfGames, setsPerGame);
      if (authResult) {
        startGameSetup(gameSettings);
      }
    } else if (player2 !== lastCheckedPlayer2) {
      // Si player2 a changé, on lance le jeu directement
      startGameSetup(gameSettings);
    } else {
      // Si c'est le deuxième clic pour un joueur invité existant, on lance le jeu
      startGameSetup(gameSettings);
    }

    console.log("Starting game with settings:", gameSettings);
  });
}


async function authenticateNow(playerName, player1, numberOfGames, setsPerGame) {
  return new Promise((resolve, reject) => {
    const modalHTML = `
      <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="loginModalLabel">Login to Authenticate</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="loginForm">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" class="form-control" id="username" placeholder="Enter your username" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" class="form-control" id="password" placeholder="Enter your password" required>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="submitLogin">Login</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const loginModal = document.getElementById('loginModal');
    const modalBootstrap = new bootstrap.Modal(loginModal);
    modalBootstrap.show();

    document.getElementById('submitLogin').addEventListener('click', async function () {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const authResult = await authenticatePlayer(username, password, playerName);
      if (authResult.success) {
        modalBootstrap.hide();
        loginModal.remove();
        resolve(true); // Résout la promesse en cas de succès
      } else {
        showModal(
          'Error',
          'Authentication failed. Please try again.',
          'OK',
          () => {}
        );
        modalBootstrap.hide();
        loginModal.remove();
        resolve(false); // Résout la promesse en cas d'échec
      }
    });
  });
}

async function authenticatePlayer(username, password, playerName) {
  const response = await fetch('/api/auth/match-player/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password,
      player_name: playerName
    }),
  });

  return await response.json();
}



