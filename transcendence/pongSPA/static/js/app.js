import { startGameSetup } from "./pong.js";
import { validateToken } from "./auth.js";
import { createTournamentForm, validateSearch, displayUserTournaments, checkUserExists, checkPlayerExists} from "./tournament.js";
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
} from "./auth.js";
import { sendFriendRequest, respondToFriendRequest, fetchFriends, fetchFriendRequests, removeFriend } from "./friends.js";
import { displayConnectionFormular, displayRegistrationForm } from "./login.js";
import { displayMenu } from "./menu.js";
import { loadPrivacyPolicyModal } from "./privacy_policy.js";


let isUserLoggedIn = false; //false for connection formular

document.addEventListener("DOMContentLoaded", () => {
  //when the DOM is loaded, this event is triggered and it will:

//  0. Clear all cookies
  document.cookie.split(";").forEach((c) => {
    console.log('clear the cookies');
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  loadPrivacyPolicyModal();

// 1. Determine the initial route based on the URL hash
  let initialRoute = window.location.hash.replace('#', '') || 'login';
  console.log('Initial route determined:', initialRoute);

  // Variable globale pour l'état de connexion
  let isUserLoggedIn = false;

  // 2. Check if the user is logged in.
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
    window.addEventListener("popstate", function(event) {
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
      switch(route) {
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


// Fonction générique pour afficher une modale
export function showModal(modalId, title, message, actionText, actionCallback) {
  const modalElement = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalElement, {
    keyboard: false
  });

  // Mise à jour du titre et du message
  document.getElementById(`${modalId}Label`).textContent = title;
  document.getElementById(`${modalId}Body`).textContent = message;

  // Mise à jour du texte du bouton d'action et ajout de l'écouteur d'événement
  const actionButton = document.getElementById(`${modalId}Action`);
  if (actionButton) {
    actionButton.textContent = actionText;
    actionButton.removeEventListener('click', actionButton.handler); // Supprime l'ancien écouteur
    actionButton.addEventListener('click', function handler() {
      actionCallback();
      modal.hide();
    });
    actionButton.handler = actionButton.onclick; // Stocke le nouvel écouteur
  }

  // Affiche la modale et déplace le focus
  modal.show();
  const focusableElement = modalElement.querySelector(`#${modalId}Action`); // Focus sur le bouton "Action"
  if (focusableElement) {
    focusableElement.focus(); // Déplace le focus dans la modale
  }
}

// Fonction pour afficher une modale avec deux boutons personnalisés
export function showCustomModal(title, message, continueCallback) {
  const modalElement = document.getElementById('customModal');
  const modal = new bootstrap.Modal(modalElement, {
    keyboard: false
  });

  // Mise à jour du titre et du message
  document.getElementById('customModalLabel').textContent = title;
  document.getElementById('customModalBody').textContent = message;

  // Gestion du bouton Cancel
  const cancelButton = document.getElementById('cancelButton');
  cancelButton.onclick = function() {
    modal.hide();
  };

  // Gestion du bouton Continue
  const continueButton = document.getElementById('continueButton');
  continueButton.onclick = function() {
    continueCallback();
    modal.hide();
  };

  // Affiche la modale et déplace le focus
  modal.show();
  continueButton.focus(); // Focus sur le bouton "Continue"
}


export function displayWelcomePage() {
  const username = localStorage.getItem("username");

  // const appDiv = document.getElementById('app');
  // Les styles commentés sont préservés mais non appliqués ici pour clarté
  // appDiv.style.backgroundImage = "url('/static/pong.jpg')";
  // appDiv.style.backgroundRepeat = "no-repeat";
  // appDiv.style.backgroundAttachment = "fixed";
  // appDiv.style.backgroundSize = "100% 100%";

  // Vider tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById('app_top');
  // appTop.style.backgroundColor = 'rgba(0, 123, 255, 0.5)';
  appTop.innerHTML = `
    <div>
      <div>
        <h2>Hello ${username}</h2>
      </div>
      <div class="align-self-end">
        <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px; height:60%; background-color: red;">
          <img src="/static/mvillarr.jpg" class="object-fit-cover" alt="mvillarr" width="100%" height="100%" />
        </div>
      </div>
    </div>
  `;

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
   <div class="container py-5" style="background: linear-gradient(-45deg, #ff9a9e, #fad0c4, #fbc2eb, #a6c1ee); background-size: 400% 400%; animation: gradientBG 15s ease infinite; font-family: 'Poppins', sans-serif;">
  <h3 class="text-center mb-4" style="color: #fff; font-weight: 700; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);">Welcome Page</h3>
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card mb-4" style="background: rgba(255, 255, 255, 0.9); border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
        <div class="card-body">
          <h4 class="mb-3" style="color: #e84393;">Pending Friend Requests</h4>
          <ul class="list-group" id="pendingFriendRequests">
            <li class="list-group-item" style="background-color: rgba(255, 255, 255, 0.9); border: none; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">Friend Request 1</li>
            <li class="list-group-item" style="background-color: rgba(255, 255, 255, 0.9); border: none; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">Friend Request 2</li>
          </ul>
        </div>
      </div>
      <div class="card" style="background: rgba(255, 255, 255, 0.9); border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
        <div class="card-body">
          <h4 class="mb-3" style="color: #00b894;">Pending Tournament Authentications</h4>
          <ul class="list-group" id="pendingTournamentAuthentications">
            <li class="list-group-item" style="background-color: rgba(255, 255, 255, 0.9); border: none; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">Tournament 1</li>
            <li class="list-group-item" style="background-color: rgba(255, 255, 255, 0.9); border: none; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">Tournament 2</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
  `;

  const appBottom = document.getElementById("app_bottom");
  appBottom.innerHTML = `
    Footer de la page
  `;

  // Charger les requêtes d’amis et les tournois non authentifiés
  fetchPendingFriendRequests();
  fetchPendingTournamentAuthentications();
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
      authList.innerHTML = `<li class="list-group-item text-center">No pending tournament authentications.</li>`;
    }
  })
  .catch(error => {
    console.error("Error fetching pending tournament authentications:", error);
    const authList = document.getElementById("pendingTournamentAuthentications");
    authList.innerHTML = `<li class="list-group-item text-center text-danger">Error loading tournament authentications.</li>`;
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
      showModal('genericModal', 'Success', 'Participation confirmed successfully!', 'OK', () => {
        fetchPendingTournamentAuthentications(); // Rafraîchir la liste
      });
    } else {
      throw new Error("Unexpected response");
    }
  })
  .catch(error => {
    console.error("Error confirming participation:", error);
    showModal('genericModal', 'Error', 'Failed to confirm participation. Please try again.', 'OK', () => {});
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
        requestList.innerHTML = `<li class="list-group-item text-center">No pending friend requests.</li>`;
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
      <h3 class="display-5 text-center text-dark fw-bold mb-4">Tournament</h3>
      <div class="d-flex justify-content-center align-items-center gap-4">
        <button id="newTournamentButton" class="btn btn-primary btn-lg px-4 py-2 rounded-pill shadow">
          New Tournament
        </button>
        <div class="d-flex align-items-center gap-2" id="searchTournament">
          <input 
            type="text" 
            id="tournamentNameInput" 
            class="form-control form-control-lg rounded-pill" 
            placeholder="Tournament Name"
          >
          <button id="tournamentSearchButton" class="btn btn-secondary btn-sm px-4 py-2 rounded-pill shadow">
            Search for Tournament
          </button>
        </div>
      </div>
    </div>
  `;

  displayUserTournaments();
  // let resultDiv = document.getElementById("app_main");
  //   resultDiv.style.display = "block";

    document.getElementById("newTournamentButton").addEventListener("click", createTournamentForm);

    document.getElementById("tournamentSearchButton").addEventListener("click", () => {
      const tournamentNameInput = document.getElementById("tournamentNameInput");
      if (!tournamentNameInput) {
        console.error("The element 'tournamentNameInput'  is not available.");
        return;
      }

      const tournamentName = tournamentNameInput.value;
      if (!tournamentName) {
        alert("Please enter a tournament name.");
        return;
      }

      localStorage.setItem("tournamentName", tournamentName);
      validateSearch();
    });

}


export function displayFriends() {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_main");
  appTop.innerHTML = `
    <h3>Friends</h3>
    <br>
    <div>
      <input type="text" id="friendUsername" placeholder="Username" class="form-control" />
      <button id="sendFriendRequestButton" class="btn btn-success mt-2">Send Friend Request</button>
    </div>
    <br>
    <br>
    <h4>Pending Friend Requests</h4>
    <ul id="friendRequests" class="list-group"></ul>
    <br>
    <br>
    <h4>My Friends</h4>
    <ul id="friendList" class="list-group"></ul>
  `;

  document.getElementById("sendFriendRequestButton").addEventListener("click", () => {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (friendUsername) {
      sendFriendRequest(friendUsername);
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

    <!-- Account Actions -->
    <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-link nav-link text-danger">Delete account</button>
      <button id="anonymizeAccountButton" class="btn btn-link nav-link text-warning">Anonimize account</button>
    </div>
  `;

  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
  document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
  document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
  document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
}

export function displaySettings() {

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
    const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";

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
  })
  .catch(error => {
    console.error("Error loading user data:", error);
    });

}


// // Fonction pour supprimer tous les écouteurs d'événements existants et éviter les doublons
// function removeEventListeners() {
//   const buttons = [
//     "viewResultsButton",
//     "viewPlayerResult",
//     "viewRankingButton",
//     "searchPlayerButton" // Nouvel ID pour le bouton dans fetchPlayerResult
//   ];
//   buttons.forEach((id) => {
//     const button = document.getElementById(id);
//     if (button) {
//       const newButton = button.cloneNode(true);
//       button.parentNode.replaceChild(newButton, button);
//     }
//   });
// }

// Fonction principale pour afficher les statistiques et initialiser les boutons
export function displayStats() {
  // Vide tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <div class="container mt-4">
      <h3 class="text-center text-primary mb-4">Statistics</h3>
      <div class="d-flex flex-md-row flex-column justify-content-center align-items-center gap-3">
        <button id="viewResultsButton" class="btn btn-outline-success btn-lg shadow-sm">
          My Results
        </button>
        <button id="viewPlayerResult" class="btn btn-outline-secondary btn-lg shadow-sm">
          Search Player's Result
        </button>
        <button id="viewRankingButton" class="btn btn-outline-primary btn-lg shadow-sm">
          Overall Ranking
        </button>
      </div>
    </div>
  `;

  // Supprime les anciens écouteurs pour éviter les doublons
  // removeEventListeners();

  // Ajoute les nouveaux écouteurs
  document.getElementById("viewResultsButton").addEventListener("click", () => fetchResultats());
  document.getElementById("viewPlayerResult").addEventListener("click", fetchPlayerResult);
  document.getElementById("viewRankingButton").addEventListener("click", fetchRanking);
}

// Fonction pour afficher le formulaire de recherche de résultats d'un joueur
function fetchPlayerResult() {
  const appDiv = document.getElementById("app_main");
  appDiv.innerHTML = `
    <div class="form-group mt-2">
      <label for="playerName">Player Name</label>
      <input type="text" id="playerName" class="form-control" required> 
      <button id="searchPlayerButton" class="btn btn-outline-success btn-lg shadow-sm mt-2">
        Search Results
      </button>
    </div>
  `;

  // Supprime les anciens écouteurs pour éviter les doublons
  // removeEventListeners();

  // Ajoute un écouteur pour le bouton de recherche
  document.getElementById("searchPlayerButton").addEventListener("click", () => {
    const playerName = document.getElementById("playerName").value.trim();
    if (playerName) {
      fetchResultats(playerName); // Passe le nom du joueur à fetchResultats
    } else {
      alert("Please enter a player name.");
    }
  });
}

// Fonction pour calculer et afficher les statistiques de synthèse
function displaySummaryStats(data, playerName) {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="text-muted">No summary statistics available.</p>';
  }

  const playedMatches = data.filter(match => match.is_played === true);
  if (playedMatches.length === 0) {
    return '<p class="text-muted">No played matches available for summary statistics.</p>';
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalMatches = 0;
  let totalSetsWon = 0;
  let totalSetsLost = 0;
  let totalPointsScored = 0;
  let totalPointsConceded = 0;
  let longestWinningStreak = 0;
  let currentWinningStreak = 0;
  let totalSetsPlayed = 0;
  let tournamentWins = 0;

  // Normaliser le nom du joueur pour la comparaison
  const normalizedPlayerName = (playerName || "You").toLowerCase();

  // Trier les matchs par date pour la série de victoires
  playedMatches.sort((a, b) => new Date(a.date_played) - new Date(b.date_played));

  playedMatches.forEach((match) => {
    totalMatches++;

    // Vérifier si le joueur est player1 ou player2
    const isPlayer1 = match.player1_name.toLowerCase() === normalizedPlayerName;
    const isPlayer2 = match.player2_name.toLowerCase() === normalizedPlayerName;
    const winnerName = (match.winner_name || "").toLowerCase();

    // Si le joueur n'est ni player1 ni player2, ignorer ce match pour ses stats
    if (!isPlayer1 && !isPlayer2) return;

    // Calcul des sets et points en fonction du rôle du joueur
    const playerSetsWon = isPlayer1 ? match.player1_sets_won : match.player2_sets_won;
    const playerSetsLost = isPlayer1 ? match.player2_sets_won : match.player1_sets_won;
    const playerPointsScored = isPlayer1 ? match.player1_total_points : match.player2_total_points;
    const playerPointsConceded = isPlayer1 ? match.player2_total_points : match.player1_total_points;

    totalSetsWon += playerSetsWon || 0;
    totalSetsLost += playerSetsLost || 0;
    totalPointsScored += playerPointsScored || 0;
    totalPointsConceded += playerPointsConceded || 0;
    totalSetsPlayed += match.sets && Array.isArray(match.sets) ? match.sets.length : 0;

    // Déterminer victoire, défaite ou nul
    if (winnerName === normalizedPlayerName) {
      wins++;
      currentWinningStreak++;
      longestWinningStreak = Math.max(longestWinningStreak, currentWinningStreak);
      if (match.is_tournament_match) tournamentWins++;
    } else if (winnerName && winnerName !== "no winner" && winnerName !== "in progress" && winnerName !== "") {
      losses++;
      currentWinningStreak = 0;
    } else {
      draws++;
      currentWinningStreak = 0;
    }
  });

  // Calculs des ratios et pourcentages
  const avgPointsPerSet = totalSetsPlayed > 0 ? (totalPointsScored / totalSetsPlayed).toFixed(1) : 0;
  const winLossRatio = losses > 0 ? (wins / losses).toFixed(2) : wins > 0 ? "∞" : "0.00";
  const setsRatio = totalSetsLost > 0 ? (totalSetsWon / totalSetsLost).toFixed(2) : totalSetsWon > 0 ? "∞" : "0.00";
  const pointsRatio = totalPointsConceded > 0 ? (totalPointsScored / totalPointsConceded).toFixed(2) : totalPointsScored > 0 ? "∞" : "0.00";
  const winPercentage = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
  const lossPercentage = totalMatches > 0 ? ((losses / totalMatches) * 100).toFixed(1) : 0;
  const drawPercentage = totalMatches > 0 ? ((draws / totalMatches) * 100).toFixed(1) : 0;
  const tournamentWinPercentage = totalMatches > 0 ? ((tournamentWins / totalMatches) * 100).toFixed(1) : 0;

  // Vérification des pourcentages
  const totalPercentage = parseFloat(winPercentage) + parseFloat(lossPercentage) + parseFloat(drawPercentage);
  if (Math.abs(totalPercentage - 100) > 0.1 && totalMatches > 0) {
    console.warn(`Percentages do not add up to 100%: ${totalPercentage}%`);
  }

  return `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h4 class="card-title">Summary Statistics for ${playerName || "You"}</h4>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Total Matches Played:</strong> ${totalMatches}</li>
          <li class="list-group-item"><strong>Wins:</strong> ${wins} (${winPercentage}%)</li>
          <li class="list-group-item"><strong>Losses:</strong> ${losses} (${lossPercentage}%)</li>
          <li class="list-group-item"><strong>Draws:</strong> ${draws} (${drawPercentage}%)</li>
          <li class="list-group-item"><strong>Win/Loss Ratio:</strong> ${winLossRatio}:1</li>
          <li class="list-group-item"><strong>Sets Won/Lost Ratio:</strong> ${setsRatio}:1</li>
          <li class="list-group-item"><strong>Points Scored/Conceded Ratio:</strong> ${pointsRatio}:1</li>
          <li class="list-group-item"><strong>Longest Winning Streak:</strong> ${longestWinningStreak} matches</li>
          <li class="list-group-item"><strong>Average Points per Match:</strong> ${totalMatches > 0 ? (totalPointsScored / totalMatches).toFixed(1) : 0}</li>
          <li class="list-group-item"><strong>Total Sets Played:</strong> ${totalSetsPlayed}</li>
          <li class="list-group-item"><strong>Average Points per Set:</strong> ${avgPointsPerSet}</li>
          <li class="list-group-item"><strong>Tournament Wins:</strong> ${tournamentWins} (${tournamentWinPercentage}% of matches)</li>
        </ul>
      </div>
    </div>
  `;
}

// Fonction modifiée pour inclure les statistiques de synthèse et filtrer les matchs non joués
function fetchResultats(player = null) {
  const username = player || localStorage.getItem("username");

  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Fetched results:", data);

      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
        <h3 class="mb-3">Results for ${player || "You"}:</h3>
        ${displaySummaryStats(data, player || "You")}
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <h4 class="card-title">Match History</h4>
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="thead-dark">
                  <tr>
                    <th scope="col" data-priority="1">Date</th>
                    <th scope="col" data-priority="1">Players</th>
                    <th scope="col" data-priority="2">Score (Sets)</th>
                    <th scope="col" data-priority="3">Points</th>
                    <th scope="col" data-priority="2">Winner</th>
                    <th scope="col" data-priority="4">Tournament</th>
                  </tr>
                </thead>
                <tbody id="results"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      const resultatsDiv = document.getElementById("results");

      if (Array.isArray(data) && data.length > 0) {
        // Filtrer les matchs joués
        const playedMatches = data.filter(match => match.is_played === true);
        const sortedData = playedMatches.sort((a, b) => {
          const dateA = a.date_played ? new Date(a.date_played) : new Date(0);
          const dateB = b.date_played ? new Date(b.date_played) : new Date(0);
          return dateB - dateA; // Trie du plus récent au plus ancien
        });

        if (sortedData.length > 0) {
          sortedData.forEach((match) => {
            const dateObj = match.date_played ? new Date(match.date_played) : null;
            const dateStr = dateObj ? dateObj.toLocaleDateString() : "Unknown Date";
            const timeStr = dateObj ? dateObj.toLocaleTimeString() : "Unknown Time";
            const player1 = match.player1_name || "Unknown Player 1";
            const player2 = match.player2_name || "Unknown Player 2";
            const winner = match.winner_name || "In Progress";
            const setScore = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
            const points = `${match.player1_total_points || 0} - ${match.player2_total_points || 0}`;
            const tournament = match.tournament_name || "-";

            // Détails des sets
            let setsDetails = "";
            if (match.sets && Array.isArray(match.sets)) {
              setsDetails = match.sets
                .map((set) => `Set ${set.set_number}: ${set.player1_score}-${set.player2_score}`)
                .join("<br>");
            }

            resultatsDiv.innerHTML += `
              <tr>
                <td>
                  ${dateStr}
                  <br>
                  <small class="text-muted">${timeStr}</small>
                </td>
                <td>${player1} vs ${player2}</td>
                <td>
                  ${setScore}
                  ${setsDetails ? `<br><small class="text-muted">${setsDetails}</small>` : ""}
                </td>
                <td>${points}</td>
                <td>${winner}</td>
                <td>${tournament}</td>
              </tr>
            `;
          });
        } else {
          resultatsDiv.innerHTML = `
            <tr>
              <td colspan="6" class="text-center">No played results found for ${player || "you"}.</td>
            </tr>
          `;
        }
      } else {
        resultatsDiv.innerHTML = `
          <tr>
            <td colspan="6" class="text-center">No results found for ${player || "you"}.</td>
          </tr>
        `;
      }
    })
    .catch((error) => {
      console.error("Error fetching results:", error);
      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `<p class="text-danger">Error loading results: ${error.message}</p>`;
    });
}


// function displayRanking(data) {
//   //empty all the containers
//   // document.getElementById('app_top').innerHTML = '';
//   document.getElementById('app_main').innerHTML = '';
//   document.getElementById('app_bottom').innerHTML = '';
//
//   const appMain = document.getElementById("app_main");
//   appMain.innerHTML = `
//     <h3>Player Ranking:</h3>
//     <div id="ranking"></div>
//   `;
//
//   const rankingDiv = document.getElementById("ranking");
//   if (Array.isArray(data) && data.length > 0) {
//     data.forEach((player) => {
//       const playerName = player.name || "Unknown Name";
//       const totalWins = player.total_wins || 0;
//       rankingDiv.innerHTML += `
//           <p>
//               ${playerName} - Total Wins: ${totalWins}
//           </p>`;
//     });
//   } else {
//     rankingDiv.innerHTML += "<p>No ranking found for this user.</p>";
//   }
//
// }


function fetchRanking() {
  fetch("/api/ranking/", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);

      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
        <h3 class="mb-3">Player Ranking:</h3>
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <h4 class="card-title">Ranking Overview</h4>
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="thead-dark">
                  <tr>
                    <th scope="col" data-priority="1">Rank</th>
                    <th scope="col" data-priority="1">Player</th>
                    <th scope="col" data-priority="2">Wins</th>
                    <th scope="col" data-priority="2">Losses</th>
                    <th scope="col" data-priority="3">Draws</th>
                    <th scope="col" data-priority="3">Sets Won</th>
                    <th scope="col" data-priority="3">Sets Lost</th>
                    <th scope="col" data-priority="4">Points Scored</th>
                    <th scope="col" data-priority="4">Points Conceded</th>
                  </tr>
                </thead>
                <tbody id="ranking"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      const rankingDiv = document.getElementById("ranking");

      if (Array.isArray(data) && data.length > 0) {
        // Les données sont déjà triées par le backend
        data.forEach((player, index) => {
          const rank = index + 1; // Rang commence à 1
          const playerName = player.name || "Unknown Name";
          const totalWins = player.total_wins || 0;
          const totalLosses = player.total_losses || 0;
          const totalDraws = player.total_draws || 0;
          const setsWon = player.sets_won || 0;
          const setsLost = player.sets_lost || 0;
          const pointsScored = player.points_scored || 0;
          const pointsConceded = player.points_conceded || 0;

          rankingDiv.innerHTML += `
            <tr>
              <td>${rank}</td>
              <td>${playerName}</td>
              <td>${totalWins}</td>
              <td>${totalLosses}</td>
              <td>${totalDraws}</td>
              <td>${setsWon}</td>
              <td>${setsLost}</td>
              <td>${pointsScored}</td>
              <td>${pointsConceded}</td>
            </tr>
          `;
        });
      } else {
        rankingDiv.innerHTML = `
          <tr>
            <td colspan="9" class="text-center">No ranking found.</td>
          </tr>
        `;
      }
    })
    .catch((error) => {
      console.error("Error fetching ranking:", error);
      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `<p class="text-danger">Error loading ranking.</p>`;
    });
}

export function displayGameForm() {
  
  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  localStorage.setItem("isTournamentMatch", false); 
  const formContainer = document.getElementById("app_main");
  const username = localStorage.getItem("username")

  let gameSettings = {
    mode: "solo",
    difficulty: "easy",
    design: "retro",
    numberOfGames: 1, //entre 1 et 5
    setsPerGame: 3, //entre 1 et 5
    player1: localStorage.getItem("username"),
    player2: "Bot-AI",
    control1: "arrows",
    control2: "wasd",
    isTournamentMatch: false
  };

  formContainer.innerHTML = `
<form id="gameForm" class="container w-100">
  
    <ul class="nav nav-pills mb-3 d-flex justify-content-center" id="pills-tab" role="tablist">
        <li class="nav-item" role="presentation">
        <button class="nav-link active" id="pills-game-settings-tab" data-bs-toggle="pill" data-bs-target="#pills-game-settings" type="button" role="tab" aria-controls="pills-game-settings" aria-selected="true">Game Settings</button>
        </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="pills-match-settings-tab" data-bs-toggle="pill" data-bs-target="#pills-match-settings" type="button" role="tab" aria-controls="pills-match-settings" aria-selected="false">Match Settings</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="pills-player-settings-tab" data-bs-toggle="pill" data-bs-target="#pills-player-settings" type="button" role="tab" aria-controls="pills-player-settings" aria-selected="false">Player Settings</button>
      </li>
    </ul>
    <div class="tab-content" id="pills-tabContent">
      <div class="tab-pane fade show active" id="pills-game-settings" role="tabpanel" aria-labelledby="pills-game-settings-tab">
        <div class="d-flex justify-content-center mt-3">
          <!-- Game Settings Container -->
          <div class="col p-3 d-flex flex-column">
            <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Game Settings</h3>
            <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between">
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
                  <button class="difficulty-button btn ${gameSettings.difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
                  <button class="difficulty-button btn ${gameSettings.difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
                  <button class="difficulty-button btn ${gameSettings.difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
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



    <div class="tab-pane fade" id="pills-match-settings" role="tabpanel" aria-labelledby="pills-match-settings-tab">
      <div class="d-flex justify-content-center mt-3">
        <!-- Match Settings Container -->
        <div class="col p-3 d-flex flex-column">
          <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Match Settings</h3>
          <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between">
            <div class="mb-3">
              <label for="numberOfGames" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Number of Games:</label>
              <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" class="form-control p-2" style="width: 60px;">
            </div>
            <div class="mb-3">
              <label for="setsPerGame" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Sets per Game:</label>
              <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" class="form-control" style="width: 60px;">
            </div>
          </div>
        </div>
      </div>
    </div>


    <div class="tab-pane fade" id="pills-player-settings" role="tabpanel" aria-labelledby="pills-player-settings-tab">
      <div class="d-flex justify-content-between align-items-stretch mt-3">
        <div class="col p-3 d-flex flex-column">
          <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 1</h3>
          <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between">
            <div class="mb-3">
              <label for="player1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-label">Name:</label>
              <input type="text" id="player1" value="${gameSettings.player1}" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-control" disabled>
            </div>
            <div class="mb-3">
              <label for="control1" style="font-family: 'Press Start 2P', cursive; font-size: 15px;" class="form-label">Control:</label>
              <select id="control1" class="form-select">
                <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="arrows" ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="wasd" ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
                <option style="font-family: 'Press Start 2P', cursive; font-size: 15px;" value="mouse" ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
              </select>
          </div>
        </div>
      </div>

      <div class="col p-3 d-flex flex-column">
        <h3 class="text-center p-2" style="font-family: 'Press Start 2P', cursive; font-size: 24px;">Player 2</h3>
        <div class="border border-primary rounded p-3 flex-grow-1 d-flex flex-column justify-content-between">
          <div class="mb-3">
            <label for="player2" class="form-label" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">Name:</label>
            <input type="text" id="player2" value="${gameSettings.player2}" class="form-control" style="font-family: 'Press Start 2P', cursive; font-size: 15px;">
          </div>
          <div id="control2Container" class="mb-3" style="${gameSettings.mode === "solo" ? "display:none;" : "display:block;"}">
            <label for="control2" class="form-label">Control:</label>
            <select id="control2" class="form-select">
              <option value="wasd" ${gameSettings.control2 === "wasd" ? "selected" : ""}>WASD</option>
              <option value="arrows" ${gameSettings.control2 === "arrows" ? "selected" : ""}>Arrow Keys</option>
              <option value="mouse" ${gameSettings.control2 === "mouse" ? "selected" : ""}>Mouse</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  
    <div class="text-center mt-4">
      <button id="startGameButton" class="btn btn-primary" type="button">Start Game</button>
    </div>
  </form>
  
  <div id="result" style="display: none;">
    <h2>Game Results</h2>
    <p id="summary"></p>
  </div>
  `;

    function toggleActiveButton(group, selectedId) {
      document.querySelectorAll(group).forEach(button => {
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
      });
      document.getElementById(selectedId).classList.remove('btn-outline-primary');
      document.getElementById(selectedId).classList.add('btn-primary');
  }

  document.querySelectorAll(".mode-button, .difficulty-button, .design-button").forEach(button => {
      button.addEventListener("click", function() {
          toggleActiveButton(`.${this.classList[0]}`, this.id);
      });
  });

  let isTwoPlayerMode = false;
  document.getElementById("onePlayer").addEventListener("click", function() {
    document.getElementById("player2Container").style.display = "block";
    document.getElementById("player2").value = "Bot-AI";
    gameSettings.player2 = "Bot-AI";
    document.getElementById("player2").disabled = true;
    document.getElementById("control2Container").style.display = "none";

    document.getElementById("control1").value = "arrows";
    document.getElementById("control2").value = "wasd";

    document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
    document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);

    isTwoPlayerMode = false;
    gameSettings.mode = "solo";
  });

  document.getElementById("twoPlayers").addEventListener("click", function() {
    document.getElementById("player2Container").style.display = "block";
    document.getElementById("player2").value = ""; // Laissez vide pour permettre à l'utilisateur de saisir
    gameSettings.player2 = ""; // Réinitialisez également dans gameSettings
    document.getElementById("player2").disabled = false; // Assurez-vous qu'il est activable
    document.getElementById("control2Container").style.display = "block";

    document.getElementById("control1").value = "arrows";
    document.getElementById("control2").value = "wasd";

    document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
    document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);

    document.getElementById("control1").querySelector("option[value='wasd']").disabled = true;
    document.getElementById("control2").querySelector("option[value='arrows']").disabled = true;

    isTwoPlayerMode = true;
    gameSettings.mode = "multiplayer";
  });

  document.getElementById("numberOfGames").addEventListener("input", function() {
    gameSettings.numberOfGames = parseInt(this.value);
  });

  document.getElementById("setsPerGame").addEventListener("input", function() {
    gameSettings.setsPerGame = parseInt(this.value);
  });

  document.getElementById("player2").addEventListener("input", function() {
    gameSettings.player2 = this.value;
  });

  document.getElementById("control1").addEventListener("change", function () {
    const selected = this.value;
    gameSettings.control1 = this.value;
    const control2 = document.getElementById("control2");

    control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control2.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.getElementById("control2").addEventListener("change", function () {
    const selected = this.value;
    gameSettings.control2 = this.value;
    const control1 = document.getElementById("control1");

    control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
    control1.querySelector(`option[value="${selected}"]`).disabled = true;
  });

  document.querySelectorAll(".difficulty-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.difficulty = this.id;
    });
  });

  document.querySelectorAll(".design-button").forEach(button => {
    button.addEventListener("click", function() {
      gameSettings.design = this.id;
    });
  });

  let alertShown = false; 
  let lastCheckedPlayer2 = ""; 
  let needAuth = false; 

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

          const registeredUserModal = new bootstrap.Modal(document.getElementById('registeredUserModal'), {
            keyboard: false
          });
          const guestPlayerModal = new bootstrap.Modal(document.getElementById('guestPlayerModal'), {
            keyboard: false
          });

          if (playerData.exists && !playerData.is_guest) {
            // Affiche la modale pour joueur enregistré
            registeredUserModal.show();
            document.getElementById('authNeeded').addEventListener('click', function() {
              alertShown = true;
              lastCheckedPlayer2 = player2;
              needAuth = true;
              registeredUserModal.hide(); // Ferme la modale après l'action
            });
            return;
          } else if (playerData.exists) {
            // Affiche la modale pour joueur invité
            guestPlayerModal.show();
            document.getElementById('continueWithGuest').addEventListener('click', function() {
              alertShown = true;
              lastCheckedPlayer2 = player2;
              guestPlayerModal.hide(); // Ferme la modale après l'action
            });
            return;
          } else {
            startGameSetup(gameSettings);
            return;
          }
        } catch (error) {
          console.error("Error checking player existence:", error);
          // Ici, vous pourriez aussi créer une modale pour les erreurs si vous le souhaitez
          alert("There was an error checking player existence. Please try again.");
          return;
        }
      } else {
        startGameSetup(gameSettings);
        return;
      }
    }

    // Vérification de l'authentification après les alertes pour les utilisateurs enregistrés
    // et lancement du jeu pour les joueurs invités existants après le deuxième clic
    if (needAuth) {
        // Ici, c'est le deuxième clic qui déclenche l'authentification
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

// === THIS displayGameForm function is NOT refactored ===
// export function displayGameForm() {
//
//   //empty all the containers
//   document.getElementById('app_top').innerHTML = '';
//   document.getElementById('app_main').innerHTML = '';
//   document.getElementById('app_bottom').innerHTML = '';
//
//   localStorage.setItem("isTournamentMatch", false); 
//   const formContainer = document.getElementById("app_main");
//   const username = localStorage.getItem("username")
//
//
//   let gameSettings = {
//     mode: "solo",
//     difficulty: "easy",
//     design: "retro",
//     numberOfGames: 1, //entre 1 et 5
//     setsPerGame: 3, //entre 1 et 5
//     player1: localStorage.getItem("username"),
//     player2: "Bot-AI",
//     control1: "arrows",
//     control2: "wasd",
//     isTournamentMatch: false
//   };
//
//   formContainer.innerHTML = `
//     <form id="gameForm" class="container">
//       <div class="row">
//           <div class="col-12 col-md-6">
//               <h3>Game Settings</h3>
//               <div class="mb-3">
//                   <label class="form-label">Game Mode:</label>
//                   <div class="btn-group" role="group" aria-label="Game Mode">
//                       <button id="onePlayer" class="mode-button btn ${gameSettings.mode === "solo" ? "btn-primary" : "btn-outline-primary"}" type="button">1 Player</button>
//                       <button id="twoPlayers" class="mode-button btn ${gameSettings.mode === "multiplayer" ? "btn-primary" : "btn-outline-primary"}" type="button">2 Players</button>
//                   </div>
//               </div>
//               <div class="mb-3">
//                   <label class="form-label">Difficulty:</label>
//                   <div class="btn-group" role="group" aria-label="Difficulty">
//                       <button class="difficulty-button btn ${gameSettings.difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
//                       <button class="difficulty-button btn ${gameSettings.difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
//                       <button class="difficulty-button btn ${gameSettings.difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
//                   </div>
//               </div>
//               <div class="mb-3">
//                   <label class="form-label">Design:</label>
//                   <div class="btn-group" role="group" aria-label="Design">
//                       <button class="design-button btn ${gameSettings.design === "retro" ? "btn-primary" : "btn-outline-primary"}" id="retro" type="button">Retro</button>
//                       <button class="design-button btn ${gameSettings.design === "neon" ? "btn-primary" : "btn-outline-primary"}" id="neon" type="button">Neon</button>
//                   </div>
//               </div>
//           </div>
//           <div class="col-12 col-md-6">
//               <h3>Match Settings</h3>
//               <div class="mb-3">
//                   <label for="numberOfGames" class="form-label">Number of Games:</label>
//                   <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" class="form-control" style="width: 60px;">
//               </div>
//               <div class="mb-3">
//                   <label for="setsPerGame" class="form-label">Sets per Game:</label>
//                   <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" class="form-control" style="width: 60px;">
//               </div>
//           </div>
//       </div>
//
//       <div class="row mt-4">
//           <div class="col-12 col-md-6">
//               <h3>Player 1</h3>
//               <div class="mb-3">
//                   <label for="player1" class="form-label">Name:</label>
//                   <input type="text" id="player1" value="${gameSettings.player1}" class="form-control" disabled>
//               </div>
//               <div class="mb-3">
//                   <label for="control1" class="form-label">Control:</label>
//                   <select id="control1" class="form-select">
//                       <option value="wasd" ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
//                       <option value="arrows" ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
//                       <option value="mouse" ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
//                   </select>
//               </div>
//           </div>
//           <div class="col-12 col-md-6" id="player2Container">
//               <h3>Player 2</h3>
//               <div class="mb-3">
//                   <label for="player2" class="form-label">Name:</label>
//                   <input type="text" id="player2" value="${gameSettings.player2}" class="form-control" ${gameSettings.mode === "solo" ? "disabled" : ""}>
//                   <!-- <input type="text" id="player2" value="${gameSettings.player2}" class="form-control"> -->
//               </div>
//               <div id="control2Container" class="mb-3" style="${gameSettings.mode === "solo" ? "display:none;" : "display:block;"}">
//                   <label for="control2" class="form-label">Control:</label>
//                   <select id="control2" class="form-select">
//                       <option value="arrows" ${gameSettings.control2 === "arrows" ? "selected" : ""}>Arrow Keys</option>
//                       <option value="wasd" ${gameSettings.control2 === "wasd" ? "selected" : ""}>WASD</option>
//                       <option value="mouse" ${gameSettings.control2 === "mouse" ? "selected" : ""}>Mouse</option>
//                   </select>
//               </div>
//           </div>
//       </div>
//       <div class="text-center mt-4">
//         <button id="startGameButton" class="btn btn-primary" type="button">Start Game</button>
//       </div>
//     </form>
//
//     <div id="result" style="display: none;">
//       <h2>Game Results</h2>
//       <p id="summary"></p>
//     </div>
//     <!-- <canvas id="pong" width="800" height="400" class="mt-4" style="display: block;"></canvas>   -->
//   `;
//
//   function toggleActiveButton(group, selectedId) {
//       document.querySelectorAll(group).forEach(button => {
//           button.classList.remove('btn-primary');
//           button.classList.add('btn-outline-primary');
//       });
//       document.getElementById(selectedId).classList.remove('btn-outline-primary');
//       document.getElementById(selectedId).classList.add('btn-primary');
//   }
//
//   document.querySelectorAll(".mode-button, .difficulty-button, .design-button").forEach(button => {
//       button.addEventListener("click", function() {
//           toggleActiveButton(`.${this.classList[0]}`, this.id);
//       });
//   });
//
//   let isTwoPlayerMode = false;
//   document.getElementById("onePlayer").addEventListener("click", function() {
//     document.getElementById("player2Container").style.display = "block";
//     document.getElementById("player2").value = "Bot-AI";
//     gameSettings.player2 = "Bot-AI";
//     document.getElementById("player2").disabled = true;
//     document.getElementById("control2Container").style.display = "none";
//
//     document.getElementById("control1").value = "arrows";
//     document.getElementById("control2").value = "wasd";
//
//     document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
//     document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);
//
//     isTwoPlayerMode = false;
//     gameSettings.mode = "solo";
//   });
//
//   document.getElementById("twoPlayers").addEventListener("click", function() {
//     document.getElementById("player2Container").style.display = "block";
//     document.getElementById("player2").value = ""; // Laissez vide pour permettre à l'utilisateur de saisir
//     gameSettings.player2 = ""; // Réinitialisez également dans gameSettings
//     document.getElementById("player2").disabled = false; // Assurez-vous qu'il est activable
//     document.getElementById("control2Container").style.display = "block";
//
//     document.getElementById("control1").value = "arrows";
//     document.getElementById("control2").value = "wasd";
//
//     document.getElementById("control1").querySelectorAll("option").forEach(opt => opt.disabled = false);
//     document.getElementById("control2").querySelectorAll("option").forEach(opt => opt.disabled = false);
//
//     document.getElementById("control1").querySelector("option[value='wasd']").disabled = true;
//     document.getElementById("control2").querySelector("option[value='arrows']").disabled = true;
//
//     isTwoPlayerMode = true;
//     gameSettings.mode = "multiplayer";
//   });
//
//   document.getElementById("numberOfGames").addEventListener("input", function() {
//     gameSettings.numberOfGames = parseInt(this.value);
//   });
//
//   document.getElementById("setsPerGame").addEventListener("input", function() {
//     gameSettings.setsPerGame = parseInt(this.value);
//   });
//
//   document.getElementById("player2").addEventListener("input", function() {
//     gameSettings.player2 = this.value;
//   });
//
//   document.getElementById("control1").addEventListener("change", function () {
//     const selected = this.value;
//     gameSettings.control1 = this.value;
//     const control2 = document.getElementById("control2");
//
//     control2.querySelectorAll("option").forEach(opt => opt.disabled = false);
//     control2.querySelector(`option[value="${selected}"]`).disabled = true;
//   });
//
//   document.getElementById("control2").addEventListener("change", function () {
//     const selected = this.value;
//     gameSettings.control2 = this.value;
//     const control1 = document.getElementById("control1");
//
//     control1.querySelectorAll("option").forEach(opt => opt.disabled = false);
//     control1.querySelector(`option[value="${selected}"]`).disabled = true;
//   });
//
//   document.querySelectorAll(".difficulty-button").forEach(button => {
//     button.addEventListener("click", function() {
//       gameSettings.difficulty = this.id;
//     });
//   });
//
//   document.querySelectorAll(".design-button").forEach(button => {
//     button.addEventListener("click", function() {
//       gameSettings.design = this.id;
//     });
//   });
//
//   let alertShown = false; 
//   let lastCheckedPlayer2 = ""; 
//   let needAuth = false; 
//
// document.getElementById("startGameButton").addEventListener("click", async () => {
//     const player1 = username;
//     let player2 = document.getElementById("player2").value.trim();
//     const numberOfGames = parseInt(document.getElementById("numberOfGames").value);
//     const setsPerGame = parseInt(document.getElementById("setsPerGame").value);
//
//     console.log("Start button clicked");
//
//     if (!alertShown || player2 !== lastCheckedPlayer2) {
//         alertShown = false;
//         needAuth = false;  
//         if (isTwoPlayerMode) {
//             try {
//                 const playerData = await checkPlayerExists(player2);
//
//                 if (playerData.exists && !playerData.is_guest) {
//                     // Si player2 est un utilisateur enregistré, on affiche l'alerte
//                     alert(`Player 2 exists as a registered user. Play with this username or change it. Authentication will be needed.`);
//                     alertShown = true;
//                     lastCheckedPlayer2 = player2;
//                     needAuth = true;
//                     // On ne lance pas l'authentification ici, on attend le deuxième clic
//                     return; // Sortir de la fonction pour attendre le deuxième clic
//                 } else if (playerData.exists) {
//                     // Pour un joueur invité existant, on affiche l'alerte
//                     alert(`Player 2 exists as an existing guest player. Play with this username or change it.`);
//                     alertShown = true;
//                     lastCheckedPlayer2 = player2;
//                     // On ne lance pas le jeu ici, on attend le deuxième clic
//                     return; // Sortir de la fonction pour attendre le deuxième clic
//                 } else {
//                     startGameSetup(gameSettings);
//                     return; // Sortir de la fonction après avoir lancé le jeu
//                 }
//             } catch (error) {
//                 console.error("Error checking player existence:", error);
//                 alert("There was an error checking player existence. Please try again.");
//                 return; // Sortir de la fonction en cas d'erreur
//             }
//         } else {
//             // Si player2 est "Bot-AI", on peut commencer immédiatement
//             startGameSetup(gameSettings);
//             return; // Sortir de la fonction après avoir lancé le jeu
//         }
//     }
//
//     // Vérification de l'authentification après les alertes pour les utilisateurs enregistrés
//     // et lancement du jeu pour les joueurs invités existants après le deuxième clic
//     if (needAuth) {
//         // Ici, c'est le deuxième clic qui déclenche l'authentification
//         const authResult = await authenticateNow(player2, player1, numberOfGames, setsPerGame);
//         if (authResult) {
//             startGameSetup(gameSettings);
//         }
//     } else if (player2 !== lastCheckedPlayer2) {
//         // Si player2 a changé, on lance le jeu directement
//         startGameSetup(gameSettings);
//     } else {
//         // Si c'est le deuxième clic pour un joueur invité existant, on lance le jeu
//         startGameSetup(gameSettings);
//     }
//
//     console.log("Starting game with settings:", gameSettings);
//   });
// }

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

    document.getElementById('submitLogin').addEventListener('click', async function() {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const authResult = await authenticatePlayer(username, password, playerName);
      if (authResult.success) {
        modalBootstrap.hide();
        loginModal.remove();
        resolve(true); // Résout la promesse en cas de succès
      } else {
        alert("Authentication failed. Please try again.");
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
