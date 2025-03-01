import { navigateTo, showModal, logger } from "./app.js";
import { displayMenu } from "./menu.js";
import { displayConnectionFormular } from "./login.js";
import { displaySettings } from "./settings.js";

export function showModalConfirmation(message, title = "Confirmation") {
  return new Promise((resolve) => {
    const modalElement = document.getElementById('confirmationModal');
    if (!modalElement) {
      logger.error('Confirmation modal not found in DOM');
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
      logger.error('Confirmation modal title element not found');
    }

    // Mise à jour du message
    const bodyElement = document.getElementById('confirmationModalBody');
    if (bodyElement) {
      bodyElement.textContent = message;
    } else {
      logger.error('Confirmation modal body element not found');
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
      logger.error('Confirmation modal buttons not found');
    }

    // Afficher la modale
    modal.show();

    // Gérer la fermeture de la modale (par exemple, clic sur "Close" ou en dehors)
    modalElement.addEventListener('hidden.bs.modal', () => {
      resolve(false); // Résout avec false si la modale est fermée autrement
    }, { once: true });
  });
}


export async function refreshToken() {
  try {
    logger.log("Attempting to refresh token...");
    logger.log('Cookies before refresh (HTTP-only, checking via API):', 'Simulating cookie inclusion with credentials: include');
    let response = await fetch("/api/auth/refresh/", {
      method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
      },
    });

    logger.log("Refresh response status:", response.status);
    logger.log("Refresh response headers:", response.headers); // Pour vérifier les cookies mis à jour
    let data = await response.json();
    logger.log("🔄 Refresh response:", data);

    if (response.ok && (data.message === "Token refreshed successfully" || data.access)) {
      logger.log("✅ Access token refreshed successfully (stored in cookies by server)");
      if (data.refresh) {
        logger.log("New refresh token detected in response, but not stored (handled by cookies):", data.refresh);
      }
      return true;
    } else if (response.status === 401 || response.status === 403) {
      const errorData = await response.json();
      logger.warn("Refresh token invalid or expired:", errorData);
      if (errorData.detail && errorData.detail.includes('blacklisted')) {
        logger.warn('Token blacklisted detected:', errorData);
      }
      localStorage.removeItem('username');
      return false;
    }

    logger.warn("❌ Failed to refresh access token. Response:", data);
    return false;

  } catch (error) {
    logger.error("⚠️ Error refreshing token:", error.message, error.stack);
    localStorage.removeItem('username');
    return false;
  }
}

// Fonction helper pour vérifier l'expiration (exemple pour JWT)

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
//         logger.log("Token refreshed successfully");
//       } else {
//         alert("Token refresh error. Please retry.");
//       }
//     })
//     .catch((error) => {
//       logger.error("Error during token refresh.", error);
//     });
// }


export function toggle2FA() {
  fetch("/api/auth/toggle-2fa/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(data => {
      logger.log("Toggle 2FA response:", data);
      
      if (data.otp_required) {
        document.getElementById("otpSection").style.display = "block"; // Show OTP field
      } else {
        update2FAStatus();
      }
    })
    .catch(error => logger.error("Error toggling 2FA:", error));
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
      logger.log("Verify OTP (toggle2FA) response:", data);

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
      logger.error("Error verifying OTP for 2FA:", error);
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
  logger.log("Verifying OTP for username:", username, "OTP entered:", otp_code);

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
      logger.log("🔹 Verify 2FA Login response:", data);
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
    .catch(error => logger.error("❌ Error verifying OTP during login:", error));
}


export function update2FAStatus() {
  fetch("/api/auth/user/", {  // Fetch user details including 2FA status
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(user => {
      logger.log("2FA Status Response:", user);

      const statusElement = document.getElementById("2fa_status");
      const toggleButton = document.getElementById("toggle2FAButton");

      if (!statusElement || !toggleButton) { 
        logger.error("❌ 2FA elements not found in the DOM.");
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
      logger.error("❌ Error fetching 2FA status:", error);
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
    logger.log("✅ Logout successful!");
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
    logger.error("Logout failed:", error);
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
      logger.error("Error creating account:", error);
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
        logger.error("Error deleting account:", error);
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
      logger.error("Error anonymizing account:", error);
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
          localStorage.setItem("avatarUrl", data.avatar_url);
          const profilePic = document.getElementById("profilePic");

          if (profilePic && data.avatar_url) {
            profilePic.src = data.avatar_url + "?t=" + new Date().getTime(); // Prevents caching issues
          }
          // Enable the delete button (if it was disabled)
          const deleteButton = document.getElementById("deleteAvatarButton");
          if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.classList.remove("disabled");
          }

          // Update the menu avatar
          displayMenu(data.avatar_url);
          updateWelcomePageAvatar(data.avatar_url);
          // Re-render the settings page to ensure everything is in sync
          displaySettings();
        }
      );
    })
    .catch(error => {
      logger.error("Error uploading profile picture:", error);
      showModal(
        'Error',
        'Error: ' + error.message,
        'OK',
        () => {}
      );
    });
}

export function updateWelcomePageAvatar(avatarUrl) {
  const welcomeAvatar = document.getElementById("welcomeAvatar");
  if (welcomeAvatar) {
    welcomeAvatar.src = avatarUrl + "?t=" + new Date().getTime();
  }
}

// export function updateMenuAvatar(avatarUrl) {
//   const menuAvatar = document.getElementById("menuAvatar");
//   if (menuAvatar) {
//     menuAvatar.src = avatarUrl + "?t=" + new Date().getTime();
//   }
// }

export function deleteAvatar() {
  // First disable the button to prevent multiple clicks
  const deleteButton = document.getElementById("deleteAvatarButton");
  if (deleteButton) {
    deleteButton.disabled = true;
  }
  
  showModal(
    "Confirm Deletion",
    "Are you sure you want to delete your avatar? This action cannot be undone.",
    "Delete",
    () => {
      fetch("/api/auth/delete-avatar/", {
        method: "DELETE",
        credentials: "include",
      })
        .then((response) => response.json())
        .then((data) => {
          // Update localStorage
          localStorage.setItem("avatarUrl", data.avatar_url);
          
          // Update UI without showing another modal
          const profilePic = document.getElementById("profilePic");
          if (profilePic && data.avatar_url) {
            profilePic.src = data.avatar_url + "?t=" + new Date().getTime();
          }
          
          // Keep the delete button disabled
          if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.classList.add("disabled");
          }
          
          // Force recreate the file input with event listeners
          const fileContainer = document.getElementById("avatarInputContainer"); // Use a container with this ID
          if (fileContainer) {
            // Remove old input completely
            fileContainer.innerHTML = '';
            
            // Create new input with all needed attributes
            const newInput = document.createElement("input");
            newInput.type = "file";
            newInput.id = "avatarInput";
            newInput.accept = "image/*";
            newInput.className = "form-control";
            
            // Add it back to DOM
            fileContainer.appendChild(newInput);
            
            // Reattach any necessary event listeners
            newInput.addEventListener("change", function() {
              // Enable upload button when file selected
              const uploadBtn = document.getElementById("uploadAvatarButton");
              if (uploadBtn) {
                uploadBtn.disabled = false;
              }
            });
          }
          
          // Update all UI elements
          displayMenu(data.avatar_url);
          updateWelcomePageAvatar(data.avatar_url);
          
          // Optional: Provide feedback without modal
          console.log("Avatar deleted successfully");
          
          // Wait briefly before re-rendering settings to ensure DOM stability
          setTimeout(() => {
            displaySettings();
          }, 300);
        })
        .catch((error) => {
          console.error("Error deleting avatar:", error);
          
          // Re-enable delete button in case of error
          if (deleteButton) {
            deleteButton.disabled = false;
          }
          
          // Show error once without callbacks
          showModal(
            "Error",
            `An error occurred: ${error.message}`,
            "OK",
            () => {} // Empty callback to prevent recursion
          );
        });
    },
    // Enable the button if user cancels
    () => {
      if (deleteButton) {
        deleteButton.disabled = false;
      }
    }
  );
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
      logger.error("Error updating profile:", error);
      showModal(
        'Error',
        'An error occurred: ' + error.message,
        'OK',
        () => {}
      );
    });
  navigateTo('settings');
}


// export function validateToken() {
//   // Vérifie si le username est dans le localStorage
//   const username = localStorage.getItem('username');
//   if (!username) {
//     logger.log('No username found in localStorage, token validation skipped.');
//     return Promise.resolve(false); // Retourne une promesse résolue avec false si le username n'est pas trouvé
//   }
//
//   // Si le username est présent, on demande au serveur de vérifier le token
//   return fetch("/api/auth/validate/", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//     }
//   })
//   .then(response => {
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     return response.json();
//   })
//   .then(data => {
//     if (data.valid) {
//       logger.log('Token is valid');
//       return true;
//     } else {
//       logger.log('Token validation failed');
//       return false;
//     }
//   })
//   .catch(error => {
//     logger.error('Error validating token:', error);
//     return false;
//   });
// }
//
//
//



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
      logger.log("Response Status:", response.status, response.statusText);
      return response.json().then(data => {
        logger.log("Server Response Data:", data);
        return { ok: response.ok, status: response.status, data };
      });
    })
    .then(({ ok, status, data }) => {
      logger.log("Processing response...", { ok, status, data });

      // Check for 2FA requirement
      if (data.detail === "2FA verification required. Please verify OTP.") {
        logger.log("2FA required! Switching to OTP input field...");
        const otpSection = document.getElementById("otpSection");
        const otpInput = document.getElementById("otpInput");
        const loginForm = document.getElementById("loginForm");

        logger.log("🔍 DOM Check - otpSection:", otpSection, "otpInput:", otpInput, "loginForm:", loginForm);

        if (!otpSection || !otpInput || !loginForm) {
          logger.error("OTP section/input or login form not found in DOM!");
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

        logger.log("UI switched to OTP section");
        sessionStorage.setItem("2fa_pending_user", username);
        return;
      }

      // Handle successful login
      if (ok && data.message === "Login successful") {
        logger.log("Login successful!");
        localStorage.setItem("username", username); // Stocke uniquement le username
        displayMenu();
        navigateTo("welcome");
      } else {
        throw new Error(data.detail || `Unexpected response (status: ${status})`);
      }
    })
    .catch(error => {
      logger.error("Login failed:", error);
      showModal(
        'Error',
        `Login failed: ${error.message}`,
        'OK',
        () => {}
      );
    });
}

export async function validateToken() {
  const username = localStorage.getItem('username');

  if (!username) {
    logger.log('No username found in localStorage, token validation skipped.');
    return Promise.resolve(false);
  }

  logger.log('Cookies at validation (HTTP-only, not directly accessible):', 'Cookies are HTTP-only, checking via API...');

  try {
    const response = await fetch("/api/auth/validate/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      }
    });

    logger.log('Validate response status:', response.status);
    if (!response.ok) {
      logger.warn(`HTTP error validating token! Status: ${response.status}`);
      const errorData = await response.json();
      logger.log('Error details:', errorData);

      if (response.status === 401 || response.status === 403) {
        logger.log('Token invalid or expired, attempting refresh...');
        const refreshed = await refreshToken();
        if (!refreshed) {
          logger.warn('Failed to refresh token after validation failure, clearing tokens.');
          localStorage.removeItem('username');
          return false;
        }
        return true;
      }
      throw new Error(`Validation failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (data.valid) {
      logger.log('Token is valid');
      return true;
    } else {
      logger.log('Token validation failed, data:', data);
      const refreshed = await refreshToken();
      if (!refreshed) {
        logger.warn('Failed to refresh token after validation failure, clearing tokens.');
        localStorage.removeItem('username');
        return false;
      }
      return true;
    }
  } catch (error) {
    logger.error('Error validating token:', error.message, error.stack);
    const refreshed = await refreshToken();
    if (!refreshed) {
      logger.warn('Failed to refresh token after catch, clearing tokens.');
      localStorage.removeItem('username');
      return false;
    }
    return true;
  }
}

