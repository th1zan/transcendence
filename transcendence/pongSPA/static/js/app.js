import { startGameSetup } from "./pong.js";
import { createTournamentForm, validateSearch, displayUserTournaments } from "./tournament.js";
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
import { displayConnectionFormular } from "./login_views.js";

let isUserLoggedIn = true; //false for connection formular

document.addEventListener("DOMContentLoaded", () => {
  //when the DOM is loaded, this event is triggered and it will:
  

  // 0. Clear all cookies
  // document.cookie.split(";").forEach((c) => {
  //   console.log('clear the cookies');
  //   document.cookie = c
  //     .replace(/^ +/, "")
  //     .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  // });
  

  // 1. Determine the initial route based on user's login status
  const initialRoute = window.location.hash.replace('#', '') || 'login'; 
  console.log('Initial route determined:', initialRoute);

  // 2. Check if the user is logged in.
  // if (localStorage.getItem('username')) {
  //   isUserLoggedIn = true;
  //   console.log('User is logged in based on localStorage username');
  // }
  // else {
    const accessToken = getCookie('access_token');
    if (accessToken) {
      isUserLoggedIn = true;
      console.log('User is logged in based on access token in cookies');
    } else {
      console.log('User is not logged in');
    }
  // }

  // 3. Set initial state
  if (isUserLoggedIn && initialRoute === 'login') {
    console.log('User logged in but on login page, redirecting to welcome');
    history.replaceState({ page: 'welcome' }, 'Welcome', '#welcome'); // Use pushState here
    displayWelcomePage();
  } else if (!isUserLoggedIn && initialRoute !== 'login') {
    console.log('User not logged in but not on login page, redirecting to login');
    history.replaceState({ page: 'login' }, 'Login', '#login'); // Use pushState here
    displayConnectionFormular();
  } else {
    console.log('Proceeding with initial route:', initialRoute);
    handleRouteChange(initialRoute);
  }

  // 4. Plan the refreshing interval for the authentication Token 
  console.log('Setting up token refresh interval');
  setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

  // 5. Listener for history changes
  window.addEventListener("popstate", function(event) {
    console.log('Popstate event triggered. Current state:', event.state);
    const route = event.state ? event.state.page : 'welcome';
    console.log('Navigating to route:', route);
    handleRouteChange(route); // Let the normal history work unless we need to redirect
  });
});

function navigateTo(route) {
  console.log('Navigating to:', route);
  history.pushState({ page: route }, '', `#${route}`);
  handleRouteChange(route);
}

function handleRouteChange(route) {
  console.log('Handling route change for:', route);
  switch(route) {
    case 'login':
      if (!isUserLoggedIn) {
        displayConnectionFormular();
      } else {
        navigateTo('welcome'); // Redirect logged in users to welcome if they try to access login
      }
      break;
    case 'register':
      displayRegistrationForm();
      break;
    case 'welcome':
      displayWelcomePage();
      break;
    case 'game':
      displayGameForm();
      break;
    case 'tournament':
      displayTournament();
      break;
    case 'statistics':
      displayStats();
      break;
    case 'userStats':
      displayUserResults();
      break;
    case 'ranking':
      displayRanking();
      break;
    case 'friends':
      displayFriends();
      break;
    case 'settings':
      displaySettings();
      break;
    default:
      if (!isUserLoggedIn && route !== 'login') {
        navigateTo('welcome'); // Redirect not logged in users trying to access protected routes
      } else {
        displayConnectionFormular(); 
      }
  }
}

export function displayTournament() {

  history.pushState({ page: 'tournament' }, 'Tournament', '#tournament');
  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

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

  history.pushState({ page: 'friends' }, 'Friends', '#friends');
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
    <h3 class="text-center">Gestion du compte</h3>

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

export function displayWelcomePage() {

  history.pushState({ page: 'welcome' }, 'Welcome', '#welcome');
  const username = localStorage.getItem("username");

  /*when this displayWelcomePage() function is called,
  we can use and fill these HTML containers from index.html,
  they are identified by their id:
  - "app" in the center of the page
  - "menu" on the left
  - "footer" on the bottom
  - "header" on the top
  */

  //class and CSS definition for the div and navbar (menu) container
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

  const menuDiv = document.getElementById("menu");

  menuDiv.innerHTML = `
    <div class="d-flex flex-column h-100" style="background-color: #c2d4de;">
      <img src="/static/mvillarr.jpg" class="rounded-circle object-fit-cover align-self-center my-4" alt="Mvillarr" width="90" height="100" />

      <!-- <button id="playButton" class="btn btn-link nav-link text-white mb-2" role="button" aria-selected="true">Play a Game</button> -->
      <!-- <button id="tournamentButton" class="btn btn-link nav-link text-white mb-2">Tournament</button> -->
      <!-- <button id="statsButton" class="btn btn-link nav-link text-white mb-2">Statistics</button> -->
      <!-- <button id="friendsButton" class="btn btn-link nav-link text-white mb-2">Friends</button> -->
      <!-- <button id="settingsButton" class="btn btn-link nav-link text-white mb-2">Settings</button> -->
      <!-- <div class="flex-grow-1"></div> -->
      <!-- <button id="logoutButton" class="btn btn-link nav-link text-danger">Logout</button> -->
           
      <a class="nav-link active mb-2" id="playButton" data-toggle="pill" role="button" aria-selected="true">Play</a>
      <a class="nav-link active mb-2" id="tournamentButton" data-toggle="pill" role="tab" aria-selected="false">New Tournament</a>
      <a class="nav-link active mb-2" id="statsButton" data-toggle="pill" role="tab" aria-selected="false">Statistics</a>
      <a class="nav-link active mb-2" id="friendsButton" data-toggle="pill" role="tab" aria-selected="false">Friends</a>
      <a class="nav-link active mb-2" id="settingsButton" data-toggle="pill" role="tab" aria-selected="false">Settings</a>

      <a class="nav-link active mb-2" id="welcomeButton" data-toggle="pill" role="tab" aria-selected="false">Return to welcome page</a>
      <a class="nav-link text-danger" id="logoutButton" data-toggle="pill" role="tab" aria-selected="false">Log out</a>
       
    </div>
  `;

  
  //section non intégré dans le code pour le moment
  //
  // const interactivediv = document.getelementbyid("interactivepart");
  // interactivediv.innerhtml = `
  //   <div style="background-image: url(/static/pong.jpg); background-repeat: no-repeat; background-attachment: fixeqd; background-size: 100% 100%;" class="p-1 h-50 d-flex rounded " >
  //     <div style="background-color: rgba(255, 255, 255, 0.4);" class="p-1 h-50 w-100 d-flex rounded align-self-end justify-content-between" >
  //       <div class="rounded-circle d-flex align-self-center m-3 overflow-hidden" style="width:100px ; height:60%; background-color: red;">
  //         <img src="/static/ilyanar.jpg" class="object-fit-cover"  alt="ilkay" width="100%" height="100%" />
  //       </div>
  //
  //       <div class="container row" style="" >
  //         <div class="col-4"> blabla 1 </div>
  //         <div class="col-4"> blabla 2 </div>
  //         <div class="col-4"> blabla 3 </div>
  //       </div>
  //
  //     </div>
  //   </div>
  //  `;

  document.getElementById("playButton").addEventListener("click", displayGameForm);
  document.getElementById("tournamentButton").addEventListener("click", displayTournament);
  document.getElementById("statsButton").addEventListener("click", displayStats);
  document.getElementById("friendsButton").addEventListener("click", displayFriends);
  document.getElementById("settingsButton").addEventListener("click", displaySettings);
  document.getElementById("welcomeButton").addEventListener("click", displayWelcomePage);
  document.getElementById("logoutButton").addEventListener("click", logout);
}

export function displaySettings() {
  history.pushState({ page: 'settings' }, 'Settings', '#settings');
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

  history.pushState({ page: 'statistics' }, 'Statistics', '#statistics');
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
  
  history.pushState({ page: 'userStats' }, 'Users Statistics', '#userStats');
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
  
  history.pushState({ page: 'ranking' }, 'Ranking', '#ranking');
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

export function displayGameForm() { 

  history.pushState({ page: 'game' }, 'Game', '#game');
 //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const username = localStorage.getItem("username");
  localStorage.setItem("context", "solo");
  
  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <h3>Pong Game</h3>
    <form id="gameForm">
      <label for="player1">Player 1 Name:</label>
      <input type="text" id="player1" value="${username} (by default)" readonly><br><br>
      <label for="player2">Player 2 Name:</label>
      <input type="text" id="player2" value="Bot_AI (by default)"><br><br>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" id="startGameButton">Start Game</button>
    </form>
   
  `;
  console.log("Username value in displayGameForm:", username);
  
  document.getElementById("startGameButton").addEventListener("click", () => {
    const player1 = username;
    const player2 = document.getElementById("player2").value.trim();
    const numberOfGames = parseInt(document.getElementById("numberOfGames").value) || 1;
    const pointsToWin = parseInt(document.getElementById("pointsToWin").value) || 3;
    
    startGameSetup(player1, player2, numberOfGames, pointsToWin);
  });

}
