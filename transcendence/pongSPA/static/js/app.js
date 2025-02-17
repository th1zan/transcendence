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
          updateUI(displayUserResults);
          break;
        case 'ranking':
          updateUI(displayRanking);
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

export function displayWelcomePage() {

  const username = localStorage.getItem("username");

  const appDiv = document.getElementById('app');
  appDiv.className = 'p-1 h-100 d-flex nav flex-column nav-pills';
  // Object.assign(appDiv, {
    // style: {
      // width: '200px'
        // backgroundColor: '#343a40'
    // },
    // role: 'tablist',
    // 'aria-orientation': 'vertical',
    // id: 'v-pills-tab'
  // });
  // Set the background image for 'app'
  // appDiv.style.backgroundImage = "url('/static/pong.jpg')";
  // appDiv.style.backgroundRepeat = "no-repeat";
  // appDiv.style.backgroundAttachment = "fixed";
  // appDiv.style.backgroundSize = "100% 100%";

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById('app_top');
  // appTop.className = "p-1 d-flex rounded";
  appTop.style.backgroundColor = 'rgba(0, 123, 255, 0.5)'; // Bleu semi-transparent (anciennement bg-primary)
  appTop.innerHTML = `
    <div class="d-flex justify-content-between align-items-center w-100">
      <div>
        <h2>Bonjour ${username}</h2>
      </div>
      <div class="align-self-end">
        <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px; height:60%; background-color: red;">
          <img src="/static/mvillarr.jpg" class="object-fit-cover" alt="mvillarr" width="100%" height="100%" />
        </div>
      </div>
    </div>
  `;

  const appMain = document.getElementById("app_main");
  // appMain.className = "p-3 flex-grow-1";
  appMain.style.backgroundColor = 'rgba(40, 167, 69, 0.5)'; // Vert semi-transparent (anciennement bg-success)
  appMain.innerHTML = `
    Contenu de la Welcome page
  `;

  const appBottom = document.getElementById("app_bottom");
  // appBottom.className = "p-3";
  appBottom.style.backgroundColor = 'rgba(255, 193, 7, 0.5)'; // Jaune semi-transparent (anciennement bg-warning)
  appBottom.innerHTML = `
    Footer de la page
  `;
}

export function displayTournament() {

      console.log('Tournament');
  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
    <h3>Tournament</h3>
    <br>
    <div class="d-flex align-items-center">
      <button id="newTournamentButton" class="me-2">New Tournament</button>
      <div id="searchTournament" class="d-flex align-items-center">
        <button id="tournamentSearchButton" class="btn btn-primary mx-2">Search for Tournament</button>
        <input type="text" id="tournamentNameInput" placeholder="Tournament Name" class="me-2">
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
  
  const avatarUrl = user.avatar_url ? user.avatar_url : "/media/avatars/default.png";
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


export function displayStats() {
  
  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
  <h3>Statistics</h3>
    <button id="viewResultsButton">Your Results</button>
    <br>
    <br>
    <button id="viewRankingButton">Overall Ranking</button> <!-- Nouveau bouton -->
  `;

  document.getElementById("viewResultsButton").addEventListener("click", fetchResultats);
  document.getElementById("viewRankingButton").addEventListener("click", fetchRanking);


}

function displayUserResults(data) {
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h3>Your Results: </h3>
    <div id="resultats"></div>
  `;

  const resultatsDiv = document.getElementById("resultats");

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((match) => {
      const date = match.date_played ? new Date(match.date_played).toLocaleString() : "Unknown Date";
      const player1 = match.player1_name || "Unknown Player 1";
      const player2 = match.player2_name || "Unknown Player 2";
      const winner = match.winner || "In Progress";
      const score = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
      const tournamentInfo = match.tournament ? ` (Tournament: ${match.tournament_name || 'Unknown'})` : "";

      resultatsDiv.innerHTML += `
        <p>
          ${date} - ${player1} vs ${player2}
          <br>
          Score: ${score}
          <br>
          Winner: ${winner}${tournamentInfo}
          <br>
        </p>`;
    });
  } else {
    resultatsDiv.innerHTML += "<p>No results found.</p>";
  }


}


function fetchResultats() {
  const username = localStorage.getItem("username");

  fetch(`/api/results/?user1=${username}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // Pour le débogage
      displayUserResults(data); // Appelle la fonction pour afficher les résultats
      console.log(data); // Vérifiez ce que vous recevez
      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
        <h3>Your Results:</h3>
        <div id="results"></div>
      `;

      const resultatsDiv = document.getElementById("results");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          const date = match.date_played ? new Date(match.date_played).toLocaleString() : "Unknown Date";
          const player1 = match.player1_name || "Unknown Player 1";
          const player2 = match.player2_name || "Unknown Player 2";
          const winner = match.winner || "In Progress";
          const score = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
          const tournamentInfo = match.tournament ? ` (Tournament: ${match.tournament_name || 'Unknown'})` : "";

          resultatsDiv.innerHTML += `
              <p>
                  ${date}
                  <br>
                  ${player1} vs ${player2}
                  <br>
                  Score: ${score}
                  <br>
                  Winner: ${winner}${tournamentInfo}
                  <br>
              </p>`;
        });
      } else {
        resultatsDiv.innerHTML += "<p>No results found.</p>";
      }

    });
}


function displayRanking(data) {
  
  //empty all the containers
  // document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h3>Player Ranking:</h3>
    <div id="ranking"></div>
  `;

  const rankingDiv = document.getElementById("ranking");
  if (Array.isArray(data) && data.length > 0) {
    data.forEach((player) => {
      const playerName = player.name || "Unknown Name";
      const totalWins = player.total_wins || 0;
      rankingDiv.innerHTML += `
          <p>
              ${playerName} - Total Wins: ${totalWins}
          </p>`;
    });
  } else {
    rankingDiv.innerHTML += "<p>No ranking found for this user.</p>";
  }

}


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
      displayRanking(data);
      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
        <h3>Player Ranking:</h3>
        <div id="ranking"></div>
      `;

      const rankingDiv = document.getElementById("ranking");
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((player) => {
          const playerName = player.name || "Unknown Name";
          const totalWins = player.total_wins || 0;
          rankingDiv.innerHTML += `
              <p>
                  ${playerName} - Total Wins: ${totalWins}
              </p>`;
        });
      } else {
        rankingDiv.innerHTML += "<p>No ranking found.</p>";
      }

    });
}

// <<<<<<< HEAD
// function displayGameFormHTML(username) {
//   return `
//     <form id="gameForm" class="w-100">
//       <div class="d-flex justify-content-between align-items-start">
//           <div class="col">
//               <h3>Game Settings</h3>
//               <label>Game Mode:</label>
//               <button id="onePlayer" class="mode-button active btn btn-outline-primary mb-2" type="button">1 Player</button>
//               <button id="twoPlayers" class="mode-button btn btn-outline-primary mb-2" type="button">2 Players</button>
//               <br><br>
//               <label>Difficulty:</label>
//               <button class="difficulty-button active btn btn-outline-primary mb-2" id="easy" type="button">Easy</button>
//               <button class="difficulty-button btn btn-outline-primary mb-2" id="medium" type="button">Medium</button>
//               <button class="difficulty-button btn btn-outline-primary mb-2" id="hard" type="button">Hard</button>
//               <br><br>
//               <label>Design:</label>
//               <button class="design-button active btn btn-outline-primary mb-2" id="oldschool" type="button">Oldschool</button>
//               <button class="design-button btn btn-outline-primary mb-2" id="modern" type="button">Modern</button>
//           </div>
//           <div class="col">
//               <h3>Match Settings</h3>
//               <label>Number of Games:</label>
//               <input type="number" id="numberOfGames" value="1" min="1" max="5" class="form-control mb-2" style="width: 60px;"><br><br>
//               <label>Sets per Game:</label>
//               <input type="number" id="setsPerGame" value="3" min="1" max="5" class="form-control mb-2" style="width: 60px;"><br><br>
//           </div>
//       </div>
//
//       <div class="d-flex justify-content-between align-items-start mt-3">
//           <div class="col">
//               <h3>Player 1</h3>
//               <label>Name:</label>
//               <input type="text" id="player1" value="${username}" class="form-control mb-2" disabled>
//               <br>
//               <label>Control:</label>
//               <select id="control1" class="form-select mb-2">
//                   <option value="arrows" selected>Arrow Keys</option>
//                   <option value="wasd">WASD</option>
//                   <option value="mouse">Mouse</option>
//               </select>
//           </div>
//           <div class="col" id="player2Container">
//               <h3>Player 2</h3>
//               <label>Name:</label>
//               <input type="text" id="player2" value="Bot-AI" class="form-control mb-2" disabled>
//               <br>
//               <div id="control2Container" style="display:none;">
//                   <label>Control:</label>
//                   <select id="control2" class="form-select mb-2">
//                       <option value="wasd" selected>WASD</option>
//                       <option value="arrows" disabled>Arrow Keys</option>
//                       <option value="mouse">Mouse</option>
//                   </select>
//               </div>
//           </div>
//       </div>
//       <div class="text-center mt-3">
//         <button id="startGameButton" class="btn btn-primary" type="button">Start Game</button>
//       </div>
//     </form>
//   `;
// }

export async function displayGameForm() { 

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  localStorage.setItem("context", "solo"); 
  
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
  };
  
  formContainer.innerHTML = `
    <form id="gameForm" class="container">
      <div class="row">
          <div class="col-12 col-md-6">
              <h3>Game Settings</h3>
              <div class="mb-3">
                  <label class="form-label">Game Mode:</label>
                  <div class="btn-group" role="group" aria-label="Game Mode">
                      <button id="onePlayer" class="mode-button btn ${gameSettings.mode === "solo" ? "btn-primary" : "btn-outline-primary"}" type="button">1 Player</button>
                      <button id="twoPlayers" class="mode-button btn ${gameSettings.mode === "multiplayer" ? "btn-primary" : "btn-outline-primary"}" type="button">2 Players</button>
                  </div>
              </div>
              <div class="mb-3">
                  <label class="form-label">Difficulty:</label>
                  <div class="btn-group" role="group" aria-label="Difficulty">
                      <button class="difficulty-button btn ${gameSettings.difficulty === "easy" ? "btn-primary" : "btn-outline-primary"}" id="easy" type="button">Easy</button>
                      <button class="difficulty-button btn ${gameSettings.difficulty === "medium" ? "btn-primary" : "btn-outline-primary"}" id="medium" type="button">Medium</button>
                      <button class="difficulty-button btn ${gameSettings.difficulty === "hard" ? "btn-primary" : "btn-outline-primary"}" id="hard" type="button">Hard</button>
                  </div>
              </div>
              <div class="mb-3">
                  <label class="form-label">Design:</label>
                  <div class="btn-group" role="group" aria-label="Design">
                      <button class="design-button btn ${gameSettings.design === "retro" ? "btn-primary" : "btn-outline-primary"}" id="retro" type="button">Retro</button>
                      <button class="design-button btn ${gameSettings.design === "neon" ? "btn-primary" : "btn-outline-primary"}" id="neon" type="button">Neon</button>
                  </div>
              </div>
          </div>
          <div class="col-12 col-md-6">
              <h3>Match Settings</h3>
              <div class="mb-3">
                  <label for="numberOfGames" class="form-label">Number of Games:</label>
                  <input type="number" id="numberOfGames" value="${gameSettings.numberOfGames}" min="1" max="5" class="form-control" style="width: 60px;">
              </div>
              <div class="mb-3">
                  <label for="setsPerGame" class="form-label">Sets per Game:</label>
                  <input type="number" id="setsPerGame" value="${gameSettings.setsPerGame}" min="1" max="5" class="form-control" style="width: 60px;">
              </div>
          </div>
      </div>
      
      <div class="row mt-4">
          <div class="col-12 col-md-6">
              <h3>Player 1</h3>
              <div class="mb-3">
                  <label for="player1" class="form-label">Name:</label>
                  <input type="text" id="player1" value="${gameSettings.player1}" class="form-control" disabled>
              </div>
              <div class="mb-3">
                  <label for="control1" class="form-label">Control:</label>
                  <select id="control1" class="form-select">
                      <option value="arrows" ${gameSettings.control1 === "arrows" ? "selected" : ""}>Arrow Keys</option>
                      <option value="wasd" ${gameSettings.control1 === "wasd" ? "selected" : ""}>WASD</option>
                      <option value="mouse" ${gameSettings.control1 === "mouse" ? "selected" : ""}>Mouse</option>
                  </select>
              </div>
          </div>
          <div class="col-12 col-md-6" id="player2Container">
              <h3>Player 2</h3>
              <div class="mb-3">
                  <label for="player2" class="form-label">Name:</label>
                  <input type="text" id="player2" value="${gameSettings.player2}" class="form-control" ${gameSettings.mode === "solo" ? "disabled" : ""}>
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
      <div class="text-center mt-4">
        <button id="startGameButton" class="btn btn-primary" type="button">Start Game</button>
      </div>
    </form>

    <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>
    <canvas id="pong" width="800" height="400" class="mt-4" style="display: block;"></canvas>  
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
    document.getElementById("player2").value = "player2";
    gameSettings.player2 = "player2";
    document.getElementById("player2").disabled = false;
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

                  if (playerData.exists && !playerData.is_guest) {
                      alert(`Player 2 exists as a registered user. Play with this username or change it. Authentication will be needed.`);
                      alertShown = true;
                      lastCheckedPlayer2 = player2;
                      needAuth = true;
                      return;
                  } else if (playerData.exists) {
                      alert(`Player 2 exists as an existing guest player. Play with this username or change it.`);
                      alertShown = true;
                      lastCheckedPlayer2 = player2;
                      return;
                  } else {
                      startGameSetup(player1, player2, numberOfGames, setsPerGame, "solo");
                  }
              } catch (error) {
                  console.error("Error checking player existence:", error);
                  alert("There was an error checking player existence. Please try again.");
              }
          } else {
              // Si player2 est "Bot-AI", on peut commencer immédiatement
              startGameSetup(player1, player2, numberOfGames, setsPerGame, "solo");
          }
      } else if (alertShown && player2 === lastCheckedPlayer2) {
          if (needAuth) {
              authenticateNow(player2, player1, numberOfGames, setsPerGame);
          } else {
              startGameSetup(player1, player2, numberOfGames, setsPerGame, "solo");
          }
      }

      console.log("Starting game with settings:", gameSettings);

      startGameSetup(gameSettings);
  });
}

async function authenticateNow(playerName, player1, numberOfGames, setsPerGame) {
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
      startGameSetup(player1, playerName, numberOfGames, setsPerGame, "solo");
    } else {
      alert("Authentication failed. Please try again.");
      modalBootstrap.hide();
      loginModal.remove();
    }
  });
}


async function authenticatePlayer(username, password, playerName) {
  const response = await fetch('/api/auth/authenticate-player/', {
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
