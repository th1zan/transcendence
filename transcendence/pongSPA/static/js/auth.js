import { navigateTo, showModal, logger } from "./app.js";
import { displayMenu } from "./menu.js";
import { displayConnectionFormular } from "./login.js";
import { sanitizeHTML } from "./utils.js";

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

    // Mise à jour du titre with sanitization
    const titleElement = document.getElementById('confirmationModalLabel');
    if (titleElement) {
      titleElement.textContent = sanitizeHTML(title);
    } else {
      logger.error('Confirmation modal title element not found');
    }

    // Mise à jour du message with sanitization
    const bodyElement = document.getElementById('confirmationModalBody');
    if (bodyElement) {
      bodyElement.textContent = sanitizeHTML(message);
    } else {
      logger.error('Confirmation modal body element not found');
    }

    // Gestion des boutons
    const yesButton = document.getElementById('confirmationModalYes');
    const noButton = document.getElementById('confirmationModalNo');

    if (yesButton && noButton) {
      // Translate button labels
      yesButton.textContent = i18next.t('modal.yes');
      noButton.textContent = i18next.t('modal.no');

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

let isRefreshing = false; // Évite les appels concurrents

export async function refreshToken() {
    if (isRefreshing) {
        logger.log("Refresh already in progress, waiting...");
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!isRefreshing) {
                    clearInterval(interval);
                    resolve(refreshToken());
                }
            }, 100);
        });
    }

    isRefreshing = true;
    try {
        logger.log("Attempting to refresh token...");
        logger.log("Cookies before refresh (HTTP-only, checking via API): Simulating cookie inclusion with credentials: include");

        const response = await fetch("https://localhost:8443/api/auth/refresh/", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });

        logger.log("Refresh response status:", response.status);
        logger.log("Refresh response headers:", response.headers);

        const data = await response.json();
        logger.log("🔄 Refresh response:", data);

        if (response.ok && (data.message === "Token refreshed successfully" || data.access)) {
            logger.log("✅ Access token refreshed successfully (stored in cookies by server)");
            if (data.refresh) {
                logger.log("New refresh token detected in response, handled by cookies:", data.refresh);
            }
            return true;
        } else if (response.status === 401 || response.status === 403) {
            logger.warn("Refresh token invalid or expired:", data);
            if (data.detail && data.detail.includes("blacklisted")) {
                logger.warn("Token blacklisted detected:", data);
                throw new Error("Refresh failed due to blacklisted token");
            }
            throw new Error("Refresh failed due to invalid token");
        } else {
            logger.warn("❌ Failed to refresh access token. Response:", data);
            throw new Error("Refresh failed");
        }
    } catch (error) {
        logger.error("⚠️ Error refreshing token:", error.message, error.stack);
        localStorage.removeItem("username");
        throw error;
    } finally {
        isRefreshing = false; // Libère le verrou
    }
}

// Ajuste l'intervalle pour qu'il soit plus espacé
setInterval(async () => {
    try {
        await refreshToken();
    } catch (error) {
        logger.warn("Interval refresh failed, consider re-authenticating.");
    }
}, 4.5 * 60 * 1000); // Rafraîchir toutes les 4,5 minutes (juste avant l'expiration de 5 minutes)

// export async function refreshToken() {
//   try {
//     logger.log("Attempting to refresh token...");
//     logger.log('Cookies before refresh (HTTP-only, checking via API):', 'Simulating cookie inclusion with credentials: include');
//     let response = await fetch("/api/auth/refresh/", {
//       method: "POST",
//       credentials: "include",
//       headers: { 
//         "Content-Type": "application/json",
//       },
//     });
//
//     logger.log("Refresh response status:", response.status);
//     logger.log("Refresh response headers:", response.headers); // Pour vérifier les cookies mis à jour
//     let data = await response.json();
//     logger.log("🔄 Refresh response:", data);
//
//     if (response.ok && (data.message === "Token refreshed successfully" || data.access)) {
//       logger.log("✅ Access token refreshed successfully (stored in cookies by server)");
//       if (data.refresh) {
//         logger.log("New refresh token detected in response, but not stored (handled by cookies):", data.refresh);
//       }
//       return true;
//     } else if (response.status === 401 || response.status === 403) {
//       const errorData = await response.json();
//       logger.warn("Refresh token invalid or expired:", errorData);
//       if (errorData.detail && errorData.detail.includes('blacklisted')) {
//         logger.warn('Token blacklisted detected:', errorData);
//       }
//       localStorage.removeItem('username');
//       return false;
//     }
//
//     logger.warn("❌ Failed to refresh access token. Response:", data);
//     return false;
//
//   } catch (error) {
//     logger.error("⚠️ Error refreshing token:", error.message, error.stack);
//     localStorage.removeItem('username');
//     return false;
//   }
// }

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


export function toggle2FA() {
  fetch("/api/auth/toggle-2fa/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(data => {
      logger.log("Toggle 2FA response:", data);
      
      if (data.need_email) {
        showModal(
          i18next.t('auth.error'), 
          i18next.t('auth.emailRequiredFor2FA'),
          i18next.t('modal.ok'),
          () => {
            // Redirect to profile settings
            navigateTo("settings");
          }
        );
      } else if (data.otp_required) {
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
      i18next.t('auth.warning'),
      i18next.t('auth.enterOTPCode'),
      i18next.t('modal.ok'),
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
          i18next.t('auth.success'),
          i18next.t('auth.twoFAEnabled'),
          i18next.t('modal.ok'),
          () => {
            // Hide the OTP section again
            document.getElementById("otpSection").style.display = "none";
            update2FAStatus(); // Refresh UI to show new status
          }
        );
      } else if (data.error) {
        showModal(
          i18next.t('auth.error'),
          `❌ ${sanitizeHTML(data.error)}`, // Sanitize server error
          i18next.t('modal.ok'),
          () => {}
        );
      } else {
        showModal(
          i18next.t('auth.error'),
          i18next.t('auth.unknownOTPError'),
          i18next.t('modal.ok'),
          () => {}
        );
      }
    })
    .catch(error => {
      logger.error("Error verifying OTP for 2FA:", error);
      showModal(
        i18next.t('auth.error'),
        i18next.t('auth.verifyingOTPError') + sanitizeHTML(error.message), // Sanitize error message
        i18next.t('modal.ok'),
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
      i18next.t('auth.warning'),
      i18next.t('auth.enterOTPCode'),
      i18next.t('modal.ok'),
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
          i18next.t('auth.success'),
          i18next.t('auth.twoFAVerified'),
          i18next.t('modal.ok'),
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
          i18next.t('auth.error'),
          i18next.t('auth.invalidOTP'),
          i18next.t('modal.ok'),
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
        statusElement.textContent = i18next.t('auth.twoFAEnabledstatus'); // textContent instead of innerText
        toggleButton.textContent = i18next.t('auth.disableTwoFA');
        toggleButton.classList.remove("btn-success");
        toggleButton.classList.add("btn-danger");
      } else {
        statusElement.textContent = i18next.t('auth.twoFADisabled');
        toggleButton.textContent = i18next.t('auth.enableTwoFA');
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
            throw new Error(errorData.error || i18next.t('auth.logoutRequestFailed'));
        }
        logger.log("✅ Logout successful!");
        showModal(
            i18next.t('auth.success'),
            i18next.t('auth.logoutSuccessful'),
            i18next.t('modal.ok'),
            () => {
                localStorage.clear();
                window.location.href = "/";
            }
        );
    } catch (error) {
        logger.error("Logout failed:", error);
        showModal(
            i18next.t('auth.error'),
            i18next.t('auth.logoutError') + sanitizeHTML(error.message),
            i18next.t('modal.ok'),
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
          i18next.t('auth.success'),
          i18next.t('auth.accountCreated'),
          i18next.t('modal.ok'),
          () => {
            displayConnectionFormular();
          }
        );
      } else {
        showModal(
          i18next.t('auth.error'),
          i18next.t('auth.accountCreationError'),
          i18next.t('modal.ok'),
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
          errorMessage += `${field}: ${sanitizeHTML(error[field].join(", "))}\n`; // Sanitize array values
        } else {
          errorMessage += `${field}: ${sanitizeHTML(String(error[field]))}\n`; // Sanitize and ensure string
        }
      }
      showModal(
        i18next.t('auth.error'),
        errorMessage,
        i18next.t('modal.ok'),
        () => {}
      );
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
            i18next.t('auth.error'),
            i18next.t('auth.refreshAndRetry'),
            i18next.t('modal.ok'),
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
        i18next.t('auth.error'),
        i18next.t('auth.loginFailed') + sanitizeHTML(error.message),
        i18next.t('modal.ok'),
        () => {}
      );
    });
}

export async function validateToken() {
  const username = localStorage.getItem("username");

  if (!username) {
    logger.log("No username found in localStorage, token validation skipped.");
    return Promise.resolve(false);
  }

  logger.log("Cookies at validation (HTTP-only, not directly accessible): Cookies are HTTP-only, checking via API...");

  try {
    const response = await fetch("/api/auth/validate/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    logger.log("Validate response status:", response.status);
    if (!response.ok) {
      logger.warn(`HTTP error validating token! Status: ${response.status}`);
      const errorData = await response.json();
      logger.log("Error details:", errorData);

      if (response.status === 401 || response.status === 403) {
        logger.log("Token invalid or expired, attempting refresh...");
        const refreshed = await refreshToken();
        if (refreshed) {
          return true; // Réessaye la validation si le refresh réussit
        } else {
          logger.warn("Failed to refresh token after validation failure, clearing tokens.");
          localStorage.removeItem("username");
          return false;
        }
      }
      throw new Error(`Validation failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (data.valid) {
      logger.log("Token is valid");
      return true;
    } else {
      logger.log("Token validation failed, data:", data);
      const refreshed = await refreshToken();
      if (refreshed) {
        return true; // Réessaye la validation
      } else {
        logger.warn("Failed to refresh token after validation failure, clearing tokens.");
        localStorage.removeItem("username");
        return false;
      }
    }
  } catch (error) {
    logger.error("Error validating token:", error.message, error.stack);
    const refreshed = await refreshToken();
    if (refreshed) {
      return true; // Réessaye après refresh
    } else {
      logger.warn("Failed to refresh token after catch, clearing tokens.");
      localStorage.removeItem("username");
      return false;
    }
  }
}

// export async function validateToken() {
//   const username = localStorage.getItem('username');
//
//   if (!username) {
//     logger.log('No username found in localStorage, token validation skipped.');
//     return Promise.resolve(false);
//   }
//
//   logger.log('Cookies at validation (HTTP-only, not directly accessible):', 'Cookies are HTTP-only, checking via API...');
//
//   try {
//     const response = await fetch("/api/auth/validate/", {
//       method: "POST",
//       credentials: "include",
//       headers: {
//         "Content-Type": "application/json",
//       }
//     });
//
//     logger.log('Validate response status:', response.status);
//     if (!response.ok) {
//       logger.warn(`HTTP error validating token! Status: ${response.status}`);
//       const errorData = await response.json();
//       logger.log('Error details:', errorData);
//
//       if (response.status === 401 || response.status === 403) {
//         logger.log('Token invalid or expired, attempting refresh...');
//         const refreshed = await refreshToken();
//         if (!refreshed) {
//           logger.warn('Failed to refresh token after validation failure, clearing tokens.');
//           localStorage.removeItem('username');
//           return false;
//         }
//         return true;
//       }
//       throw new Error(`Validation failed with status: ${response.status}`);
//     }
//
//     const data = await response.json();
//     if (data.valid) {
//       logger.log('Token is valid');
//       return true;
//     } else {
//       logger.log('Token validation failed, data:', data);
//       const refreshed = await refreshToken();
//       if (!refreshed) {
//         logger.warn('Failed to refresh token after validation failure, clearing tokens.');
//         localStorage.removeItem('username');
//         return false;
//       }
//       return true;
//     }
//   } catch (error) {
//     logger.error('Error validating token:', error.message, error.stack);
//     const refreshed = await refreshToken();
//     if (!refreshed) {
//       logger.warn('Failed to refresh token after catch, clearing tokens.');
//       localStorage.removeItem('username');
//       return false;
//     }
//     return true;
//   }
// }

