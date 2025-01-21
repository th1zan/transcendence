document.addEventListener("DOMContentLoaded", () => {
  displayConnectionFormular();

  function displayConnectionFormular() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Connexion fhhfggggg !!!</h2>
      <form id="loginForm">
        <input type="text" id="username" class="form-control" placeholder="Nom d'utilisateur" required />
        <input type="password" id="password" placeholder="Mot de passe" required />
        <button type="submit">Se connecter</button>
      </form>
      <button id="signupButton" class="btn btn-primary">Créer un compte</button>
    `;

    document
      .getElementById("loginForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        getToken(username, password);
      });

    document
      .getElementById("signupButton")
      .addEventListener("click", displayRegistrationForm);
  }

  function getToken(username, password) {
    fetch("/api/auth/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Connection error:" + response.status);
        }
        return response.json();
      })
      .then((data) => {
        if (data.access) {
          localStorage.setItem("access_token", data.access);
          console.log(localStorage.getItem("access_token"));
          localStorage.setItem("username", username); // Stocker le nom d'utilisateur
          displayWelcomePage(username);
        } else {
          alert("Connection error. Please retry.");
        }
      })
      .catch((error) => {
        console.error("Error during connection.", error);
      });
  }

  function displayRegistrationForm() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Créer un compte</h2>
      <form id="signupForm">
        <input type="text" id="newUsername" placeholder="Nom d'utilisateur" required />
        <input type="password" id="newPassword" placeholder="Mot de passe" required />
        <button type="submit">Créer un compte</button>
      </form>
      <button id="backToLoginButton">Retour à la connexion</button>
    `;

    document
      .getElementById("signupForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const newUsername = document.getElementById("newUsername").value;
        const newPassword = document.getElementById("newPassword").value;
        createAccount(newUsername, newPassword);
      });

    document
      .getElementById("backToLoginButton")
      .addEventListener("click", displayConnectionFormular);
  }

  function createAccount(newUsername, newPassword) {
    fetch("/api/auth/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(
              data.error || "Erreur lors de la création du compte.",
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          alert(
            "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
          );
          displayConnectionFormular();
        } else {
          alert("Erreur lors de la création du compte. Veuillez réessayer.");
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la création du compte :", error);
        alert(error.message);
      });
  }

  window.displayWelcomePage = function (username) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <h2>Bonjour ${username}</h2>
    <div id="resultats"></div>
    <button id="playButton">Jouer</button>
    <button id="deleteAccountButton" class="btn btn-danger">Supprimer le compte</button>
  `;

    fetchResultats(username);
    // Attach event listeners to buttons
    document
      .getElementById("deleteAccountButton")
      .addEventListener("click", deleteAccount);
    document
      .getElementById("playButton")
      .addEventListener("click", () => {
      displayGameForm(); // Affiche le formulaire de jeu
    });
  };

  function displayGameForm() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <h1>Pong Game</h1>
    <form id="gameForm">
      <label for="user1">Player 1 Name:</label>
      <input type="text" id="user1" value="user1"><br><br>
      <label for="user2">Player 2 Name:</label>
      <input type="text" id="user2" value="Bot_AI"><br><br>
      <label for="numberOfGames">Number of Games:</label>
      <input type="number" id="numberOfGames" value="1" min="1"><br><br>
      <label for="pointsToWin">Points to Win:</label>
      <input type="number" id="pointsToWin" value="3" min="1"><br><br>
      <button type="button" onclick="startGameSetup()">Start Game</button>
    </form>
    <canvas id="pong" width="800" height="400" style="display: none;"></canvas>
    <div id="result" style="display: none;">
      <h2>Game Results</h2>
      <p id="summary"></p>
    </div>
  `;
  }

  function fetchResultats(username) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("Token non trouvé. Veuillez vous reconnecter.");
      return;
    }

    fetch(`/api/results/?user1=${username}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const resultatsDiv = document.getElementById("resultats");
        resultatsDiv.innerHTML = "<h3>Vos résultats :</h3>";
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((match) => {
            // Ajustez selon la structure de votre PongMatch
            const date = new Date(match.date_played).toLocaleString();
            const tournamentInfo = match.tournament
              ? ` (Tournoi: ${match.tournament_name})`
              : "";
            const winner = match.winner || "En cours";
            const score = `${match.user1_sets_won} - ${match.user2_sets_won}`;

            resultatsDiv.innerHTML += `
                <p>
                    ${date} - ${match.user1} vs ${match.user2} - 
                    Score: ${score} - 
                    Winner: ${winner}${tournamentInfo}
                    <br>
                    <small>Nombre de sets à gagner: ${match.sets_to_win}, Points par set: ${match.points_per_set}</small>
                </p>`;
          });
        } else {
          resultatsDiv.innerHTML += "<p>Aucun résultat trouvé.</p>";
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des résultats:", error);
      });
  }

  function initPongGame() {
    const script = document.createElement("script");
    script.src = "/static/js/pong.js"; // Vérifiez que ce chemin est correct
    script.type = "text/javascript";
    script.onload = function () {
      console.log("Script pong.js chargé avec succès.");

      // Vérifiez si startPongGame est disponible globalement
      if (typeof window.startPongGame === "function") {
        window.startPongGame(); // Appelez la fonction exposée globalement
      } else {
        console.error(
          "startPongGame n'est pas défini après le chargement de pong.js.",
        );
      }
    };
    script.onerror = function () {
      console.error("Erreur de chargement du script pong.js.");
    };
    document.body.appendChild(script);
  }
});


function deleteAccount() {
  const confirmDelete = confirm(
    "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible."
  );

  if (!confirmDelete) return;

  fetch("/api/auth/delete-account/", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`, // Include the user's token
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Échec de la suppression du compte.");
      }
      return response.json();
    })
    .then((data) => {
      alert("Compte supprimé avec succès !");
      localStorage.clear(); // Clear all user data from localStorage

      // Force page redirection and prevent lingering JavaScript
      window.location.href = "/"; // Redirect to the login page

      //displayConnectionFormular(); // Redirect back to the login page
    })
    .catch((error) => {
      if (error.name !== "AbortError") { // Prevent errors due to reload interruption
        console.error("Erreur lors de la suppression du compte :", error);
        alert("Une erreur est survenue : " + error.message);
      }
    });
}