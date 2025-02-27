import { startGameSetup, gameInterval, stopGameProcess } from "./pong.js";
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

  // 2. Check if the user is logged in.V
    validateToken().then((isTokenValid) => {
    console.log('validateToken resolved with:', isTokenValid);
    isUserLoggedIn = isTokenValid;
    if (isUserLoggedIn) {
      console.log('User is logged in based on access token in cookies');
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
  setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

  // 5. Listener for history changes
  window.addEventListener("popstate", function (event) {
    console.log('Popstate event triggered. Current state:', event.state);
    let route;
    if (event.state) {
      route = event.state.page;
    } else {
      // Si event.state est null, on utilise l'URL hash
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

function handleRouteChange(route) {
  console.log('handleRouteChange called with route:', route);
  addToCustomHistory(route);

  validateToken().then((isTokenValid) => {
    console.log('Token validation in handleRouteChange:', isTokenValid);
    isUserLoggedIn = isTokenValid;

    const publicRoutes = ['login', 'register'];

    if (publicRoutes.includes(route) || (isUserLoggedIn)) {
      console.log('Route is public or user is logged in');
      switch (route) {
        case 'login':
          if (!isUserLoggedIn) {
            displayConnectionFormular();
          } else {
            navigateTo('welcome');
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
            updateUI(displayWelcomePage);
          }
      }
    } else {
      console.log('User not logged in, redirecting to login');
      navigateTo('login');
    }
  }).catch((error) => {
    console.error('error validating token during route change:', error);
    navigateTo('login');
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
              <h5 class="card-title mb-3" style="font-family: 'Press Start 2P', cursive;">Send Friend Request</h5>
              <div class="form-group mt-2">
                <label for="friendUsername" class="form-label" style="font-family: 'Press Start 2P', cursive;">Username</label>
                <input type="text" id="friendUsername" placeholder="Username" class="form-control bg-transparent" required style="font-family: 'Press Start 2P', cursive;">
                <button id="sendFriendRequestButton" class="btn btn-outline-success mt-2 w-100 shadow-sm" style="font-family: 'Press Start 2P', cursive;">
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
                  <h4 class="card-title mb-3" style="font-family: 'Press Start 2P', cursive;">Pending Friend Requests</h4>
                  <ul id="friendRequests" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte pour la liste des amis -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" style="font-family: 'Press Start 2P', cursive;">My Friends</h4>
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
      <button class="nav-link active border border-primary rounded-0 bg-transparent" id="pills-player-settings-tab"
        data-bs-toggle="pill" data-bs-target="#pills-player-settings" type="button" role="tab"
        aria-controls="pills-player-settings" aria-selected="true">Player Settings</button>
    </li>

        <li class="nav-item" role="presentation">
    <button class="nav-link border border-primary rounded-0 bg-transparent" id="pills-match-settings-tab"
    data-bs-toggle="pill" data-bs-target="#pills-match-settings" type="button" role="tab"
    aria-controls="pills-match-settings" aria-selected="false">Match Settings</button>
        </li>

    <li class="nav-item" role="presentation">
      <button class="nav-link border border-primary  rounded-0 bg-transparent" id="pills-game-settings-tab"
      data-bs-toggle="pill" data-bs-target="#pills-game-settings" type="button" role="tab"
      aria-controls="pills-game-settings" aria-selected="true">Game Settings</button>
      </li>
  </ul>


  <div class="tab-content" id="pills-tabContent">
  <div class="tab-pane fade show active" id="pills-player-settings" role="tabpanel" aria-labelledby="pills-player-settings-tab">
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
          <div id="control2Container" class="mb-3" style="${gameSettings.mode === " solo"? "display:none;" : "display:block;"}">
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

  <div class="tab-pane fade" id="pills-game-settings" role="tabpanel" aria-labelledby="pills-game-settings-tab">
    <div class="d-flex justify-content-center mt-3">
      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Settings</h3>
        <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between bg-transparent">
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Game Mode:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Game Mode">
              <button id="onePlayer" class="mode-button btn ${gameSettings.mode === " solo" ? "btn-primary" : "btn-outline-primary"}" type="button">1 Player</button>
              <button id="twoPlayers" class="mode-button btn ${gameSettings.mode === " multiplayer" ? "btn-primary" : "btn-outline-primary"}" type="button">2 Players</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Difficulty:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Difficulty">
              <button class="difficulty-button btn ${gameSettings.difficulty === " easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
              <button class="difficulty-button btn ${gameSettings.difficulty === " medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
              <button class="difficulty-button btn ${gameSettings.difficulty === " hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Design:</label>
            <div class="btn-group d-flex pag-2" role="group" aria-label="Design">
              <button class="design-button btn ${gameSettings.design === " retro" ? "btn-primary" : "btn-outline-primary"}" id="retro" type="button">Retro</button>
              <button class="design-button btn ${gameSettings.design === " neon" ? "btn-primary" : "btn-outline-primary"}" id="neon" type="button">Neon</button>
            </div>
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






// Fonction principale pour afficher les statistiques
export function displayStats() {
  const appTop = document.getElementById('app_top');
  const appMain = document.getElementById('app_main');
  const appBottom = document.getElementById('app_bottom');

  // Initialisation des conteneurs
  appTop.innerHTML = '';
  appTop.className = 'semi-transparent-bg p-3 text-dark';
  appMain.innerHTML = '';
  appMain.className = 'semi-transparent-bg flex-grow-1 p-3 text-dark overflow-auto';
  appBottom.innerHTML = '';
  appBottom.className = 'semi-transparent-bg p-3 text-dark';

  // Menu avec barre de recherche et onglets dans #app_top
  appTop.innerHTML = `
    <div class="container mt-3">
      <h3 class="text-center text-primary mb-4" style="font-family: 'Press Start 2P', cursive;">Statistics Dashboard</h3>
      <div class="input-group w-50 mx-auto mb-3">
        <input id="globalSearch" class="form-control" placeholder="Enter username" style="font-family: 'Press Start 2P', cursive;">
        <button id="globalSearchBtn" class="btn btn-primary" style="font-family: 'Press Start 2P', cursive;">Search</button>
      </div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mb-3">
        <button id="tabPlayer" class="btn btn-outline-primary shadow-sm" style="font-family: 'Press Start 2P', cursive;">Player</button>
        <button id="tabTournament" class="btn btn-outline-primary shadow-sm" style="font-family: 'Press Start 2P', cursive;">Tournament</button>
        <button id="tabGame" class="btn btn-outline-primary shadow-sm" style="font-family: 'Press Start 2P', cursive;">Game</button>
        <button id="tabRanking" class="btn btn-outline-primary shadow-sm" style="font-family: 'Press Start 2P', cursive;">General Ranking</button>
      </div>
      <div id="searchArea" class="d-flex justify-content-center"></div>
    </div>
  `;

  // Gestion des clics sur les onglets
  document.getElementById('tabPlayer').addEventListener('click', () => showTab('player'));
  document.getElementById('tabTournament').addEventListener('click', () => showTab('tournament'));
  document.getElementById('tabGame').addEventListener('click', () => showTab('game'));
  document.getElementById('tabRanking').addEventListener('click', () => showTab('ranking'));

  // Gestion de la recherche globale
  document.getElementById('globalSearchBtn').addEventListener('click', () => {
    const currentTab = document.querySelector('.btn-outline-primary.active')?.id || 'tabPlayer';
    showTab(currentTab.replace('tab', '').toLowerCase());
  });

  // Pré-remplir avec le username par défaut et afficher l'onglet "Player"
  const defaultUsername = localStorage.getItem('username');
  if (defaultUsername) {
    document.getElementById('globalSearch').value = defaultUsername;
  }
  showTab('player');
}

// Afficher le contenu d’un onglet
function showTab(tab) {
  const searchArea = document.getElementById('searchArea');
  const appMain = document.getElementById('app_main');
  const username = document.getElementById('globalSearch').value.trim() || localStorage.getItem('username') || '';
  searchArea.innerHTML = ''; // Vider la zone de recherche secondaire
  appMain.innerHTML = ''; // Vider le contenu principal

  // Ajouter la classe "active" à l'onglet sélectionné
  document.querySelectorAll('#app_top button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

  switch (tab) {
    case 'player':
      fetchAndDisplayPlayerStats(username);
      break;
    case 'tournament':
      displayLastUserTournaments(searchArea, username);
      break;
    case 'game':
      displayUserGames(username);
      break;
    case 'ranking':
      fetchAndDisplayRankingStats();
      break;
  }
}


// Afficher la liste des matchs d’un utilisateur
// Afficher la liste des matchs d’un utilisateur avec un menu déroulant stylisé
function displayUserGames(username) {
  if (!username) {
    document.getElementById('searchArea').innerHTML = `<p class="text-danger" style="font-family: 'Press Start 2P', cursive;">Please enter a username.</p>`;
    return;
  }

  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      const searchArea = document.getElementById('searchArea');
      const playedMatches = data.filter(m => m.is_played);
      if (playedMatches.length === 0) {
        searchArea.innerHTML = `<p class="text-muted" style="font-family: 'Press Start 2P', cursive;">No games found for ${username}.</p>`;
        return;
      }

      // Trier les matchs par date décroissante
      const sortedMatches = playedMatches.sort((a, b) => new Date(b.date_played) - new Date(a.date_played));

      searchArea.innerHTML = `
        <div class="card w-75 mx-auto" style="max-height: 300px; overflow-y: auto;">
          <div class="card-body p-2">
            <h5 class="text-center mb-3" style="font-family: 'Press Start 2P', cursive;">Games for ${username}</h5>
            <table class="table table-hover">
              <thead>
                <tr>
                  <th style="font-family: 'Press Start 2P', cursive; width: 60%;">Opponent & Date</th>
                  <th style="font-family: 'Press Start 2P', cursive; width: 40%;">Result</th>
                </tr>
              </thead>
              <tbody>
                ${sortedMatches.map(m => {
                  const opponent = m.player1_name.toLowerCase() === username.toLowerCase() ? m.player2_name : m.player1_name;
                  const date = new Date(m.date_played).toLocaleDateString();
                  const result = `${m.player1_sets_won} - ${m.player2_sets_won}`;

                  // Vérifier les matchs nuls en utilisant winner et winner_name
                  const isDraw = (m.winner === null || m.winner_name === 'No winner');
                  const winLoss = isDraw ? 'Draw' : 
                                 m.winner_name && m.winner_name.toLowerCase() === username.toLowerCase() ? 'Win' : 'Loss';
                  const colorClass = winLoss === 'Win' ? 'text-success' : winLoss === 'Loss' ? 'text-danger' : 'text-warning';

                  return `
                    <tr>
                      <td style="font-family: 'Press Start 2P', cursive; cursor: pointer;" class="selectGameLink" data-id="${m.id}">
                        ${opponent}<br><small style="font-size: 0.8em; color: #666;">${date}</small>
                      </td>
                      <td style="font-family: 'Press Start 2P', cursive;"><span class="${colorClass}">${result} (${winLoss})</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Connecter les clics sur les liens cliquables
      searchArea.querySelectorAll('.selectGameLink').forEach(link => {
        link.addEventListener('click', () => {
          const matchId = link.dataset.id;
          fetchAndDisplayGameStats(matchId, username);
        });
      });
    })
    .catch(error => {
      searchArea.innerHTML = `<p class="text-danger" style="font-family: 'Press Start 2P', cursive;">Error loading games: ${error.message}</p>`;
    });
}




// Nouvelle fonction pour afficher les 3 derniers tournois de l'utilisateur
function displayLastUserTournaments(searchArea, username) {
  if (!username) {
    searchArea.innerHTML = `<p class="text-danger" style="font-family: 'Press Start 2P', cursive;">Please enter a username.</p>`;
    return;
  }

  fetch(`/api/user/tournaments/?username=${username}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(data => {
      const tournaments = Array.isArray(data) ? data.slice(-3).reverse() : [];
      if (tournaments.length === 0) {
        searchArea.innerHTML = `<p class="text-muted" style="font-family: 'Press Start 2P', cursive;">No tournaments found.</p>`;
        return;
      }

      searchArea.innerHTML = `
        <div class="card w-75 mx-auto" style="max-height: 300px; overflow-y: auto;">
          <div class="card-body p-2">
            <h5 class="text-center mb-3" style="font-family: 'Press Start 2P', cursive;">Recent Tournaments for ${username}</h5>
            <table class="table table-hover">
              <thead>
                <tr>
                  <th style="font-family: 'Press Start 2P', cursive; width: 60%;">Tournament & Date</th>
                  <th style="font-family: 'Press Start 2P', cursive; width: 40%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${tournaments.map(t => {
                  const tournamentName = `${t.tournament_name} ${t.is_finished ? '✅' : '🏓'}`;
                  const date = new Date(t.date).toLocaleDateString();
                  const status = t.is_finished 
                    ? '<span class="badge bg-success">Finished</span>' 
                    : '<span class="badge bg-info text-dark">Ongoing</span>';
                  return `
                    <tr>
                      <td style="font-family: 'Press Start 2P', cursive; cursor: pointer;" class="selectTournamentLink" data-id="${t.id}">
                        ${tournamentName}<br><small style="font-size: 0.8em; color: #666;">${date}</small>
                      </td>
                      <td style="font-family: 'Press Start 2P', cursive;">${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Connecter les clics sur les liens cliquables
      searchArea.querySelectorAll('.selectTournamentLink').forEach(link => {
        link.addEventListener('click', () => {
          const tournamentId = link.dataset.id;
          fetchAndDisplayTournamentStats(tournamentId);
        });
      });
    })
    .catch(error => {
      searchArea.innerHTML = `<p class="text-danger" style="font-family: 'Press Start 2P', cursive;">Error loading tournaments: ${error.message}</p>`;
    });
}



// Générer un tableau "Summary"
function generateSummaryCard(title, stats) {
  return `
    <div class="card mb-4 shadow-sm bg-transparent">
      <div class="card-body">
        <h4 class="card-title text-center mb-3" style="font-family: 'Press Start 2P', cursive;">${title}</h4>
        <ul class="list-group list-group-flush">
          ${Object.entries(stats).map(([key, value]) => `
            <li class="list-group-item bg-transparent"><strong>${key}:</strong> ${value}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

// Générer un graphique et le retourner comme élément DOM
function generateChart(type, id, data, options) {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.style.maxHeight = '200px';
  new Chart(canvas, { type, data, options });
  return canvas;
}

// Afficher un graphique dans une carte
function displayChartInCard(chart, title) {
  const div = document.createElement('div');
  div.className = 'col-12 col-md-4';
  div.innerHTML = `
    <div class="card mb-4 shadow-sm bg-transparent">
      <div class="card-body">
        <h5 class="text-center mb-3" style="font-family: 'Press Start 2P', cursive;">${title}</h5>
      </div>
    </div>
  `;
  div.querySelector('.card-body').appendChild(chart);
  return div;
}

// Récupérer et afficher les stats d’un joueur
// Récupérer et afficher les stats d’un joueur (modifié pour accepter un paramètre par défaut)
function fetchAndDisplayPlayerStats(username) {
  if (!username) return;

  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      const appMain = document.getElementById('app_main');
      appMain.innerHTML = '';

      const playedMatches = data.filter(m => m.is_played);
      if (playedMatches.length === 0) {
        appMain.innerHTML = `<p class="text-muted" style="font-family: 'Press Start 2P', cursive;">No played matches found for ${username}.</p>`;
        return;
      }

      // Calculs précis des stats avec gestion des nuls
      const stats = {
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        pointsScored: 0,
        pointsConceded: 0,
        totalMatches: playedMatches.length
      };

      playedMatches.forEach(match => {
        const isPlayer1 = match.player1_name.toLowerCase() === username.toLowerCase();
        const playerSetsWon = isPlayer1 ? match.player1_sets_won : match.player2_sets_won;
        const playerSetsLost = isPlayer1 ? match.player2_sets_won : match.player1_sets_won;
        const playerPointsScored = isPlayer1 ? match.player1_total_points : match.player2_total_points;
        const playerPointsConceded = isPlayer1 ? match.player2_total_points : match.player1_total_points;

        stats.setsWon += playerSetsWon || 0;
        stats.setsLost += playerSetsLost || 0;
        stats.pointsScored += playerPointsScored || 0;
        stats.pointsConceded += playerPointsConceded || 0;

        // Appliquer la logique fournie
        const isDraw = (match.winner === null || match.winner_name === 'No winner');
        const winLoss = match.winner_name && match.winner_name.toLowerCase() === username.toLowerCase() ? 'Win' : 
                       match.winner_name && match.winner_name.toLowerCase() !== username.toLowerCase() ? 'Loss' : 'Draw';

        if (winLoss === 'Win') stats.wins++;
        else if (winLoss === 'Loss') stats.losses++;
        else stats.draws++;
      });

      // Summary
      const summary = generateSummaryCard('Player Summary', {
        'Name': username,
        'Matches Played': stats.totalMatches,
        'Win Rate': `${((stats.wins / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
        'Draw Rate': `${((stats.draws / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
        'Loss Rate': `${((stats.losses / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
        'Sets Won': stats.setsWon,
        'Total Points': stats.pointsScored,
      });
      appMain.innerHTML += summary;

      // Showroom (graphiques)
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // 1. Barres : Sets gagnés/perdus/nuls par match
      const setsData = playedMatches.map(match => ({
        date: match.date_played.split('T')[0],
        setsWon: match.player1_name.toLowerCase() === username.toLowerCase() ? match.player1_sets_won : match.player2_sets_won,
        setsLost: match.player1_name.toLowerCase() === username.toLowerCase() ? match.player2_sets_won : match.player1_sets_won,
        isDraw: (match.winner === null || match.winner_name === 'No winner')
      }));
      const barChart = generateChart('bar', 'playerBar', {
        labels: setsData.map(d => d.date),
        datasets: [
          { label: 'Sets Won', data: setsData.map(d => d.isDraw ? 0 : d.setsWon), backgroundColor: '#28a745' },
          { label: 'Sets Lost', data: setsData.map(d => d.isDraw ? 0 : d.setsLost), backgroundColor: '#dc3545' },
          { label: 'Draws', data: setsData.map(d => d.isDraw ? (d.setsWon + d.setsLost) : 0), backgroundColor: '#ffc107' }
        ]
      }, { 
        scales: { 
          y: { beginAtZero: true, title: { display: true, text: 'Sets' } },
          x: { stacked: true } // Empiler les barres pour mieux visualiser les nuls
        },
        plugins: { legend: { position: 'bottom' } }
      });
      chartsContainer.appendChild(displayChartInCard(barChart, 'Sets Won/Lost/Draws per Match'));

      // 2. Donut : Répartition victoires/défaites/nuls
      const donutChart = generateChart('doughnut', 'playerDonut', {
        labels: ['Wins', 'Losses', 'Draws'],
        datasets: [{ data: [stats.wins, stats.losses, stats.draws], backgroundColor: ['#28a745', '#dc3545', '#ffc107'] }]
      }, { plugins: { legend: { position: 'bottom' } } });
      chartsContainer.appendChild(displayChartInCard(donutChart, 'Wins vs Losses vs Draws'));

      // 3. Courbe : Points marqués par match
      const lineChart = generateChart('line', 'playerLine', {
        labels: playedMatches.map(m => m.date_played.split('T')[0]),
        datasets: [{
          label: 'Points Scored',
          data: playedMatches.map(m => m.player1_name.toLowerCase() === username.toLowerCase() ? m.player1_total_points : m.player2_total_points),
          borderColor: '#007bff',
          fill: false,
          tension: 0.1
        }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: 'Points' } } } });
      chartsContainer.appendChild(displayChartInCard(lineChart, 'Points Over Time'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}

// Récupérer et afficher les stats d’un tournoi
function fetchAndDisplayTournamentStats(tournamentId) {
  fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      const appMain = document.getElementById('app_main');
      appMain.innerHTML = '';

      // Calcul des stats
      const playedMatches = data.filter(m => m.is_played);
      const winners = playedMatches.map(m => m.winner_name).filter(w => w && w !== 'No winner');
      const draws = playedMatches.filter(m => m.winner === null || m.winner_name === 'No winner').length;
      const topWinner = winners.length ? winners.sort((a, b) => winners.filter(w => w === b).length - winners.filter(w => w === a).length)[0] : 'None';
      const avgSets = (playedMatches.reduce((sum, m) => sum + m.player1_sets_won + m.player2_sets_won, 0) / playedMatches.length || 0).toFixed(1);
      const totalPoints = playedMatches.reduce((sum, m) => sum + m.player1_total_points + m.player2_total_points, 0);

      // Summary
      const summary = generateSummaryCard('Tournament Summary', {
        'Name': data[0]?.tournament_name || 'Unknown',
        'Matches Played': playedMatches.length,
        'Top Winner': topWinner,
        'Draw Matches': draws,
        'Avg Sets per Match': avgSets,
        'Total Points': totalPoints,
      });
      appMain.innerHTML += summary;

      // Showroom
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // 1. Barres : Victoires par joueur (avec nuls)
      const winnersCount = {};
      winners.forEach(w => winnersCount[w] = (winnersCount[w] || 0) + 1);
      const barChart = generateChart('bar', 'tourneyBar', {
        labels: [...Object.keys(winnersCount), 'Draws'],
        datasets: [{ 
          label: 'Match Outcomes', 
          data: [...Object.values(winnersCount), draws], 
          backgroundColor: ['#007bff', '#ffc107'] // Bleu pour victoires, jaune pour nuls
        }]
      }, { 
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Matches' } } },
        plugins: { legend: { position: 'bottom' } }
      });
      chartsContainer.appendChild(displayChartInCard(barChart, 'Match Outcomes per Player'));

      // 2. Aires : Points par match
      const areaChart = generateChart('line', 'tourneyArea', {
        labels: playedMatches.map(m => `Match ${m.id}`),
        datasets: [{ 
          label: 'Points', 
          data: playedMatches.map(m => m.player1_total_points + m.player2_total_points), 
          borderColor: '#28a745', 
          fill: true, 
          tension: 0.1 
        }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: 'Points' } } } });
      chartsContainer.appendChild(displayChartInCard(areaChart, 'Points per Match'));

      // 3. Barres horizontales : Répartition des sets gagnés (avec nuls)
      const playerStats = {};
      playedMatches.forEach(match => {
        [match.player1_name, match.player2_name].forEach(player => {
          if (!playerStats[player]) playerStats[player] = { setsWon: 0 };
          if (player === match.player1_name) playerStats[player].setsWon += match.player1_sets_won || 0;
          if (player === match.player2_name) playerStats[player].setsWon += match.player2_sets_won || 0;
        });
      });
      const hBarChart = generateChart('bar', 'tourneyHBar', {
        labels: Object.keys(playerStats),
        datasets: [{ label: 'Sets Won', data: Object.values(playerStats).map(p => p.setsWon), backgroundColor: '#dc3545', borderWidth: 1 }]
      }, { 
        indexAxis: 'y', 
        scales: { 
          x: { beginAtZero: true, title: { display: true, text: 'Sets' } },
          y: { title: { display: true, text: 'Players' } }
        },
        plugins: { legend: { position: 'right' } }
      });
      chartsContainer.appendChild(displayChartInCard(hBarChart, 'Sets Won by Player'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}

// Récupérer et afficher les stats d’un match
function fetchAndDisplayGameStats(matchId, username) {
  if (!username) {
    document.getElementById('app_main').innerHTML = `<p class="text-danger">Please enter a username.</p>`;
    return;
  }

  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      const match = data.find(m => m.id == matchId && m.is_played);
      if (!match) throw new Error('Match not found or not played');

      const appMain = document.getElementById('app_main');
      appMain.innerHTML = '';

      // Calculs précis des stats
      const totalDuration = match.sets.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalExchanges = match.sets.reduce((sum, s) => sum + (s.exchanges || 0), 0);
      const isDraw = (match.winner === null || match.winner_name === 'No winner');

      // Summary
      const summary = generateSummaryCard('Game Summary', {
        'Players': `${match.player1_name} vs ${match.player2_name}`,
        'Winner': isDraw ? 'Draw' : match.winner_name || 'None',
        'Score': `${match.player1_sets_won} - ${match.player2_sets_won}`,
        'Duration': `${totalDuration.toFixed(2)}s`,
        'Exchanges': totalExchanges,
      });
      appMain.innerHTML += summary;

      // Showroom (graphiques)
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // 1. Barres empilées : Score par set
      const barChart = generateChart('bar', 'gameBar', {
        labels: match.sets.map(s => `Set ${s.set_number}`),
        datasets: [
          { label: match.player1_name, data: match.sets.map(s => s.player1_score), backgroundColor: '#28a745', stack: 'combined' },
          { label: match.player2_name, data: match.sets.map(s => s.player2_score), backgroundColor: '#dc3545', stack: 'combined' }
        ]
      }, { 
        scales: { 
          y: { beginAtZero: true, title: { display: true, text: 'Score' } }, 
          x: { stacked: true } 
        },
        plugins: { 
          title: { display: isDraw, text: 'Draw Match', font: { size: 16, family: 'Press Start 2P', color: '#ffc107' } }
        }
      });
      chartsContainer.appendChild(displayChartInCard(barChart, 'Score per Set'));

      // 2. Anneau : Répartition des points
      const donutChart = generateChart('doughnut', 'gameDonut', {
        labels: [match.player1_name, match.player2_name],
        datasets: [{ 
          data: [match.player1_total_points, match.player2_total_points], 
          backgroundColor: ['#28a745', '#dc3545'] 
        }]
      }, { 
        plugins: { 
          legend: { position: 'bottom' },
          title: { display: isDraw, text: 'Draw Match', font: { size: 16, family: 'Press Start 2P', color: '#ffc107' } }
        }
      });
      chartsContainer.appendChild(displayChartInCard(donutChart, 'Points Distribution'));

      // 3. Barres horizontales : Comparaison joueurs
      const hBarChart = generateChart('bar', 'gameHBar', {
        labels: ['Sets Won', 'Points'],
        datasets: [
          { label: match.player1_name, data: [match.player1_sets_won, match.player1_total_points], backgroundColor: '#28a745' },
          { label: match.player2_name, data: [match.player2_sets_won, match.player2_total_points], backgroundColor: '#dc3545' }
        ]
      }, { 
        indexAxis: 'y', 
        scales: { 
          x: { beginAtZero: true, title: { display: true, text: 'Value' } },
          y: { title: { display: true, text: 'Players' } }
        },
        plugins: { 
          legend: { position: 'right' },
          title: { display: isDraw, text: 'Draw Match', font: { size: 16, family: 'Press Start 2P', color: '#ffc107' } }
        }
      });
      chartsContainer.appendChild(displayChartInCard(hBarChart, 'Player Comparison'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}

// Récupérer et afficher le classement général
function fetchAndDisplayRankingStats() {
  fetch('/api/ranking/', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      const appMain = document.getElementById('app_main');
      appMain.innerHTML = '';

      if (!Array.isArray(data) || data.length === 0) {
        appMain.innerHTML = `<p class="text-muted" style="font-family: 'Press Start 2P', cursive;">No ranking data available.</p>`;
        return;
      }

      // Summary
      appMain.innerHTML = `
        <div class="card mb-4 shadow-sm bg-transparent">
          <div class="card-body">
            <h4 class="card-title text-center mb-3" style="font-family: 'Press Start 2P', cursive;">Ranking Summary</h4>
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead><tr>${['Rank', 'Player', 'Wins', 'Draws', 'Losses', 'Points Scored'].map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${data.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.total_wins || 0}</td><td>${p.total_draws || 0}</td><td>${p.total_losses || 0}</td><td>${p.points_scored || 0}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Showroom (graphiques)
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // 1. Barres : Top 5 joueurs par victoires
      const top5 = data.slice(0, 5);
      const barChart = generateChart('bar', 'rankBar', {
        labels: top5.map(p => p.name),
        datasets: [{ label: 'Wins', data: top5.map(p => p.total_wins), backgroundColor: '#007bff' }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: 'Wins' } } } });
      chartsContainer.appendChild(displayChartInCard(barChart, 'Top 5 Wins'));

      // 2. Donut : Répartition globale wins/draws/losses
      const totalWins = data.reduce((sum, p) => sum + (p.total_wins || 0), 0);
      const totalDraws = data.reduce((sum, p) => sum + (p.total_draws || 0), 0);
      const totalLosses = data.reduce((sum, p) => sum + (p.total_losses || 0), 0);
      const donutChart = generateChart('doughnut', 'rankDonut', {
        labels: ['Wins', 'Draws', 'Losses'],
        datasets: [{ data: [totalWins, totalDraws, totalLosses], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }]
      }, { plugins: { legend: { position: 'bottom' } } });
      chartsContainer.appendChild(displayChartInCard(donutChart, 'Global Wins vs Draws vs Losses'));

      // 3. Courbe : Points par joueur
      const lineChart = generateChart('line', 'rankLine', {
        labels: data.map(p => p.name),
        datasets: [{
          label: 'Points Scored',
          data: data.map(p => p.points_scored || 0),
          borderColor: '#007bff',
          fill: false,
          tension: 0.1
        }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: 'Points' } } } });
      chartsContainer.appendChild(displayChartInCard(lineChart, 'Points per Player'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}
