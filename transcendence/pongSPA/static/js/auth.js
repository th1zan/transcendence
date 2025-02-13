import { displayWelcomePage } from "./app.js";
import { displayConnectionFormular } from "./login_views.js";
import { displayMenu } from "./view_menu.js";

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
        displayMenu();
        displayWelcomePage()
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

export function createAccount(newUsername, newPassword, privacyPolicyAccepted) {
  fetch("/api/auth/register/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: newUsername, password: newPassword, privacy_policy_accepted: privacyPolicyAccepted }),
    credentials: 'omit'
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw error;
      });
    }
    return response.json();
    })
    .then((data) => {
      if (data.success) {
        localStorage.setItem("username", newUsername);
        alert("Account created successfully. You can now log in.");
        displayConnectionFormular();
      } else {
        alert("Error creating account. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error creating account:", error);
      // Construct a detailed error message from the JSON error object
      let errorMessage = "Registration error:\n";
      for (const field in error) {
        if (Array.isArray(error[field])) {
          errorMessage += `${field}: ${error[field].join(", ")}\n`;
        } else {
          errorMessage += `${field}: ${error[field]}\n`;
        }
      }
      alert(errorMessage);
    });
}

export function deleteAccount() {
  const confirmDelete = confirm(
    "Are you sure you want to delete your account? This action is irreversible.",
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
        throw new Error("Account deletion failed.");
      }
      return response.json();
    })
    .then((data) => {
      alert("Account successfully deleted!");
      localStorage.clear(); // Clear all user data from localStorage

      // Force page redirection and prevent lingering JavaScript
      window.location.href = "/"; // Redirect to the login page

      //displayConnectionFormular(); // Redirect back to the login page
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        // Prevent errors due to reload interruption
        console.error("Error deleting account:", error);
        alert("An error occurred:" + error.message);
      }
    });
}

export function anonymizeAccount() {
  const confirmAnonymize = confirm(
    "Are you sure you want to anonymize your account? This action is irreversible."
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
            error.error || "Account anonymization failed."
          );
        });
      }
      return response.json();
    })
    .then((data) => {
      alert(data.message || "Your account has been anonymized successfully.");
      localStorage.clear();
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Error anonymizing account:", error);
      alert("An error occurred: " + error.message);
    });
}

export function uploadAvatar() {
  const input = document.getElementById("avatarInput");
  const file = input.files[0];

  if (!file) {
    alert("Please select a file.");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);

  fetch("/api/auth/upload-avatar/", {
    method: "POST",
    credentials: "include", // Ensures authentication
    body: formData,
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => { 
          throw new Error(error.error || "Upload failed."); 
        });
      }
      return response.json();
    })
    .then(data => {
      alert("Profile picture updated successfully!");
      const profilePic = document.getElementById("profilePic");

      if (profilePic && data.avatar_url) {
        profilePic.src = data.avatar_url + "?t=" + new Date().getTime(); // Prevents caching issues
      }
    })
    .catch(error => {
      console.error("Error uploading profile picture:", error);
      alert("Error: " + error.message);
    });
}

export function updateProfile() {
  const username = document.getElementById("usernameInput").value;
  const email = document.getElementById("emailInput").value;
  const phoneNumber = document.getElementById("phoneInput").value;

  fetch("/api/auth/user/", {
    method: "PUT",
    credentials: "include", // Send authentication cookies
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      email: email,
      phone_number: phoneNumber
    }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to update profile.");
      }
      return response.json();
    })
    .then(data => {
      alert("Profile updated successfully!");
    })
    .catch(error => {
      console.error("Error updating profile:", error);
      alert("An error occurred: " + error.message);
    });
}



export function validateToken() {
  // Vérifie si le username est dans le localStorage
  const username = localStorage.getItem('username');
  if (!username) {
    console.log('No username found in localStorage, token validation skipped.');
    return Promise.resolve(false); // Retourne une promesse résolue avec false si le username n'est pas trouvé
  }

  // Si le username est présent, on demande au serveur de vérifier le token
  return fetch("/api/auth/validate/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.valid) {
      console.log('Token is valid');
      return true;
    } else {
      console.log('Token validation failed');
      return false;
    }
  })
  .catch(error => {
    console.error('Error validating token:', error);
    return false;
  });
}
