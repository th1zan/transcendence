import { showModalConfirmation } from "./auth.js";
import { showModal, logger } from "./app.js";
import { respondToFriendRequest } from "./friends.js";

export async function displayWelcomePage() {
  const avatarPicture = localStorage.getItem("avatarUrl");
  const username = localStorage.getItem("username") || "Guest";

  // Réinitialiser les sections
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById('app_top');
  appTop.innerHTML = '';

  // Poser le squelette des cartes dans app_main
  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6 d-flex flex-column gap-4">
          <!-- Welcome Card -->
          <div class="card shadow-sm welcome-card" id="welcomeCard">
            <div class="card-body" id="welcomeCardBody"></div>
          </div>
          <!-- Pending Friend Requests Card -->
          <div class="card shadow-sm pending-friend-card" id="friendRequestsCard">
            <div class="card-body" id="friendRequestsCardBody"></div>
          </div>
          <!-- Pending Tournament Authentications Card -->
          <div class="card shadow-sm pending-tournament-card" id="tournamentAuthCard">
            <div class="card-body" id="tournamentAuthCardBody"></div>
          </div>
        </div>
        <div class="col-md-6 d-flex flex-column gap-4">
          <!-- Quick Stats Card -->
          <div class="card shadow-sm" id="quickStatsCard">
            <div class="card-body" id="quickStatsCardBody"></div>
          </div>
          <!-- Ranking Card -->
          <div class="card shadow-sm" id="rankingCard">
            <div class="card-body" id="rankingCardBody"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const appBottom = document.getElementById("app_bottom");
  appBottom.innerHTML = `<!-- Footer de la page -->`;

  // Remplir chaque carte avec son contenu
  fillWelcomeCard(username, avatarPicture);
  fillFriendRequestsCard();
  fillTournamentAuthCard();
  fillQuickStatsCard(username);
  fillRankingCard();
}

// Fonction pour remplir la carte de bienvenue
function fillWelcomeCard(username, avatarPicture) {
  // Default avatar if none is provided
  const defaultAvatar = "/static/images/default_avatar.png";
  const avatarSrc = avatarPicture && avatarPicture !== "null" && avatarPicture !== "undefined" ? avatarPicture : defaultAvatar;
  
  const welcomeCardBody = document.getElementById("welcomeCardBody");
  welcomeCardBody.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="rounded-circle overflow-hidden me-3" style="width: 60px; height: 60px;">
        <img src="${avatarSrc}" class="object-fit-cover" style="width: 100%; height: 100%;" 
             alt="${i18next.t('welcome.profilePictureAlt')}" 
             onerror="this.onerror=null; this.src='/static/images/default_avatar.png';" />
      </div>
      <h3 class="card-title mb-0">${i18next.t('welcome.title', { username })}</h3>
    </div>
  `;
}

// Fonction pour remplir la carte des demandes d'amis
function fillFriendRequestsCard() {
  const friendRequestsCardBody = document.getElementById("friendRequestsCardBody");
  friendRequestsCardBody.innerHTML = `
    <h4 class="card-title mb-3">${i18next.t('welcome.pendingFriendRequests')}</h4>
    <ul class="list-group" id="pendingFriendRequests"></ul>
  `;
  fetchPendingFriendRequests();
}

// Fonction pour remplir la carte des authentifications de tournoi
function fillTournamentAuthCard() {
  const tournamentAuthCardBody = document.getElementById("tournamentAuthCardBody");
  tournamentAuthCardBody.innerHTML = `
    <h4 class="card-title mb-3">${i18next.t('welcome.pendingTournamentAuth')}</h4>
    <ul class="list-group" id="pendingTournamentAuthentications"></ul>
  `;
  fetchPendingTournamentAuthentications();
}

// Fonction pour remplir la carte Quick Stats
function fillQuickStatsCard(username) {
  const quickStatsCardBody = document.getElementById("quickStatsCardBody");
  quickStatsCardBody.innerHTML = `
    <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: username })}</h4>
    <div id="quickStatsContent">Loading...</div>
  `;

  fetch(`/api/results/?user1=${encodeURIComponent(username)}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      quickStatsCardBody.innerHTML = displayQuickStats(data, username);
      initializeQuickStatsChart(data, username);
    })
    .catch(error => {
      logger.error("Error fetching quick stats:", error);
      quickStatsCardBody.innerHTML = `
        <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: username })}</h4>
        <p class="text-danger">${i18next.t('welcome.errorLoadingQuickStats')}: ${error.message}</p>
      `;
    });
}

// Fonction pour initialiser le graphique Quick Stats (donut)
function initializeQuickStatsChart(data, username) {
  const canvas = document.getElementById("quickStatsDonut");
  if (!canvas || !data || !Array.isArray(data)) {
    logger.warn("QuickStats chart initialization skipped:", { canvas: !!canvas, data: !!data });
    return;
  }

  const playedMatches = data.filter(match => match.is_played === true);
  let wins = 0, losses = 0, draws = 0;
  const normalizedPlayerName = username.toLowerCase();

  playedMatches.forEach(match => {
    const isPlayer1 = match.player1_name.toLowerCase() === normalizedPlayerName;
    const isPlayer2 = match.player2_name.toLowerCase() === normalizedPlayerName;
    const winnerName = (match.winner_name || "").toLowerCase();

    if (!isPlayer1 && !isPlayer2) return;
    if (winnerName === normalizedPlayerName) wins++;
    else if (winnerName && winnerName !== "no winner" && winnerName !== "in progress" && winnerName !== "") losses++;
    else draws++;
  });

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [i18next.t('welcome.wins'), i18next.t('welcome.losses'), i18next.t('welcome.draws')],
      datasets: [{
        data: [wins, losses, draws],
        backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
        borderWidth: 1
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      maintainAspectRatio: false
    }
  });
}

// Fonction pour remplir la carte Ranking
function fillRankingCard() {
  const rankingCardBody = document.getElementById("rankingCardBody");
  rankingCardBody.innerHTML = `
    <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
    <div id="rankingContent">Loading...</div>
  `;

  fetch('/api/ranking/', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      rankingCardBody.innerHTML = displayRankingCard(data);
      initializeRankingChart(data);
    })
    .catch(error => {
      logger.error("Error fetching ranking stats:", error);
      rankingCardBody.innerHTML = `
        <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
        <p class="text-danger">${i18next.t('welcome.errorLoadingRanking')}: ${error.message}</p>
      `;
    });
}

// Fonction pour initialiser le graphique Ranking (barres)
function initializeRankingChart(data) {
  const canvas = document.getElementById("rankingBarWelcome");
  if (!canvas || !data || !Array.isArray(data)) {
    logger.warn("Ranking chart initialization skipped:", { canvas: !!canvas, data: !!data });
    return;
  }

  const top5 = data.slice(0, 5);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: top5.map(p => p.name),
      datasets: [{
        label: i18next.t('welcome.pointsScored'),
        data: top5.map(p => p.points_scored || 0),
        backgroundColor: '#007bff',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, title: { display: true, text: i18next.t('welcome.points') } },
        x: { title: { display: true, text: i18next.t('welcome.players') } }
      },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false
    }
  });
}

// Fonctions pour générer le HTML des cartes
function displayQuickStats(data, playerName) {
  if (!Array.isArray(data) || data.length === 0 || data.filter(match => match.is_played === true).length === 0) {
    return `
      <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: playerName || "You" })}</h4>
      <div>
        <ul class="list-group" id="quickStatsList">
          <li class="list-group-item text-center" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noData')}</li>
        </ul>
      </div>
    `;
  }

  let wins = 0, losses = 0, draws = 0;
  const normalizedPlayerName = (playerName || "You").toLowerCase();
  const playedMatches = data.filter(match => match.is_played === true);
  const sortedMatches = playedMatches.sort((a, b) => new Date(b.date_played) - new Date(a.date_played));

  playedMatches.forEach(match => {
    const isPlayer1 = match.player1_name.toLowerCase() === normalizedPlayerName;
    const isPlayer2 = match.player2_name.toLowerCase() === normalizedPlayerName;
    const winnerName = (match.winner_name || "").toLowerCase();

    if (!isPlayer1 && !isPlayer2) return;
    if (winnerName === normalizedPlayerName) wins++;
    else if (winnerName && winnerName !== "no winner" && winnerName !== "in progress" && winnerName !== "") losses++;
    else draws++;
  });

  const lastThreeMatches = sortedMatches.slice(0, 3);
  const lastMatchesTable = lastThreeMatches.length > 0 ? `
    <table class="table table-sm table-striped bg-transparent border border-white" style="background: rgba(255, 255, 255, 0.9); border-radius: 10px;">
      <thead>
        <tr>
          <th scope="col">Match</th>
          <th scope="col">Score</th>
        </tr>
      </thead>
      <tbody>
        ${lastThreeMatches.map(match => {
          const player1 = match.player1_name || i18next.t('welcome.unknownPlayer1');
          const player2 = match.player2_name || i18next.t('welcome.unknownPlayer2');
          const setScore = `${match.player1_sets_won || 0} - ${match.player2_sets_won || 0}`;
          return `
            <tr class="bg-transparent">
              <td class="bg-transparent">${player1} ${i18next.t('welcome.vs')} ${player2}</td>
              <td class="bg-transparent">${setScore}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  ` : `<p class="text-muted small">${i18next.t('welcome.noRecentMatches')}</p>`;

  return `
    <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: playerName || "You" })}</h4>
    <h5 class="mb-2">${i18next.t('welcome.matchOutcomes')}</h5>
    <canvas id="quickStatsDonut" style="max-height: 150px;"></canvas>
    <ul class="list-group list-group-flush mb-3 mt-3">
      <li class="list-group-item"><strong>${i18next.t('welcome.wins')}:</strong> ${wins}</li>
      <li class="list-group-item"><strong>${i18next.t('welcome.losses')}:</strong> ${losses}</li>
      <li class="list-group-item"><strong>${i18next.t('welcome.draws')}:</strong> ${draws}</li>
    </ul>
    <h5 class="mb-2">${i18next.t('welcome.lastThreeMatches')}</h5>
    ${lastMatchesTable}
  `;
}

function displayRankingCard(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return `
      <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
      <p class="text-muted">${i18next.t('welcome.noRankingData')}</p>
    `;
  }

  const top5 = data.slice(0, 5);
  const rankingTable = `
    <table class="table table-sm table-striped bg-transparent border border-white" style="background: rgba(255, 255, 255, 0.9); border-radius: 10px;">
      <thead>
        <tr>
          <th scope="col">${i18next.t('welcome.rank')}</th>
          <th scope="col">${i18next.t('welcome.player')}</th>
          <th scope="col">${i18next.t('welcome.wins')}</th>
        </tr>
      </thead>
      <tbody>
        ${top5.map((p, i) => `
          <tr class="bg-transparent">
            <td class="bg-transparent">${i + 1}</td>
            <td class="bg-transparent">${p.name}</td>
            <td class="bg-transparent">${p.total_wins || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return `
    <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
    <h5 class="mb-2">${i18next.t('welcome.top5Players')}</h5>
    ${rankingTable}
    <h5 class="mb-2 mt-3">${i18next.t('welcome.pointsPerPlayer')}</h5>
    <canvas id="rankingBarWelcome" style="max-height: 200px;"></canvas>
  `;
}

// Fonctions existantes (inchangées)
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
              <button class="btn btn-success btn-sm accept-request me-2" data-username="${request.sender}">${i18next.t('welcome.acceptButton')}</button>
              <button class="btn btn-danger btn-sm decline-request" data-username="${request.sender}">${i18next.t('welcome.declineButton')}</button>
            </div>
          `;
          requestList.appendChild(listItem);
        });

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
        requestList.innerHTML = `<li class="list-group-item text-center bg-transparent border border-white" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noPendingFriendRequests')}</li>`;
      }
    })
    .catch(error => {
      logger.error("Error fetching friend requests:", error);
      const requestList = document.getElementById("pendingFriendRequests");
      requestList.innerHTML = `<li class="list-group-item text-center text-danger">${i18next.t('welcome.errorLoadingFriendRequests')}</li>`;
    });
}

function fetchPendingTournamentAuthentications() {
  fetch("/api/user/pending-tournament-authentications/", {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
            <div>
              <button class="btn btn-primary btn-sm confirm-auth" data-tournament-id="${tournament.tournament_id}" data-player-name="${tournament.player_name}">${i18next.t('welcome.confirmParticipation')}</button>
              <button class="btn btn-danger btn-sm remove-auth" data-tournament-id="${tournament.tournament_id}" data-player-name="${tournament.player_name}">${i18next.t('welcome.removeInvitation')}</button>
            </div>
          `;
          authList.appendChild(listItem);
        });

        document.querySelectorAll(".confirm-auth").forEach(button => {
          button.addEventListener("click", event => {
            const tournamentId = event.target.getAttribute("data-tournament-id");
            const playerName = event.target.getAttribute("data-player-name");
            confirmTournamentParticipation(tournamentId, playerName);
          });
        });

        document.querySelectorAll(".remove-auth").forEach(button => {
          button.addEventListener("click", event => {
            const tournamentId = event.target.getAttribute("data-tournament-id");
            const playerName = event.target.getAttribute("data-player-name");
            removePlayerFromTournament(tournamentId, playerName);
          });
        });
      } else {
        authList.innerHTML = `<li class="list-group-item text-center bg-transparent border border-white" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noPendingTournament')}</li>`;
      }
    })
    .catch(error => {
      logger.error("Error fetching pending tournament authentications:", error);
      const authList = document.getElementById("pendingTournamentAuthentications");
      authList.innerHTML = `<li class="list-group-item text-center text-danger" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.errorLoadingTournamentAuth')}</li>`;
    });
}

function removePlayerFromTournament(tournamentId, playerName) {
  logger.log("in removePlayerFromTournament:: tournament id: ", tournamentId, " playerName: ", playerName);

  showModalConfirmation(
    i18next.t('welcome.removePlayerConfirmationMsg'),
    i18next.t('welcome.removePlayerConfirmationTitle')
  ).then((confirmed) => {
    if (confirmed) {
      showModal(
        i18next.t('welcome.processingTitle'),
        i18next.t('welcome.processingMsg'),
        "OK",
        () => {
          fetch(`/api/tournament/${tournamentId}/remove-player-matches/${encodeURIComponent(playerName)}/`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          })
            .then(response => {
              if (!response.ok) throw new Error(i18next.t('welcome.removeFailed') + ": " + response.status);
              return response.json();
            })
            .then(data => {
              logger.log(`Player ${playerName} removed from tournament ${tournamentId}`);
              if (data.tournament_deleted) {
                showModal(
                  i18next.t('welcome.tournamentDeletedTitle'),
                  i18next.t('welcome.tournamentDeletedMsg'),
                  "OK",
                  () => {}
                );
              }
              fetchPendingTournamentAuthentications();
            })
            .catch(error => {
              logger.error("Error removing player:", error);
              showModal(i18next.t('welcome.errorTitle'), i18next.t('welcome.removeErrorMsg'), "OK", () => {});
            });
        },
        null
      );
    }
  });
}

function confirmTournamentParticipation(tournamentId, playerName) {
  fetch(`/api/auth/confirm-participation/${tournamentId}/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_name: playerName })
  })
    .then(response => {
      if (!response.ok) throw new Error(i18next.t('welcome.authenticationFailed') + ": " + response.status);
      return response.json();
    })
    .then(data => {
      if (data.message === "Player authenticated successfully") {
        logger.log(`Participation confirmed for ${playerName} in tournament ${tournamentId}`);
        showModal(i18next.t('welcome.participationConfirmed'), i18next.t('welcome.participationConfirmedMsg'), "OK", () => {
          fetchPendingTournamentAuthentications();
        });
      } else {
        throw new Error(i18next.t('welcome.unexpectedResponse'));
      }
    })
    .catch(error => {
      logger.error("Error confirming participation:", error);
      showModal(i18next.t('welcome.errorTitle'), i18next.t('welcome.failedToConfirm'), "OK", () => {});
    });
}
