import { logger } from "./app.js";

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
      <h3 class="text-center text-primary mb-4" >${i18next.t('statistics.statisticsDashboard')}</h3>
      <div class="input-group w-50 mx-auto mb-3">
        <input id="globalSearch" class="form-control" placeholder="${i18next.t('statistics.enterUsername')}" >
        <button id="globalSearchBtn" class="btn btn-primary" >${i18next.t('statistics.search')}</button>
      </div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mb-3">
        <button id="tabPlayer" class="btn btn-outline-primary shadow-sm" >${i18next.t('statistics.player')}</button>
        <button id="tabTournament" class="btn btn-outline-primary shadow-sm" >${i18next.t('statistics.tournament')}</button>
        <button id="tabGame" class="btn btn-outline-primary shadow-sm" >${i18next.t('statistics.game')}</button>
        <button id="tabRanking" class="btn btn-outline-primary shadow-sm" >${i18next.t('statistics.generalRanking')}</button>
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
function displayUserGames(username) {
  if (!username) {
    document.getElementById('searchArea').innerHTML = `<p class="text-danger" >Please enter a username.</p>`;
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
        searchArea.innerHTML = `<p class="text-muted" >No games found for ${username}.</p>`;
        return;
      }

      // Trier les matchs par date décroissante
      const sortedMatches = playedMatches.sort((a, b) => new Date(b.date_played) - new Date(a.date_played));

      searchArea.innerHTML = `
        <div class="card w-75 mx-auto" style="max-height: 300px; overflow-y: auto;">
          <div class="card-body p-2">
            <h5 class="text-center mb-3" >${i18next.t('statistics.gamesFor', { username: username })}</h5>
            <table class="table table-hover">
              <thead>
                <tr>
                  <th style="font-family: 'Press Start 2P', cursive; width: 60%;">${i18next.t('statistics.opponent&Date')}</th>
                  <th style="font-family: 'Press Start 2P', cursive; width: 40%;">${i18next.t('statistics.result')}</th>
                </tr>
              </thead>
              <tbody>
                ${sortedMatches.map(m => {
                  const opponent = m.player1_name.toLowerCase() === username.toLowerCase() ? m.player2_name : m.player1_name;
                  const date = new Date(m.date_played).toLocaleDateString();
                  const result = `${m.player1_sets_won} - ${m.player2_sets_won}`;

                  // Vérifier les matchs nuls en utilisant winner et winner_name
                  const isDraw = (m.winner === null || m.winner_name === 'No winner');
                  const winLoss = isDraw ? i18next.t('statistics.draw') :
                                 m.winner_name && m.winner_name.toLowerCase() === username.toLowerCase() ? i18next.t('statistics.win') : i18next.t('statistics.loss');
                  const colorClass = winLoss === i18next.t('statistics.win') ? 'text-success' : winLoss === i18next.t('statistics.loss') ? 'text-danger' : 'text-warning';

                  return `
                    <tr>
                      <td style="font-family: 'Press Start 2P', cursive; cursor: pointer;" class="selectGameLink" data-id="${m.id}">
                        ${opponent}<br><small style="font-size: 0.8em; color: #666;">${date}</small>
                      </td>
                      <td ><span class="${colorClass}">${result} (${winLoss})</span></td>
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
      searchArea.innerHTML = `<p class="text-danger" >${i18next.t('statistics.errorLoadingGames')}</p>`;
    });
}




// Aficher les 3 derniers tournois de l'utilisateur
function displayLastUserTournaments(searchArea, username) {
  if (!username) {
    searchArea.innerHTML = `<p class="text-danger">Please enter a username.</p>`;
    return;
  }

  fetch(`/api/user/tournaments/?username=${username}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(data => {
      // Vérifier si data est un tableau
      if (!Array.isArray(data)) {
        searchArea.innerHTML = `<p class="text-danger">${i18next.t('statistics.errorInvalidData')}</p>`;
        console.error('Expected an array, received:', data);
        return;
      }

      if (data.length === 0) {
        searchArea.innerHTML = `<p class="text-muted">${i18next.t('statistics.noTournamentsFound')}</p>`;
        return;
      }

      const tournaments = data.reverse(); 

      searchArea.innerHTML = `
        <div class="card w-75 mx-auto" style="max-height: 300px; overflow-y: auto;">
          <div class="card-body p-2">
            <h5 class="text-center mb-3">${i18next.t('statistics.recentTournamentFor', { username: username })}</h5>
            <table class="table table-hover">
              <thead>
                <tr>
                  <th style="font-family: 'Press Start 2P', cursive; width: 60%;">${i18next.t('statistics.tournament&Date')}</th>
                  <th style="font-family: 'Press Start 2P', cursive; width: 40%;">${i18next.t('statistics.status')}</th>
                </tr>
              </thead>
              <tbody>
                ${tournaments.map(t => {
                  const tournamentName = `${t.tournament_name} ${t.is_finished ? '✅' : '🏓'}`;
                  const date = new Date(t.date).toLocaleDateString();
                  const status = t.is_finished
                    ? `<span class="badge bg-success">${i18next.t('statistics.finished')}</span>`
                    : `<span class="badge bg-info text-dark">${i18next.t('statistics.ongoing')}</span>`;
                  return `
                    <tr>
                      <td style="font-family: 'Press Start 2P', cursive; cursor: pointer;" class="selectTournamentLink" data-id="${t.id}">
                        ${tournamentName}<br><small style="font-size: 0.8em; color: #666;">${date}</small>
                      </td>
                      <td>${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      searchArea.querySelectorAll('.selectTournamentLink').forEach(link => {
        link.addEventListener('click', () => {
          const tournamentId = link.dataset.id;
          fetchAndDisplayTournamentStats(tournamentId);
        });
      });
    })
    .catch(error => {
      searchArea.innerHTML = `<p class="text-danger">${i18next.t('statistics.errorLoadingTournament')}</p>`;
      console.error('Fetch error:', error);
    });
}



// tableau "Summary"
function generateSummaryCard(title, stats) {
  return `
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <h4 class="card-title text-center mb-3" >${title}</h4>
        <ul class="list-group list-group-flush">
          ${Object.entries(stats).map(([key, value]) => `
            <li class="list-group-item"><strong>${key}:</strong> ${value}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

function generateChart(type, id, data, options) {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.style.maxHeight = '200px';
  new Chart(canvas, { type, data, options });
  return canvas;
}

function displayChartInCard(chart, title) {
  const div = document.createElement('div');
  div.className = 'col-12 col-md-4';
  div.innerHTML = `
    <div class="card mb-4 shadow-">
      <div class="card-body">
        <h5 class="text-center mb-3" >${title}</h5>
      </div>
    </div>
  `;
  div.querySelector('.card-body').appendChild(chart);
  return div;
}

// fficher les stats d’un joueur 
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
                appMain.innerHTML = `<p class="text-muted" >No played matches found for ${username}.</p>`;
                return;
            }

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

            let totalMatchDuration = 0;
            let totalSetDuration = 0;
            let totalExchanges = 0;
            let totalSets = 0;

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

                const isDraw = (match.winner === null || match.winner_name === 'No winner');
                const winLoss = isDraw ? 'Draw' :
                               match.winner_name && match.winner_name.toLowerCase() === username.toLowerCase() ? 'Win' : 'Loss';

                if (winLoss === 'Win') stats.wins++;
                else if (winLoss === 'Loss') stats.losses++;
                else stats.draws++;

                const matchDuration = match.sets.reduce((sum, set) => sum + (set.duration || 0), 0);
                const matchExchanges = match.sets.reduce((sum, set) => sum + (set.exchanges || 0), 0);
                totalMatchDuration += matchDuration;
                totalSets += match.sets.length;
                totalSetDuration += match.sets.reduce((sum, set) => sum + (set.duration || 0), 0);
                totalExchanges += matchExchanges;
            });

            // Showroom avec cartes et graphs
            const chartsContainer = document.createElement('div');
            chartsContainer.className = 'row g-4';
            appMain.appendChild(chartsContainer);

            // Carte 1 : Player Summary
            const summary = generateSummaryCard(i18next.t('statistics.playerSummary'), {
                [i18next.t('statistics.name')]: username,
                [i18next.t('statistics.matchesPlayed')]: stats.totalMatches,
                [i18next.t('statistics.winRate')]: `${((stats.wins / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
                [i18next.t('statistics.drawRate')]: `${((stats.draws / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
                [i18next.t('statistics.lossRate')]: `${((stats.losses / stats.totalMatches) * 100 || 0).toFixed(1)}%`,
                [i18next.t('statistics.setsWon')]: stats.setsWon,
                [i18next.t('statistics.totalPoints')]: stats.pointsScored,
            });
            const summaryCard = document.createElement('div');
            summaryCard.className = 'col-12 col-md-4 col-sm-6';
            summaryCard.innerHTML = summary;
            chartsContainer.appendChild(summaryCard);

            // Carte 2 : Match Durations
            const durationStats = {
              [i18next.t('statistics.averageMatchDuration')]: `${(totalMatchDuration / stats.totalMatches || 0).toFixed(2)}s`,
              [i18next.t('statistics.totalMatchDuration')]: `${totalMatchDuration.toFixed(2)}s`,
              [i18next.t('statistics.averageExchangePerMatch')]: `${(totalExchanges / stats.totalMatches || 0).toFixed(2)}`
            };
            const durationCard = document.createElement('div');
            durationCard.className = 'col-12 col-md-4 col-sm-6';
            durationCard.innerHTML = `
                <div class="card mb-4 shadow-">
                    <div class="card-body">
                        <h5 class="text-center mb-3" >${i18next.t('statistics.matchDurations')}</h5>
                        <ul class="list-group list-group-flush">
                            ${Object.entries(durationStats).map(([key, value]) => `
                                <li class="list-group-item bg-transparent" ><strong>${key}:</strong> ${value}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
            chartsContainer.appendChild(durationCard);

            // Carte 3 : Set Durations & Exchanges
            const setStats = {
              [i18next.t('statistics.averageSetDuration')]: `${(totalSetDuration / totalSets || 0).toFixed(2)}s`,
              [i18next.t('statistics.averageExchangePerSet')]: `${(totalExchanges / totalSets || 0).toFixed(2)}`,
              [i18next.t('statistics.totalExchanges')]: totalExchanges
            };
            const setCard = document.createElement('div');
            setCard.className = 'col-12 col-md-4 col-sm-6';
            setCard.innerHTML = `
                <div class="card mb-4 shadow-">
                    <div class="card-body">
                        <h5 class="text-center mb-3" >${i18next.t('statistics.setDurations&Exchanges')}</h5>
                        <ul class="list-group list-group-flush">
                            ${Object.entries(setStats).map(([key, value]) => `
                                <li class="list-group-item bg-transparent" ><strong>${key}:</strong> ${value}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
            chartsContainer.appendChild(setCard);

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
                    { label: i18next.t('statistics.setsWon'), data: setsData.map(d => d.isDraw ? 0 : d.setsWon), backgroundColor: '#28a745' },
                    { label: i18next.t('statistics.setsLost'), data: setsData.map(d => d.isDraw ? 0 : d.setsLost), backgroundColor: '#dc3545' },
                    { label: i18next.t('statistics.draws'), data: setsData.map(d => d.isDraw ? (d.setsWon + d.setsLost) : 0), backgroundColor: '#ffc107' }
                ]
            }, {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.sets') } },
                    x: { stacked: true } // Empiler les barres pour mieux visualiser les nuls
                },
                plugins: { legend: { position: 'bottom' } }
            });
            chartsContainer.appendChild(displayChartInCard(barChart, i18next.t('statistics.setsWon/Lost/DrawsPerMatch')));

            // 2. Donut : Répartition victoires/défaites/nuls
            const donutChart = generateChart('doughnut', 'playerDonut', {
                labels: [i18next.t('statistics.win'), i18next.t('statistics.losses'), i18next.t('statistics.draws')],
                datasets: [{ data: [stats.wins, stats.losses, stats.draws], backgroundColor: ['#28a745', '#dc3545', '#ffc107'] }]
            }, { plugins: { legend: { position: 'bottom' } } });
            chartsContainer.appendChild(displayChartInCard(donutChart, i18next.t('statistics.winVsLossesVsDraws')));

            // 3. Courbe : Points marqués par match
            const lineChart = generateChart('line', 'playerLine', {
                labels: playedMatches.map(m => m.date_played.split('T')[0]),
                datasets: [{
                    label: i18next.t('statistics.pointsScored'),
                    data: playedMatches.map(m => m.player1_name.toLowerCase() === username.toLowerCase() ? m.player1_total_points : m.player2_total_points),
                    borderColor: '#007bff',
                    fill: false,
                    tension: 0.1
                }]
            }, { scales: { y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.points') } } } });
            chartsContainer.appendChild(displayChartInCard(lineChart, i18next.t('statistics.poinsOverTime')));

            // 4. Barres : Durée moyenne par match             const matchDurations = playedMatches.map(m => ({
                date: m.date_played.split('T')[0],
                duration: m.sets.reduce((sum, s) => sum + (s.duration || 0), 0)
            }));
            // Filtrer pour garder que les dates avec des durées > 0 (évite les jours sans matchs)
            const filteredMatchDurations = matchDurations.filter(md => md.duration > 0);

            const durationBarChart = generateChart('bar', 'playerDurationBar', {
                labels: filteredMatchDurations.map(d => d.date),
                datasets: [{ label: i18next.t('statistics.averageMatchDuration(s)'), data: filteredMatchDurations.map(d => d.duration), backgroundColor: '#007bff' }]
            }, {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.duration(s)') } }
                },
                plugins: { legend: { display: false } }
            });
            chartsContainer.appendChild(displayChartInCard(durationBarChart, i18next.t('statistics.matchDurationOverTime')));

            // 5. Lignes : Évolution des échanges par match
            const exchangesData = playedMatches.map(m => ({
                date: m.date_played.split('T')[0],
                exchanges: m.sets.reduce((sum, s) => sum + (s.exchanges || 0), 0)
            }));
            const exchangesLineChart = generateChart('line', 'playerExchangesLine', {
                labels: exchangesData.map(d => d.date),
                datasets: [{
                    label: i18next.t('statistics.exchangesPerMatch'),
                    data: exchangesData.map(d => d.exchanges),
                    borderColor: '#28a745',
                    fill: false,
                    tension: 0.1
                }]
            }, {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.exchanges') } }
                }
            });
            chartsContainer.appendChild(displayChartInCard(exchangesLineChart, i18next.t('statistics.exchangesOverTime')));
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
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const appMain = document.getElementById('app_main');
      appMain.innerHTML = '';

      if (!data || typeof data !== 'object' || !Array.isArray(data.matches)) {
        appMain.innerHTML = `<p class="text-danger">Error: Invalid tournament matches data received.</p>`;
        console.error('Expected an object with a "matches" array, received:', data);
        return;
      }

      const playedMatches = data.matches.filter(m => m.is_played);
      if (playedMatches.length === 0) {
        appMain.innerHTML = `<p class="text-muted">No played matches found for this tournament${data.is_finished ? ' (Finished)' : ''}.</p>`;
        return;
      }

      // Calcul des stats
      const winners = playedMatches
        .map(m => m.winner_name)
        .filter(w => w && w !== 'No winner');
      const draws = playedMatches.filter(m => m.winner === null || m.winner_name === 'No winner').length;
      const topWinner = winners.length
        ? winners.sort((a, b) => winners.filter(w => w === b).length - winners.filter(w => w === a).length)[0]
        : 'None';
      const avgSets = (playedMatches.reduce((sum, m) => sum + (m.player1_sets_won || 0) + (m.player2_sets_won || 0), 0) / playedMatches.length || 0).toFixed(1);
      const totalPoints = playedMatches.reduce((sum, m) => sum + (m.player1_total_points || 0) + (m.player2_total_points || 0), 0);

      // Showroom avec cartes et graphiques
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // Carte 1 : Tournament Summary
      const summary = generateSummaryCard('Tournament Summary', {
        'Name': playedMatches[0]?.tournament_name || 'Unknown',
        'Matches Played': playedMatches.length,
        'Top Winner': topWinner,
        'Draw Matches': draws,
        'Avg Sets per Match': avgSets,
        'Total Points': totalPoints,
        'Status': data.is_finished ? 'Finished' : 'Ongoing'
      });
      const summaryCard = document.createElement('div');
      summaryCard.className = 'col-12 col-md-4 col-sm-6';
      summaryCard.innerHTML = summary;
      chartsContainer.appendChild(summaryCard);

      // Carte 2 : Tournament Durations
      let totalMatchDuration = 0;
      let totalSetDuration = 0;
      let totalExchanges = 0;
      let totalSets = 0;
      playedMatches.forEach(match => {
        const matchDuration = match.sets?.reduce((sum, set) => sum + (set.duration || 0), 0) || 0;
        const matchExchanges = match.sets?.reduce((sum, set) => sum + (set.exchanges || 0), 0) || 0;
        totalMatchDuration += matchDuration;
        totalSets += match.sets?.length || 0;
        totalSetDuration += matchDuration;
        totalExchanges += matchExchanges;
      });
      const durationStats = {
        'Average Match Duration': `${(totalMatchDuration / playedMatches.length || 0).toFixed(2)}s`,
        'Total Match Duration': `${totalMatchDuration.toFixed(2)}s`,
        'Average Exchanges per Match': `${(totalExchanges / playedMatches.length || 0).toFixed(2)}`
      };
      const durationCard = document.createElement('div');
      durationCard.className = 'col-12 col-md-4 col-sm-6';
      durationCard.innerHTML = `
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <h5 class="text-center mb-3">Tournament Durations</h5>
            <ul class="list-group list-group-flush">
              ${Object.entries(durationStats).map(([key, value]) => `
                <li class="list-group-item bg-transparent"><strong>${key}:</strong> ${value}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      chartsContainer.appendChild(durationCard);

      // Carte 3 : Set Statistics
      const setStats = {
        'Average Set Duration': `${(totalSetDuration / totalSets || 0).toFixed(2)}s`,
        'Average Exchanges per Set': `${(totalExchanges / totalSets || 0).toFixed(2)}`,
        'Total Exchanges': totalExchanges
      };
      const setCard = document.createElement('div');
      setCard.className = 'col-12 col-md-4 col-sm-6';
      setCard.innerHTML = `
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <h5 class="text-center mb-3">Set Statistics</h5>
            <ul class="list-group list-group-flush">
              ${Object.entries(setStats).map(([key, value]) => `
                <li class="list-group-item bg-transparent"><strong>${key}:</strong> ${value}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      chartsContainer.appendChild(setCard);

      // 1. Barres : Victoires par joueur (avec nuls)
      const winnersCount = {};
      winners.forEach(w => winnersCount[w] = (winnersCount[w] || 0) + 1);
      const barChart = generateChart('bar', 'tourneyBar', {
        labels: [...Object.keys(winnersCount), 'Draws'],
        datasets: [{
          label: 'Match Outcomes',
          data: [...Object.values(winnersCount), draws],
          backgroundColor: ['#007bff', '#ffc107']
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
          data: playedMatches.map(m => (m.player1_total_points || 0) + (m.player2_total_points || 0)),
          borderColor: '#28a745',
          fill: true,
          tension: 0.1
        }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: 'Points' } } } });
      chartsContainer.appendChild(displayChartInCard(areaChart, 'Points per Match'));

      // 3. Barres horizontales : Répartition des sets gagnés
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

      // 4. Barres horizontales : Durée moyenne par match par joueur
      const playerDurations = {};
      playedMatches.forEach(match => {
        [match.player1_name, match.player2_name].forEach(player => {
          if (!playerDurations[player]) playerDurations[player] = { totalDuration: 0, matchCount: 0 };
          const matchDuration = match.sets?.reduce((sum, set) => sum + (set.duration || 0), 0) || 0;
          playerDurations[player].totalDuration += matchDuration;
          playerDurations[player].matchCount++;
        });
      });
      const durationHBarChart = generateChart('bar', 'tourneyDurationHBar', {
        labels: Object.keys(playerDurations),
        datasets: [{
          label: 'Average Match Duration (s)',
          data: Object.values(playerDurations).map(p => (p.totalDuration / p.matchCount || 0).toFixed(2)),
          backgroundColor: '#007bff',
          borderWidth: 1
        }]
      }, {
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, title: { display: true, text: 'Duration (s)' } },
          y: { title: { display: true, text: 'Players' } }
        },
        plugins: { legend: { display: false } }
      });
      chartsContainer.appendChild(displayChartInCard(durationHBarChart, 'Match Duration by Player'));

      // 5. Barres : Nombre moyen d’échanges par match par joueur
      const playerExchanges = {};
      playedMatches.forEach(match => {
        [match.player1_name, match.player2_name].forEach(player => {
          if (!playerExchanges[player]) playerExchanges[player] = { totalExchanges: 0, matchCount: 0 };
          const matchExchanges = match.sets?.reduce((sum, set) => sum + (set.exchanges || 0), 0) || 0;
          playerExchanges[player].totalExchanges += matchExchanges;
          playerExchanges[player].matchCount++;
        });
      });
      const exchangesBarChart = generateChart('bar', 'tourneyExchangesBar', {
        labels: Object.keys(playerExchanges),
        datasets: [{
          label: 'Average Exchanges per Match',
          data: Object.values(playerExchanges).map(p => (p.totalExchanges / p.matchCount || 0).toFixed(2)),
          backgroundColor: '#28a745',
          borderWidth: 1
        }]
      }, {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Exchanges' } }
        },
        plugins: { legend: { display: false } }
      });
      chartsContainer.appendChild(displayChartInCard(exchangesBarChart, 'Exchanges per Player'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
      console.error('Fetch error:', error);
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

      // Showroom avec cartes et graphiques
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // Carte 1 : Game Summary
      const summary = generateSummaryCard('Game Summary', {
        'Players': `${match.player1_name} vs ${match.player2_name}`,
        'Winner': isDraw ? 'Draw' : match.winner_name || 'None',
        'Score': `${match.player1_sets_won} - ${match.player2_sets_won}`,
        'Duration': `${totalDuration.toFixed(2)}s`,
        'Exchanges': totalExchanges,
      });
      const summaryCard = document.createElement('div');
      summaryCard.className = 'col-12 col-md-4 col-sm-6';
      summaryCard.innerHTML = summary;
      chartsContainer.appendChild(summaryCard);

      // Carte 2 : Match Duration
      const durationStats = {
        'Total Match Duration': `${totalDuration.toFixed(2)}s`,
        'Average Set Duration': `${(totalDuration / match.sets.length || 0).toFixed(2)}s`,
        'Total Exchanges': totalExchanges
      };
      const durationCard = document.createElement('div');
      durationCard.className = 'col-12 col-md-4 col-sm-6';
      durationCard.innerHTML = `
        <div class="card mb-4 shadow-">
          <div class="card-body">
            <h5 class="text-center mb-3" >Match Duration</h5>
            <ul class="list-group list-group-flush">
              ${Object.entries(durationStats).map(([key, value]) => `
                <li class="list-group-item bg-transparent" ><strong>${key}:</strong> ${value}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      chartsContainer.appendChild(durationCard);

      // Carte 3 : Set Details
      const setDetails = match.sets.map((set, index) => ({
        set: `Set ${set.set_number}`,
        duration: (set.duration || 0).toFixed(2),
        exchanges: set.exchanges || 0
      }));
      const setCard = document.createElement('div');
      setCard.className = 'col-12 col-md-4 col-sm-6';
      setCard.innerHTML = `
        <div class="card mb-4 shadow-">
          <div class="card-body">
            <h5 class="text-center mb-3">Set Details</h5>
            <table class="table table-sm table-hover">
              <thead>
                <tr>
                  <th >Set</th>
                  <th >Duration (s)</th>
                  <th >Exchanges</th>
                </tr>
              </thead>
              <tbody>
                ${setDetails.map(s => `
                  <tr >
                    <td>${s.set}</td>
                    <td>${s.duration}</td>
                    <td>${s.exchanges}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      chartsContainer.appendChild(setCard);

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

      // 4. Barres : Durée de chaque set
      const setDurations = match.sets.map(s => ({
        set: `Set ${s.set_number}`,
        duration: s.duration || 0
      }));
      const durationBarChart = generateChart('bar', 'gameDurationBar', {
        labels: setDurations.map(d => d.set),
        datasets: [{
          label: 'Set Duration (s)',
          data: setDurations.map(d => d.duration),
          backgroundColor: '#007bff'
        }]
      }, {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Duration (s)' } }
        },
        plugins: { legend: { display: false } }
      });
      chartsContainer.appendChild(displayChartInCard(durationBarChart, 'Set Durations'));

      // 5. Barres empilées : Échanges par set
      const setExchanges = match.sets.map(s => ({
        set: `Set ${s.set_number}`,
        exchangesP1: match.player1_name === username ? s.exchanges || 0 : 0,
        exchangesP2: match.player2_name === username ? s.exchanges || 0 : 0
      }));
      const exchangesBarChart = generateChart('bar', 'gameExchangesBar', {
        labels: setExchanges.map(e => e.set),
        datasets: [
          { label: match.player1_name, data: setExchanges.map(e => e.exchangesP1), backgroundColor: '#28a745', stack: 'combined' },
          { label: match.player2_name, data: setExchanges.map(e => e.exchangesP2), backgroundColor: '#dc3545', stack: 'combined' }
        ]
      }, {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Exchanges' } },
          x: { stacked: true }
        },
        plugins: { legend: { position: 'bottom' } }
      });
      chartsContainer.appendChild(displayChartInCard(exchangesBarChart, 'Exchanges per Set'));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}

// classement général
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
        appMain.innerHTML = `<p class="text-muted" >No ranking data available.</p>`;
        return;
      }

      // Summary
      appMain.innerHTML = `
        <div class="card mb-4 shadow-">
          <div class="card-body">
            <h4 class="card-title text-center mb-3" >${i18next.t('statistics.rankingSummary')}</h4>
            <div class="table-responsive">
              <table class="table table-striped table-hover bg-transparent ">
                <thead><tr>${[i18next.t('statistics.rank'), i18next.t('statistics.player'), i18next.t('statistics.wins'), i18next.t('statistics.draws'), i18next.t('statistics.losses'), i18next.t('statistics.pointsScored')].map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${data.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.total_wins || 0}</td><td>${p.total_draws || 0}</td><td>${p.total_losses || 0}</td><td>${p.points_scored || 0}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Showroom
      const chartsContainer = document.createElement('div');
      chartsContainer.className = 'row g-4';
      appMain.appendChild(chartsContainer);

      // 1. Barres : Top 5 joueurs par victoires
      const top5 = data.slice(0, 5);
      const barChart = generateChart('bar', 'rankBar', {
        labels: top5.map(p => p.name),
        datasets: [{ label: i18next.t('statistics.wins'), data: top5.map(p => p.total_wins), backgroundColor: '#007bff' }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.wins') } } } });
      chartsContainer.appendChild(displayChartInCard(barChart, i18next.t('statistics.top5Wins')));

      // 2. Donut : Répartition globale wins/draws/losses
      const totalWins = data.reduce((sum, p) => sum + (p.total_wins || 0), 0);
      const totalDraws = data.reduce((sum, p) => sum + (p.total_draws || 0), 0);
      const totalLosses = data.reduce((sum, p) => sum + (p.total_losses || 0), 0);
      const donutChart = generateChart('doughnut', 'rankDonut', {
        labels: [i18next.t('statistics.wins'), i18next.t('statistics.draws'), i18next.t('statistics.losses')],
        datasets: [{ data: [totalWins, totalDraws, totalLosses], backgroundColor: ['#28a745', '#ffc107', '#dc3545'] }]
      }, { plugins: { legend: { position: 'bottom' } } });
      chartsContainer.appendChild(displayChartInCard(donutChart, i18next.t('statistics.globalWinsVsDrawsVsLosses')));

      // 3. Courbe : Points par joueur
      const lineChart = generateChart('line', 'rankLine', {
        labels: data.map(p => p.name),
        datasets: [{
          label: i18next.t('statistics.pointsScored'),
          data: data.map(p => p.points_scored || 0),
          borderColor: '#007bff',
          fill: false,
          tension: 0.1
        }]
      }, { scales: { y: { beginAtZero: true, title: { display: true, text: i18next.t('statistics.points') } } } });
      chartsContainer.appendChild(displayChartInCard(lineChart, i18next.t('statistics.pointsPerPlayer')));
    })
    .catch(error => {
      document.getElementById('app_main').innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    });
}
