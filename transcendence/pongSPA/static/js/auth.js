import { displayWelcomePage } from "./app.js";
import { displayConnectionFormular } from "./app.js";

export function getToken(username, password) {
  const csrftoken = getCookie("csrftoken");

  fetch("/api/auth/login/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
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
      if (data.message === "Login successful") {
        console.log("Login successful");
        // if (data.access) {
        //   localStorage.setItem("access_token", data.access);
        //   console.log(localStorage.getItem("access_token"));
        //   localStorage.setItem("refresh_token", data.refresh); // Save refresh token
        localStorage.setItem("username", username); // Stocker le nom d'utilisateur
        displayWelcomePage();
      } else {
        alert("Connection error. Please retry.");
      }
    })
    .catch((error) => {
      console.error("Error during connection.", error);
    });
}

export function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export function refreshToken() {
  fetch("/api/auth/refresh/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Token refresh error:" + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (data.message === "Token refreshed successfully") {
        console.log("Token refreshed successfully");
      } else {
        alert("Token refresh error. Please retry.");
      }
    })
    .catch((error) => {
      console.error("Error during token refresh.", error);
    });
}

export function logout() {
  const confirmLogout = confirm("Are you sure you want to log out?");
  if (!confirmLogout) return;

  fetch("/api/auth/logout/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(error.error || "Logout request failed.");
        });
      }
      localStorage.clear(); // Clear all user data
      alert("Logout successful!");
      window.location.href = "/"; // Redirect to login page
    })
    .catch((error) => {
      console.error("Logout failed:", error);
      alert("An error occurred during logout: " + error.message);
    });
}

export function createAccount(newUsername, newPassword) {
  fetch("/api/auth/register/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: newUsername, password: newPassword }),
    credentials: 'omit'
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(
            data.detail || data.error || "Erreur lors de la création du compte."
          );
      });
    }
    return response.json();
    })
    .then((data) => {
      if (data.success) {
        localStorage.setItem("username", newUsername);
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

export function deleteAccount() {
  const confirmDelete = confirm(
    "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
  );

  if (!confirmDelete) return;

  fetch("/api/auth/delete-account/", {
    method: "DELETE",
    credentials: "include",
    headers: {
      //  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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
      if (error.name !== "AbortError") {
        // Prevent errors due to reload interruption
        console.error("Erreur lors de la suppression du compte :", error);
        alert("Une erreur est survenue : " + error.message);
      }
    });
}

export function anonymizeAccount() {
  const confirmAnonymize = confirm(
    "Êtes-vous sûr de vouloir anonymiser votre compte ? Cette action est irréversible."
  );
  if (!confirmAnonymize) return;

  fetch("/api/auth/anonymize-account/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(
            error.error || "Échec de l'anonymisation du compte."
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      alert(data.message || "Votre compte a été anonymisé avec succès.");
      localStorage.clear();
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Erreur lors de l'anonymisation du compte :", error);
      alert("Une erreur est survenue : " + error.message);
    });
}