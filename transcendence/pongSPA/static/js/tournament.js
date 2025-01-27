export function DisplayTournamentGame(tournamentName) {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h2>Matchs du tournoi : ${tournamentName}</h2>
    <div id="tournamentMatches"></div>
  `;

  fetch(`/api/tournament/matches/?tournament_name=${tournamentName}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const tournamentMatchesDiv = document.getElementById("tournamentMatches");
      tournamentMatchesDiv.innerHTML = "<h3>Liste des matchs :</h3>";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((match) => {
          const date = new Date(match.date_played).toLocaleString();
          const winner = match.winner || "En cours";
          const score = `${match.player1_sets_won} - ${match.player2_sets_won}`;

          tournamentMatchesDiv.innerHTML += `
            <p>
              ${date} - ${match.player1.player} vs ${match.player2.player} - 
              Score: ${score} - 
              Winner: ${winner}
              <br>
              <small>Nombre de sets à gagner: ${match.sets_to_win}, Points par set: ${match.points_per_set}</small>
            </p>`;
        });
      } else {
        tournamentMatchesDiv.innerHTML += "<p>Aucun match trouvé pour ce tournoi.</p>";
      }
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération des matchs du tournoi:", error);
    });
}

export function createTournamentForm() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Créer un tournoi</h2>
      <form id="tournamentForm">
        <input type="text" id="tournamentName" placeholder="Nom du tournoi" required>
        <div id="playerContainer"></div>
        <button type="button" id="addPlayerButton">Ajouter un joueur</button>
        <br><br>
        <label for="numberOfGames">Nombre de jeux :</label>
        <input type="number" id="numberOfGames" value="1" min="1"><br><br>
        <label for="pointsToWin">Points à gagner :</label>
        <input type="number" id="pointsToWin" value="3" min="1"><br><br>
        <button type="button" id="submitButton">Soumettre</button>
        <button type="button" id="displayTournamentButton">Afficher les matchs du tournoi</button>
      </form>
    `;
    
    const playerContainer = document.getElementById('playerContainer');
    const addButton = document.getElementById('addPlayerButton');
    const submitButton = document.getElementById('submitButton');
    let playerCount = 1;
    let players = [];
    
    addButton.onclick = () => {
        const playerDiv = document.createElement('div');
        playerDiv.innerHTML = `Joueur n° : ${playerCount} <input type="text" placeholder="Pseudo">`;
        playerContainer.appendChild(playerDiv);
        playerCount++;
    };

    submitButton.onclick = () => {
        const tournamentName = document.getElementById('tournamentName').value;
        players = Array.from(playerContainer.children).map(div => div.querySelector('input').value);
        const numberOfGames = document.getElementById('numberOfGames').value;
        const pointsToWin = document.getElementById('pointsToWin').value;
        sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin);
    };

    document.getElementById('displayTournamentButton').addEventListener('click', () => {
        const tournamentName = document.getElementById('tournamentName').value;
        DisplayTournamentGame(tournamentName);
    });

    function sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin) {
        fetch("/api/tournament/new/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                tournament_name: tournamentName, 
                players, 
                number_of_games: numberOfGames, 
                points_to_win: pointsToWin 
            }),
        })
        .then(response => response.json())
        .then(data => console.log('Success:', data))
        .catch((error) => console.error('Error:', error));
    }
}
