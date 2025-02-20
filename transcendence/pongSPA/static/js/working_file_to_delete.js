export function displayUserTournaments() {
  const username = localStorage.getItem("username");

  if (!username) {
    // Remplacer l'alert par une modale Bootstrap
    showModal('genericModal', 'Login Required', 'Please log in to view your tournaments.', 'OK', function() {});
    return;
  }

  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <div class="text-center mb-4">
      <button id="toggleAllTournaments" class="btn btn-secondary btn-sm shadow-sm rounded-pill">Show all tournaments</button>
    </div>
    <div id="userTournamentList"></div>
  `;

  fetch(`/api/user/tournaments/?username=${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const userTournamentListDiv = document.getElementById("userTournamentList");
      userTournamentListDiv.innerHTML = `
        <div class="card bg-light mb-4">
          <div class="card-header text-center">
            <h2 class="display-6 mb-0 text-primary">Your Tournaments</h2>
          </div>
          <div class="card-body p-0">
            <table class="table table-hover table-responsive-sm">
              <thead class="bg-primary text-white">
                <tr>
                  <th scope="col" class="text-center">Tournament Name</th>
                  <th scope="col" class="text-center">Status</th>
                  <th scope="col" class="text-center">ID</th>
                  <th scope="col" class="text-center">Date</th>
                  <th scope="col" class="text-center">Action</th>
                </tr>
              </thead>
              <tbody id="tournamentsBody">
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Ensure data is an array before manipulating it
      const tournaments = Array.isArray(data) ? data : [data]; // Convert single object to array or use as-is if already array

      if (tournaments.length > 0) {
        // Reverse tournaments if it's an array
        const reversedTournaments = Array.isArray(tournaments) ? [...tournaments].reverse() : tournaments;

        const tournamentsBody = document.getElementById("tournamentsBody");
        reversedTournaments.forEach((tournament) => {
          const emoji = tournament.is_finished ? '✅' : '🏓';
          const statusBadge = tournament.is_finished ? 
            '<span class="badge bg-success">Finished</span>' : 
            '<span class="badge bg-info text-dark">Ongoing</span>';

          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="text-center align-middle">${tournament.tournament_name} ${emoji}</td>
            <td class="text-center align-middle">${statusBadge}</td>
            <td class="text-center align-middle">${tournament.id}</td>
            <td class="text-center align-middle">${new Date(tournament.date).toLocaleDateString()}</td>
            <td class="text-center align-middle">
              <button class="btn btn-primary btn-sm selectTournamentButton shadow rounded" data-id="${tournament.id}" data-name="${tournament.tournament_name}">
                <i class="bi bi-play-fill"></i> Select
              </button>
            </td>
          `;
          tournamentsBody.appendChild(row);
        });

        // Filter for ongoing tournaments by default
        filterTournaments('ongoing');

        document.getElementById("toggleAllTournaments").addEventListener('click', () => {
          const button = document.getElementById("toggleAllTournaments");
          const tournamentsBody = document.getElementById("tournamentsBody");
          if (button.textContent.includes("Show all tournaments")) {
            filterTournaments('all');
            button.textContent = "Show only ongoing tournaments";
            button.classList.remove('btn-secondary');
            button.classList.add('btn-info');
          } else {
            filterTournaments('ongoing');
            button.textContent = "Show all tournaments";
            button.classList.remove('btn-info');
            button.classList.add('btn-secondary');
          }
        });

        // Relier le bouton "Select" pour naviguer vers la page du tournoi
        document.querySelectorAll('.selectTournamentButton').forEach(button => {
          button.addEventListener('click', event => {
            const tournamentId = event.target.getAttribute('data-id');
            const tournamentName = event.target.getAttribute('data-name');
            selectTournament(tournamentId, tournamentName);
          });
        });
      } else {
        userTournamentListDiv.innerHTML += `
          <div class="alert alert-warning text-center" role="alert">
            You are not participating in any tournament.
          </div>
        `;
      }
    })
    .catch((error) => {
      console.error("Error retrieving user's tournaments:", error);
      userTournamentListDiv.innerHTML = `
        <div class="alert alert-danger text-center" role="alert">
          Error loading tournament information.
        </div>
      `;
    });

  function filterTournaments(filter) {
    const rows = document.querySelectorAll('#tournamentsBody tr');
    rows.forEach(row => {
      const statusBadge = row.querySelector('.badge');
      if (filter === 'all' || 
          (filter === 'ongoing' && statusBadge.classList.contains('bg-info')) || 
          (filter === 'finished' && statusBadge.classList.contains('bg-success'))) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

 
}
