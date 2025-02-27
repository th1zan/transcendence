import { displayWelcomePage, navigateTo, showModal } from "./app.js";
import { displayMenu } from "./menu.js";
import { displayConnectionFormular } from "./login.js";


export function showModalConfirmation(message, title = "Confirmation") {
  return new Promise((resolve) => {
    const modalElement = document.getElementById('confirmationModal');
    if (!modalElement) {
      console.error('Confirmation modal not found in DOM');
      resolve(false); // Résout avec false en cas d’erreur
      return;
    }

    const modal = new bootstrap.Modal(modalElement, {
      keyboard: false
    });

    // Mise à jour du titre
    const titleElement = document.getElementById('confirmationModalLabel');
    if (titleElement) {
      titleElement.textContent = title;
    } else {
      console.error('Confirmation modal title element not found');
    }

    // Mise à jour du message
    const bodyElement = document.getElementById('confirmationModalBody');
    if (bodyElement) {
      bodyElement.textContent = message;
    } else {
      console.error('Confirmation modal body element not found');
    }

    // Gestion des boutons
    const yesButton = document.getElementById('confirmationModalYes');
    const noButton = document.getElementById('confirmationModalNo');

    if (yesButton && noButton) {
      // Supprimer les anciens écouteurs pour éviter les doublons
      yesButton.removeEventListener('click', yesButton.handler);
      noButton.removeEventListener('click', noButton.handler);

      // Ajouter les nouveaux écouteurs
      yesButton.addEventListener('click', function handler() {
        modal.hide();
        resolve(true); // Résout avec true si "Yes" est cliqué
      });
      yesButton.handler = yesButton.onclick;

      noButton.addEventListener('click', function handler() {
        modal.hide();
        resolve(false); // Résout avec false si "No" est cliqué
      });
      noButton.handler = noButton.onclick;
    } else {
      console.error('Confirmation modal buttons not found');
    }

    // Afficher la modale
    modal.show();

    // Gérer la fermeture de la modale (par exemple, clic sur "Close" ou en dehors)
    modalElement.addEventListener('hidden.bs.modal', () => {
      resolve(false); // Résout avec false si la modale est fermée autrement
    }, { once: true });
  });
}

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
    .then(response => {
      console.log("Response Status:", response.status, response.statusText);
      return response.json().then(data => {
        console.log("Server Response Data:", data);
        return { ok: response.ok, status: response.status, data };
      });
    })
    .then(({ ok, status, data }) => {
      console.log("Processing response...", { ok, status, data });

      // Check for 2FA requirement
      if (data.detail === "2FA verification required. Please verify OTP.") {
        console.log("2FA required! Switching to OTP input field...");

        const otpSection = document.getElementById("otpSection");
        const otpInput = document.getElementById("otpInput");
        const loginForm = document.getElementById("loginForm");

        console.log("🔍 DOM Check - otpSection:", otpSection, "otpInput:", otpInput, "loginForm:", loginForm);

        if (!otpSection || !otpInput || !loginForm) {
          console.error("OTP section/input or login form not found in DOM!");
          showModal(
            'Error',
            'Something went wrong. Please refresh the page and try again.',
            'OK',
            () => {}
          );
          return;
        }

        loginForm.style.display = "none";
        otpSection.style.display = "block";
        otpInput.focus();

        console.log("UI switched to OTP section");
        sessionStorage.setItem("2fa_pending_user", username);
        return;
      }

      // Handle successful login
      if (ok && data.message === "Login successful") {
        console.log("Login successful!");
        localStorage.setItem("username", username);
        displayMenu();
        navigateTo("welcome");
      } else {
        // Throw error for unexpected cases
        throw new Error(data.detail || `Unexpected response (status: ${status})`);
      }
    })
    .catch(error => {
      console.error("Login failed:", error);
      showModal(
        'Error',
        `Login failed: ${error.message}`,
        'OK',
        () => {}
      );
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

// export function refreshToken() {
//   fetch("/api/auth/refresh/", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Token refresh error:" + response.status);
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (data.message === "Token refreshed successfully") {
//         console.log("Token refreshed successfully");
//       } else {
//         alert("Token refresh error. Please retry.");
//       }
//     })
//     .catch((error) => {
//       console.error("Error during token refresh.", error);
//     });
// }

export async function refreshToken() {
  try {
    console.log("Attempting to refresh token...");
    let response = await fetch("/api/auth/refresh/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Refresh response status:", response.status);
    let data = await response.json();
    console.log("🔄 Refresh response:", data);

    if (response.ok && data.access) {
      // Stocker le nouveau token
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh); // Mettre à jour le refresh token si renvoyé
      console.log("✅ Access token refreshed successfully");
      return true;
    }

    console.warn("❌ Failed to refresh access token. Response:", data);
    return false;

  } catch (error) {
    console.error("⚠️ Error refreshing token:", error.message, error.stack);
    return false;
  }
}

export function toggle2FA() {
  fetch("/api/auth/toggle-2fa/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(data => {
      console.log("Toggle 2FA response:", data);
      
      if (data.otp_required) {
        document.getElementById("otpSection").style.display = "block"; // Show OTP field
      } else {
        update2FAStatus();
      }
    })
    .catch(error => console.error("Error toggling 2FA:", error));
}


export function verifyOTP() {
  const otpCode = document.getElementById("otpInput").value.trim();
  if (!otpCode) {
    showModal(
      'Warning',
      'Please enter the OTP code.',
      'OK',
      () => {}
    );
    return;
  }

  // This second call includes the OTP code in the body
  fetch("/api/auth/toggle-2fa/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp_code: otpCode }), // << pass the OTP
  })
    .then(response => response.json())
    .then(data => {
      console.log("Verify OTP (toggle2FA) response:", data);

      if (data.message === "2FA successfully enabled.") {
        showModal(
          'Success',
          '✅ 2FA enabled successfully!',
          'OK',
          () => {
            // Hide the OTP section again
            document.getElementById("otpSection").style.display = "none";
            update2FAStatus(); // Refresh UI to show new status
          }
        );
      } else if (data.error) {
        showModal(
          'Error',
          `❌ ${data.error}`,
          'OK',
          () => {}
        );
      } else {
        showModal(
          'Error',
          '❌ Unknown error verifying OTP.',
          'OK',
          () => {}
        );
      }
    })
    .catch(error => {
      console.error("Error verifying OTP for 2FA:", error);
      showModal(
        'Error',
        'Error verifying OTP: ' + error.message,
        'OK',
        () => {}
      );
    });
}


export function verify2FALogin() {
  const otp_code = document.getElementById("otpInput").value;
  const username = sessionStorage.getItem("2fa_pending_user");
  console.log("Verifying OTP for username:", username, "OTP entered:", otp_code);

  if (!otp_code) {
    showModal(
      'Warning',
      'Please enter the OTP code.',
      'OK',
      () => {}
    );
    return;
  }

  fetch("/api/auth/verify-2fa-login/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, otp_code }),
  })
    .then(response => response.json())
    .then(data => {
      console.log("🔹 Verify 2FA Login response:", data);
      if (data.success) {
        showModal(
          'Success',
          '✅ 2FA verified! Redirecting...',
          'OK',
          () => {
            // Set the username in localStorage so the welcome page can use it
            localStorage.setItem("username", username);
            // Also, clear the temporary session storage value
            sessionStorage.removeItem("2fa_pending_user");
            displayMenu();
            navigateTo("welcome");
          }
        );
      } else {
        showModal(
          'Error',
          '❌ Invalid OTP. Try again.',
          'OK',
          () => {}
        );
      }
    })
    .catch(error => console.error("❌ Error verifying OTP during login:", error));
}


export function update2FAStatus() {
  fetch("/api/auth/user/", {  // Fetch user details including 2FA status
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(user => {
      console.log("2FA Status Response:", user);

      const statusElement = document.getElementById("2fa_status");
      const toggleButton = document.getElementById("toggle2FAButton");

      if (!statusElement || !toggleButton) { 
        console.error("❌ 2FA elements not found in the DOM.");
        return;
      }

      if (user.is_2fa_enabled) {
        statusElement.innerText = "2FA is Enabled ✅";
        toggleButton.innerText = "Disable 2FA";
        toggleButton.classList.remove("btn-success");
        toggleButton.classList.add("btn-danger");
      } else {
        statusElement.innerText = "2FA is Disabled ❌";
        toggleButton.innerText = "Enable 2FA";
        toggleButton.classList.remove("btn-danger");
        toggleButton.classList.add("btn-success");
      }
    })
    .catch(error => {
      console.error("❌ Error fetching 2FA status:", error);
    });
}

export async function logout() {
  const confirmed = await showModalConfirmation("Are you sure you want to log out?");
  if (!confirmed) return;
  try {
    const response = await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Logout request failed.");
    }
    console.log("✅ Logout successful!");
    showModal(
      'Success',
      'Logout successful!',
      'OK',
      () => {
        localStorage.clear(); // Clear all user data
        window.location.href = "/"; // Redirect to login page
      }
    );
  } catch (error) {
    console.error("Logout failed:", error);
    showModal(
      'Error',
      'An error occurred during logout: ' + error.message,
      'OK',
      () => {}
    );
  }
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
        showModal(
          'Success',
          'Account created successfully. You can now log in.',
          'OK',
          () => {
            displayConnectionFormular();
          }
        );
      } else {
        showModal(
          'Error',
          'Error creating account. Please try again.',
          'OK',
          () => {}
        );
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
      showModal(
        'Error',
        errorMessage,
        'OK',
        () => {}
      );
    });
}

export async function deleteAccount() {
  const confirmed = await showModalConfirmation("Are you sure you want to delete your account? This action is irreversible.");
  if (!confirmed) return;

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
      showModal(
        'Success',
        'Account successfully deleted!',
        'OK',
        () => {
          localStorage.clear(); // Clear all user data from localStorage

          // Force page redirection and prevent lingering JavaScript
          window.location.href = "/"; // Redirect to the login page

          //displayConnectionFormular(); // Redirect back to the login page
        }
      );
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        // Prevent errors due to reload interruption
        console.error("Error deleting account:", error);
        showModal(
          'Error',
          'An error occurred:' + error.message,
          'OK',
          () => {}
        );
      }
    });
}

export async function anonymizeAccount() {
  const confirmed = await showModalConfirmation("Are you sure you want to anonymize your account? This action is irreversible.");
  if (!confirmed) return;

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
      showModal(
        'Success',
        data.message || "Your account has been anonymized successfully.",
        'OK',
        () => {
          localStorage.clear();
          window.location.href = "/";
        }
      );
    })
    .catch((error) => {
      console.error("Error anonymizing account:", error);
      showModal(
        'Error',
        'An error occurred: ' + error.message,
        'OK',
        () => {}
      );
    });
}

export function uploadAvatar() {
  const input = document.getElementById("avatarInput");
  const file = input.files[0];

  if (!file) {
    showModal(
      'Warning',
      'Please select a file.',
      'OK',
      () => {}
    );
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
      showModal(
        'Success',
        'Profile picture updated successfully!',
        'OK',
        () => {
          const profilePic = document.getElementById("profilePic");

          if (profilePic && data.avatar_url) {
            profilePic.src = data.avatar_url + "?t=" + new Date().getTime(); // Prevents caching issues
          }
        }
      );
    })
    .catch(error => {
      console.error("Error uploading profile picture:", error);
      showModal(
        'Error',
        'Error: ' + error.message,
        'OK',
        () => {navigateTo('settings')}
      );
    });
}

export function updateProfile() {
  const username = document.getElementById("usernameInput").value;
  const emailInput = document.getElementById("emailInput");
  const emailValue = emailInput.value.trim();
  const phoneNumber = document.getElementById("phoneInput").value;

  // Regular Expression to validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let hasError = false; // Flag to track errors

  if (!emailRegex.test(emailValue)) {
    emailInput.classList.add("is-invalid"); // Bootstrap will show a validation error
    emailInput.classList.remove("is-valid");
    showModal(
      'Error',
      'Invalid email format. Please enter a valid email (e.g., user@example.com).',
      'OK',
      () => {}
    );
    return; // Stop execution if email is invalid
  } else {
    emailInput.classList.remove("is-invalid");
    emailInput.classList.add("is-valid");
  }

  // Stop execution if there is an error
  if (hasError) {
    showModal(
      'Error',
      'Please enter a valid email before saving changes.',
      'OK',
      () => {}
    );
    return;
  }

  fetch("/api/auth/user/", {
    method: "PUT",
    credentials: "include", // Send authentication cookies
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      email: emailValue,
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
      showModal(
        'Success',
        'Profile updated successfully!',
        'OK',
        () => {
        navigateTo('settings');
        }
      );
    })
    .catch(error => {
      console.error("Error updating profile:", error);
      showModal(
        'Error',
        'An error occurred: ' + error.message,
        'OK',
        () => {}
      );
    });
  navigateTo('settings');
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





