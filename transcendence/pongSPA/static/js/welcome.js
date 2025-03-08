import { showModalConfirmation } from "./auth.js";
import { showModal, logger } from "./app.js";
import { respondToFriendRequest } from "./friends.js";


export async function displayWelcomePage() {
  const avatarPicture = localStorage.getItem("avatarUrl");
  const username = localStorage.getItem("username") || "Guest";

  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

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
                              <img src="${avatarPicture}" class="object-fit-cover" alt="${i18next.t('welcome.profilePictureAlt')}" />
                          </div>
                          <h3 class="card-title mb-0">${i18next.t('welcome.title', { username: username })}</h3>
                      </div>
                  </div>
                  <!-- Pending Friend Requests Card -->
                  <div class="card shadow-sm pending-friend-card">
                      <div class="card-body">
                          <h4 class="card-title mb-3">${i18next.t('welcome.pendingFriendRequests')}</h4>
                          <ul class="list-group" id="pendingFriendRequests"></ul>
                      </div>
                  </div>
                  <!-- Pending Tournament Authentications Card -->
                  <div class="card shadow-sm pending-tournament-card">
                      <div class="card-body">
                          <h4 class="card-title mb-3">${i18next.t('welcome.pendingTournamentAuth')}</h4>
                          <ul class="list-group" id="pendingTournamentAuthentications"></ul>
                      </div>
                  </div>
              </div>
              <div class="col-md-6 d-flex flex-column gap-4" id="quickStatsContainer">
                  <!-- Quick Stats et Ranking seront insérés ici -->
              </div>
          </div>
      </div>
  `;

  const appBottom = document.getElementById("app_bottom");
  appBottom.innerHTML = `
    <!-- Footer de la page -->
  `;

  fetchPendingFriendRequests();
  fetchPendingTournamentAuthentications();

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
      const quickStatsContainer = document.getElementById("quickStatsContainer");
      quickStatsContainer.innerHTML = displayQuickStats(data, username);
    })
    .catch(error => {
      logger.error("Error fetching quick stats:", error);
      const quickStatsContainer = document.getElementById("quickStatsContainer");
      quickStatsContainer.innerHTML = `<p class="text-danger">${i18next.t('welcome.errorLoadingQuickStats')}: ${error.message}</p>`;
    });

  displayRankingCard()
    .then(rankingHtml => {
      const quickStatsContainer = document.getElementById("quickStatsContainer");
      quickStatsContainer.innerHTML += rankingHtml;
    })
    .catch(error => {
      logger.error("Error rendering ranking card:", error);
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
            <div>
              <button class="btn btn-primary btn-sm confirm-auth" data-tournament-id="${tournament.tournament_id}" data-player-name="${tournament.player_name}">${i18next.t('welcome.confirmParticipation')}</button>
              <button class="btn btn-danger btn-sm remove-auth" data-tournament-id="${tournament.tournament_id}" data-player-name="${tournament.player_name}">${i18next.t('welcome.removeInvitation')}</button>
            </div>
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

        // Ajouter des événements pour les boutons "Remove Invitation"
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

// Fonction pour supprimer une invitation et rafraîchir la liste
function removePlayerFromTournament(tournamentId, playerName) {
  logger.log("in removePlayerFromTournament:: tournament id: ", tournamentId, " playerName: ", playerName);

  showModalConfirmation(
    i18next.t('welcome.removePlayerConfirmationMsg'), // "Are you sure you want to remove this player?"
    i18next.t('welcome.removePlayerConfirmationTitle') // "Confirm Removal"
  ).then((confirmed) => {
    if (confirmed) {
      showModal(
        i18next.t('welcome.processingTitle'), // "Processing"
        i18next.t('welcome.processingMsg'), // "Please wait..."
        "OK",
        () => {
          fetch(`/api/tournament/${tournamentId}/remove-player-matches/${encodeURIComponent(playerName)}/`, {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then(response => {
              if (!response.ok) throw new Error(i18next.t('welcome.removeFailed') + ": " + response.status);
              return response.json();
            })
            .then(data => {
              logger.log(`Player ${playerName} removed from tournament ${tournamentId}`);
              if (data.tournament_deleted) {
                showModal(
                  i18next.t('welcome.tournamentDeletedTitle'), // "Tournament Deleted"
                  i18next.t('welcome.tournamentDeletedMsg'), // "The tournament has been deleted"
                  "OK",
                  () => {
                    
                    }
                );
              }
              // Rafraîchir la liste des authentifications en attente
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: playerName // Pas besoin de username, car request.user le gère
    }),
  })
  .then(response => {
    if (!response.ok) throw new Error(i18next.t('welcome.authenticationFailed') + ": " + response.status);
    return response.json();
  })
  .then(data => {
    if (data.message === "Player authenticated successfully") {
      logger.log(`Participation confirmed for ${playerName} in tournament ${tournamentId}`);
      showModal(i18next.t('welcome.participationConfirmed'), i18next.t('welcome.participationConfirmedMsg'), "OK", () => {
        fetchPendingTournamentAuthentications(); //Rafraichir la liste
      });
    } else {
      throw new Error(i18next.t('welcome.unexpectedResponse'));
      }
  })
  .catch(error => {
    logger.error("Error confirming participation:", error);
    showModal(i18next.t('welcome.errorTitle'), i18next.t('welcome.failedToConfirm'), "OK", () => {});  });
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
              <button class="btn btn-success btn-sm accept-request me-2" data-username="${request.sender}">${i18next.t('welcome.acceptButton')}</button>
              <button class="btn btn-danger btn-sm decline-request" data-username="${request.sender}">${i18next.t('welcome.declineButton')}</button>
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
        requestList.innerHTML = `<li class="list-group-item text-center bg-transparent border border-white" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noPendingFriendRequests')}</li>`;
      }
    })
    .catch(error => {
      logger.error("Error fetching friend requests:", error);
      const requestList = document.getElementById("pendingFriendRequests");
      requestList.innerHTML = `<li class="list-group-item text-center text-danger">${i18next.t('welcome.errorLoadingFriendRequests')}</li>`;
    });
}

//quickstat on the welcome page
function displayQuickStats(data, playerName) {
  // Vérifier si les données sont invalides ou vides
  if (!Array.isArray(data) || data.length === 0) {
    return `
      <div class="card shadow-sm pending-tournament-card">
          <div class="card-body">
              <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: playerName || "You" })}</h4>
              <div>
                  <ul class="list-group" id="quickStatsList">
                      <li class="list-group-item text-center" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noData')}</li>
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
              <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: playerName || "You" })}</h4>
              <div>
                  <ul class="list-group" id="quickStatsList">
                      <li class="list-group-item text-center" style="font-family: 'Press Start 2P', cursive; font-size: 10px;">${i18next.t('welcome.noData')}</li>
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
    `;
  } else {
    lastMatchesTable = `<p class="text-muted small">${i18next.t('welcome.noRecentMatches')}</p>`;
  }

  // Générer le canvas pour le donut
  const donutCanvasId = 'quickStatsDonut';
  const donutHtml = `<canvas id="${donutCanvasId}" style="max-height: 150px;"></canvas>`;

  // HTML de la carte avec le donut
  const cardHtml = `
    <div class="card mb-4 shadow-sm h-100" style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
      <div class="card-body">
        <h4 class="card-title mb-3">${i18next.t('welcome.quickStats', { playerName: playerName || "You" })}</h4>
        <h5 class="mb-2">${i18next.t('welcome.matchOutcomes')}</h5>
        ${donutHtml}
        <h5 class="mb-2 mt-3">${i18next.t('welcome.lastThreeMatches')}</h5>
        ${lastMatchesTable}
      </div>
    </div>
  `;

  // Générer le graphique en donut après le rendu
  setTimeout(() => {
    const canvas = document.getElementById(donutCanvasId);
    if (canvas) {
      new Chart(canvas, {
        type: 'doughnut', // Peut être changé en 'pie' pour un camembert
        data: {
          labels: [i18next.t('welcome.wins'), i18next.t('welcome.losses'), i18next.t('welcome.draws')],
          datasets: [{
            data: [wins, losses, draws],
            backgroundColor: ['#28a745', '#dc3545', '#ffc107'], // Vert, rouge, jaune
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            legend: { position: 'bottom' }
          },
          maintainAspectRatio: false
        }
      });
    }
  }, 0);

  return cardHtml;
}

function displayRankingCard() {
  return fetch('/api/ranking/', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        return `
          <div class="card mb-4 shadow-sm h-100" style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div class="card-body">
              <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
              <p class="text-muted">${i18next.t('welcome.noRankingData')}</p>
            </div>
          </div>
        `;
      }

      // Tableau et graphique limités au top 5
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

      // Générer le canvas pour le graphique à barres (limité au top 5)
      const barCanvasId = 'rankingBarWelcome';
      const barHtml = `<canvas id="${barCanvasId}" style="max-height: 200px;"></canvas>`;

      // HTML de la carte
      const cardHtml = `
        <div class="card mb-4 shadow-sm h-100" style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease;">
          <div class="card-body">
            <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
            <h5 class="mb-2">${i18next.t('welcome.top5Players')}</h5>
            ${rankingTable}
            <h5 class="mb-2 mt-3">${i18next.t('welcome.pointsPerPlayer')}</h5>
            ${barHtml}
          </div>
        </div>
      `;

      // Générer le graphique à barres après insertion (limité au top 5)
      setTimeout(() => {
        const canvas = document.getElementById(barCanvasId);
        if (canvas) {
          new Chart(canvas, {
            type: 'bar',
            data: {
              labels: top5.map(p => p.name), // Seulement les 5 premiers joueurs
              datasets: [{
                label: i18next.t('welcome.pointsScored'),
                data: top5.map(p => p.points_scored || 0), // Points des 5 premiers joueurs
                backgroundColor: '#007bff',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: i18next.t('welcome.points') }
                },
                x: {
                  title: { display: true, text: i18next.t('welcome.players') }
                }
              },
              plugins: {
                legend: { display: false }
              },
              maintainAspectRatio: false
            }
          });
        }
      }, 0);

      return cardHtml;
    })
    .catch(error => {
      logger.error("Error fetching ranking stats:", error);
      return `
        <div class="card mb-4 shadow-sm h-100" style="border: none; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div class="card-body">
            <h4 class="card-title mb-3">${i18next.t('welcome.rankingTitle')}</h4>
            <p class="text-danger">${i18next.t('welcome.errorLoadingRanking')}: ${error.message}</p>
          </div>
        </div>
      `;
    });
}
