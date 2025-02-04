function DisplayTournamentGame(tournamentName) {
  const tournamentId = localStorage.getItem("tournamentId");

  if (!tournamentId) {
    console.error("Aucun ID de tournoi trouvé. Veuillez créer un tournoi d'abord.");
    return;
  }

  fetch(`/api/tournament/matches/?tournament_id=${tournamentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Matchs du tournoi :", data);
      // Afficher les matchs dans l'interface utilisateur
    })
    .catch((error) => {
      console.error("Erreur lors de la récupération des matchs du tournoi :", error);
    });
}



function sendTournamentToAPI(tournamentName, players, numberOfGames, pointsToWin) {
  fetch("/api/tournament/new/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: tournamentName,
      players: players,
      number_of_games: numberOfGames,
      points_to_win: pointsToWin,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Tournoi créé :", data);
      const tournamentId = data.id; // Assurez-vous que l'API renvoie l'ID
      // Stockez l'ID du tournoi pour une utilisation future
      localStorage.setItem("tournamentId", tournamentId);
    })
    .catch((error) => {
      console.error("Erreur lors de la création du tournoi :", error);
    });
}
