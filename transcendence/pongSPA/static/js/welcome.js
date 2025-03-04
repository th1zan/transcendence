import { showModal, logger } from "./app.js";
import { respondToFriendRequest } from "./friends.js";


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
                          <h3 class="card-title mb-0">${i18next.t('welcome.title', { username: username })}</h3>
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
      logger.error("Error fetching quick stats:", error);
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
      logger.error("Error fetching pending tournament authentications:", error);
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
      logger.log(`Participation confirmed for ${playerName} in tournament ${tournamentId}`);
      showModal('Success', 'Participation confirmed successfully!', 'OK', () => {
        fetchPendingTournamentAuthentications(); // Rafraîchir la liste
      });
    } else {
      throw new Error("Unexpected response");
    }
  })
  .catch(error => {
    logger.error("Error confirming participation:", error);
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
      logger.error("Error fetching friend requests:", error);
      const requestList = document.getElementById("pendingFriendRequests");
      requestList.innerHTML = `<li class="list-group-item text-center text-danger">Error loading friend requests.</li>`;
    });
}

//quickstat on the welcome page
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
    <div class="card mb-4 shadow-sm h-100  style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
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

