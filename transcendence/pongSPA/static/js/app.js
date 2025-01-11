document.addEventListener("DOMContentLoaded", () => {
  displayConnectionFormular();

  function displayConnectionFormular() {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <h2>Connexion</h2>
      <form id="loginForm">
        <input type="text" id="username" placeholder="Nom d'utilisateur" required />
        <input type="password" id="password" placeholder="Mot de passe" required />
        <button type="submit">Se connecter</button>
      </form>
      <button id="signupButton">Créer un compte</button>
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

  function displayWelcomePage(username) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
    <h2>Bonjour ${username}</h2>
    <div id="resultats"></div>
    <button id="playButton">Jouer</button>
  `;

    fetchResultats(username);

    document.getElementById("playButton").addEventListener("click", () => {
      displayGameForm(); // Affiche le formulaire de jeu
    });
  }

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
  x;

  function fetchResultats(username) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("Token non trouvé. Veuillez vous reconnecter.");
      return;
    }

    fetch(`/api/results/?username=${username}`, {
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
        if (data.results) {
          data.results.forEach((result) => {
            resultatsDiv.innerHTML += `<p>${result.date} - Score: ${result.score}</p>`;
          });
        } else {
          resultatsDiv.innerHTML += "<p>Aucun résultat trouvé.</p>";
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des résultats:", error);
      });
  }

  function startGameSetup() {
    // Récupérer les valeurs du formulaire
    user1 = document.getElementById("user1").value;
    user2 = document.getElementById("user2").value;
    numberOfGames = parseInt(document.getElementById("numberOfGames").value);
    pointsToWin = parseInt(document.getElementById("pointsToWin").value);

    // Masquer le formulaire et afficher le canvas
    document.getElementById("gameForm").style.display = "none";
    document.getElementById("pong").style.display = "block";

    // Initialiser les scores et commencer le jeu
    resetScores();
    initPongGame(); // Lance le jeu avec les paramètres fournis
  }

  function demarrerJeu() {
    alert("Le jeu commence !");
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
      <canvas id="pong" width="800" height="400" style="border: 1px solid #000000"></canvas>
      <button id="backToWelcomeButton">Retour</button>
    `;

    initPongGame();

    document
      .getElementById("backToWelcomeButton")
      .addEventListener("click", () => {
        displayWelcomePage(localStorage.getItem("username"));
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
