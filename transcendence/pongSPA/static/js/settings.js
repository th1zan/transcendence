import { update2FAStatus, toggle2FA, verifyOTP, showModalConfirmation, getCookie, refreshToken} from "./auth.js";
import { navigateTo, showModal, logger } from "./app.js";
import { displayMenu } from "./menu.js";
import { showPrivacyPolicyModal } from "./privacy_policy.js";
import { sanitizeHTML, sanitizeAdvanced } from "./utils.js";

function displayHTMLforSettings(user) {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const avatarUrl = user.avatar_url || "/media/avatars/default.png";
  const isDefaultAvatar = avatarUrl.includes("default.png");

  const appTop = document.getElementById("app_top");
  appTop.innerHTML = `
  <div class="container mt-4">
    <h3 class="text-center">${i18next.t('settings.accountManagement')}</h3>
  </div>
  `;

  // Main content in app_main
  const appMain = document.getElementById("app_main");
  appMain.innerHTML = `
    <div class="container">
      <!-- Update Profile Picture -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">${i18next.t('settings.updateProfilePicture')}</h4>
        <div class="d-flex flex-column align-items-center">
          <img id="profilePic" src="${avatarUrl}" alt="${i18next.t('settings.profilePicture')}" class="rounded-circle border object-fit-cover" width="150" height="150">

          <!-- Disable delete button if the avatar is default -->
            <button id="deleteAvatarButton" class="btn btn-danger mt-2" ${isDefaultAvatar ? "disabled" : ""}>
              ${i18next.t('settings.deleteAvatar')}
            </button>

          <div class="mt-3 w-100">
          <label class="form-label">${i18next.t('settings.chooseNewProfilePicture')}:</label>
          <div class="row g-2">
            <div class="col-12 col-md-8">
              <input type="file" id="avatarInput" accept="image/*" class="form-control">
            </div>
            <div class="col-12 col-md-4">
              <button id="uploadAvatarButton" class="btn btn-primary w-100">${i18next.t('settings.upload')}</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile Information Update -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">${i18next.t('settings.editProfileInformation')}</h4>

        <div class="form-group mt-2">
          <label>${i18next.t('settings.username')}:</label>
          <input type="text" id="usernameInput" class="form-control" value="${sanitizeHTML(user.username)}">
        </div>

        <div class="form-group mt-2">
          <label>${i18next.t('settings.email')}:</label>
          <div class="input-group">
            <input type="email" id="emailInput" class="form-control" value="${sanitizeHTML(user.email || '')}">
            <button class="btn btn-outline-danger" id="clearEmailBtn" type="button">${i18next.t('settings.clear')}</button>
          </div>

        <div class="form-group mt-2">
          <label>${i18next.t('settings.phoneNumber')}:</label>
          <div class="input-group">
            <input type="text" id="phoneInput" class="form-control" value="${sanitizeHTML(user.phone_number || '')}">
            <button class="btn btn-outline-danger" id="clearPhoneBtn" type="button">${i18next.t('settings.clear')}</button>
          </div>
        </div>

        <div class="d-flex justify-content-center mt-3">
          <button id="saveProfileButton" class="btn btn-success px-4">${i18next.t('settings.saveChanges')}</button>
        </div>
      </div>


        <!-- Change Password Section -->
        <div class="card shadow-sm p-4 mt-3">
          <h4 class="text-center">${i18next.t('settings.changePassword')}</h4>
          <div class="form-group mt-2">
            <label>${i18next.t('settings.currentPassword')}:</label>
            <input type="password" id="currentPasswordInput" class="form-control">
          </div>
          <div class="form-group mt-2">
            <label>${i18next.t('settings.newPassword')}:</label>
            <input type="password" id="newPasswordInput" class="form-control">
            <div class="invalid-feedback" id="newPasswordFeedback">
              ${i18next.t('settings.passwordTooShort')}
            </div>
          </div>
          <div class="form-group mt-2">
            <label>${i18next.t('settings.confirmNewPassword')}:</label>
            <input type="password" id="confirmPasswordInput" class="form-control">
            <div class="invalid-feedback">
              ${i18next.t('settings.passwordMismatch')}
            </div>
          </div>
          <!-- This is the general guidance visible to all users -->
          <div class="mt-2 text-muted small">
            ${i18next.t('settings.passwordRequirements')}
          </div>
          <div class="d-flex justify-content-center mt-3">
            <button id="changePasswordBtn" class="btn btn-success px-4">${i18next.t('settings.changePassword')}</button>
          </div>
        </div>

      <!-- ✅ 2FA Section -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">${i18next.t('settings.twoFactorAuthentication')}</h4>
        <p class="text-center" id="2fa_status">${user.is_2fa_enabled ? i18next.t('auth.twoFAEnabledstatus') : i18next.t('auth.twoFADisabled')}</p>
        <div class="d-flex justify-content-center">
          <button id="toggle2FAButton" class="btn ${user.is_2fa_enabled ? "btn-danger" : "btn-success"} w-100 w-md-auto">
            ${user.is_2fa_enabled ? i18next.t('auth.disableTwoFA') : i18next.t('auth.enableTwoFA')}
          </button>
        </div>
        <div id="otpSection" class="text-center mt-3" style="display:none;">
          <input type="text" id="otpInput" class="form-control text-center mx-auto mb-2" style="max-width: 300px;" placeholder="${i18next.t('login.enterOTP')}">
          <button id="verifyOTPButton" class="btn btn-primary">${i18next.t('login.verifyOTP')}</button>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">${i18next.t('settings.accountActions')}</h4>
        <div class="d-flex flex-column flex-md-row justify-content-center gap-2 mt-3">
          <button id="deleteAccountButton" class="btn btn-outline-danger w-100 w-md-auto">
            ${i18next.t('settings.deleteAccount')}
          </button>
          <button id="anonymizeAccountButton" class="btn btn-outline-warning w-100 w-md-auto">
            ${i18next.t('settings.anonymizeAccount')}
          </button>
        </div>
      </div>
    `;
  // Footer in app_bottom
  document.getElementById('app_bottom').innerHTML = `
    <div class="container-fluid mt-5 pt-3 border-top text-center">
      <p class="text-muted">
        <a href="#" id="privacyPolicyLink" class="text-decoration-none">${i18next.t('settings.privacyPolicy')}</a>
      </p>
    </div>
  `;

  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
  document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
  document.getElementById("deleteAvatarButton").addEventListener("click", deleteAvatar);
  document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
  document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
  document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
  document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
  document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
  update2FAStatus();
  document.getElementById("clearEmailBtn").addEventListener("click", () => {
    document.getElementById("emailInput").value = "";
  });
  document.getElementById("clearPhoneBtn").addEventListener("click", () => {
    document.getElementById("phoneInput").value = "";
  });
  document.getElementById("privacyPolicyLink").addEventListener("click", (e) => {
    e.preventDefault();
    showPrivacyPolicyModal();
  });
}

export function displaySettings() {


  const user = localStorage.getItem("username");
  const storedAvatarUrl = localStorage.getItem("avatarUrl");

  // 1. fetch the user's settings
  fetch("/api/auth/user/", {
    method: "GET",
    credentials: "include", // Ensures authentication cookies are sent
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch user data.");
      }
      return response.json();
    })
    .then(user => {
      // Store the avatar URL in localStorage for consistent use
      if (user.avatar_url) {
        localStorage.setItem("avatarUrl", user.avatar_url);
      }
      //2. display the settings
      displayHTMLforSettings(user);
    })
    .catch(error => {
      const username = localStorage.getItem("username") || "User";

      const avatarUrl = storedAvatarUrl || "/media/avatars/default.png";
      const isDefaultAvatar = avatarUrl.includes("default.png");

      const appTop = document.getElementById("app_top");
      appTop.innerHTML = `
        <div class="container mt-4">
          <h3 class="text-center">${i18next.t('settings.accountManagement')}</h3>
        </div>
        `;

      const appMain = document.getElementById("app_main");
      appMain.innerHTML = `
        <div class="container">
          <!-- Update Profile Picture -->
          <div class="card shadow-sm p-4 mt-3">
            <h4 class="text-center">${i18next.t('settings.updateProfilePicture')}</h4>
            <div class="d-flex flex-column align-items-center">
              <img id="profilePic" src="${avatarUrl}" alt="${i18next.t('settings.profilePicture')}" class="rounded-circle border" width="150" height="150">

              <!-- Disable delete button if the avatar is default -->
              <button id="deleteAvatarButton" class="btn btn-danger mt-2" ${isDefaultAvatar ? "disabled" : ""}>
                ${i18next.t('settings.deleteAvatar')}
              </button>

              <div class="mt-3 w-100">
                <label class="form-label">${i18next.t('settings.chooseNewProfilePicture')}:</label>
                <div class="row g-2">
                  <div class="col-12 col-md-8">
                    <input type="file" id="avatarInput" accept="image/*" class="form-control">
                  </div>
                  <div class="col-12 col-md-4">
                    <button id="uploadAvatarButton" class="btn btn-primary w-100">${i18next.t('settings.upload')}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Information Update -->
          <div class="card shadow-sm p-4 mt-3">
            <h4 class="text-center">${i18next.t('settings.editProfileInformation')}</h4>

            <div class="form-group mt-2">
              <label>${i18next.t('settings.username')}:</label>
              <input type="text" id="usernameInput" class="form-control" value="${username}">
            </div>

            <div class="form-group mt-2">
              <label>${i18next.t('settings.email')}:</label>
              <div class="input-group">
                <input type="email" id="emailInput" class="form-control">
                <button class="btn btn-outline-danger" id="clearEmailBtn" type="button">${i18next.t('settings.clear')}</button>
              </div>
              <div class="invalid-feedback">
                ${i18next.t('settings.invalidEmail')}
              </div>
            </div>

            <div class="form-group mt-2">
              <label>${i18next.t('settings.phoneNumber')}:</label>
              <div class="input-group">
                <input type="text" id="phoneInput" class="form-control" value="">
                <button class="btn btn-outline-danger" id="clearPhoneBtn" type="button">${i18next.t('settings.clear')}</button>
              </div>
            </div>

            <div class="d-flex justify-content-center mt-3">
              <button id="saveProfileButton" class="btn btn-success px-4">${i18next.t('settings.saveChanges')}</button>
            </div>
          </div>

          <!-- Change Password Section -->
          <div class="card shadow-sm p-4 mt-3">
            <h4 class="text-center">${i18next.t('settings.changePassword')}</h4>
            <div class="form-group mt-2">
              <label>${i18next.t('settings.currentPassword')}:</label>
              <input type="password" id="currentPasswordInput" class="form-control">
            </div>
            <div class="form-group mt-2">
              <label>${i18next.t('settings.newPassword')}:</label>
              <input type="password" id="newPasswordInput" class="form-control">
              <div class="invalid-feedback">
                ${i18next.t('settings.passwordTooShort')}
              </div>
            </div>
            <div class="form-group mt-2">
              <label>${i18next.t('settings.confirmNewPassword')}:</label>
              <input type="password" id="confirmPasswordInput" class="form-control">
              <div class="invalid-feedback">
                ${i18next.t('settings.passwordMismatch')}
              </div>
            </div>
            <!-- This is the general guidance visible to all users -->
            <div class="mt-2 text-muted small">
              ${i18next.t('settings.passwordRequirements')}
            </div>
            <div class="d-flex justify-content-center mt-3">
              <button id="changePasswordBtn" class="btn btn-success px-4">${i18next.t('settings.changePassword')}</button>
            </div>
          </div>

          <!-- 2FA Section -->
          <div class="card shadow-sm p-4 mt-3">
            <h4 class="text-center">${i18next.t('settings.twoFactorAuthentication')}</h4>
            <p class="text-center" id="2fa_status">${i18next.t('auth.twoFADisabled')}</p>
            <div class="d-flex justify-content-center">
              <button id="toggle2FAButton" class="btn btn-success">
                ${i18next.t('auth.enableTwoFA')}
              </button>
            </div>
            <div id="otpSection" class="text-center mt-3" style="display:none;">
              <input type="text" id="otpInput" class="form-control text-center mx-auto mb-2" style="max-width: 300px;" placeholder="${i18next.t('login.enterOTP')}">
              <button id="verifyOTPButton" class="btn btn-primary">${i18next.t('login.verifyOTP')}</button>
            </div>
          </div>

          <!-- Account Actions -->
          <div class="card shadow-sm p-4 mt-3">
            <h4 class="text-center">${i18next.t('settings.accountActions')}</h4>
            <div class="d-flex flex-column flex-md-row justify-content-center gap-2 mt-3">
              <button id="deleteAccountButton" class="btn btn-danger text-white w-100 w-md-auto">
                ${i18next.t('settings.deleteAccount')}
              </button>
              <button id="anonymizeAccountButton" class="btn btn-warning text-white w-100 w-md-auto">
                ${i18next.t('settings.anonymizeAccount')}
              </button>
            </div>
          </div>
        </div>
        `;
    // Footer in app_bottom
    document.getElementById('app_bottom').innerHTML = `
      <div class="container-fluid mt-5 pt-3 border-top text-center">
        <p class="text-muted">
          <a href="#" id="privacyPolicyLink" class="text-decoration-none">${i18next.t('settings.privacyPolicy')}</a>
        </p>
      </div>
    `;

    document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
    document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
    document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
    document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
    document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
    document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
    document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
    update2FAStatus();
    document.getElementById("clearEmailBtn").addEventListener("click", () => {
      document.getElementById("emailInput").value = "";
    });
    document.getElementById("clearPhoneBtn").addEventListener("click", () => {
      document.getElementById("phoneInput").value = "";
    });
    document.getElementById("privacyPolicyLink").addEventListener("click", (e) => {
      e.preventDefault();
      showPrivacyPolicyModal();
    });
  })
  .catch(error => {
    logger.error("Error loading user data:", error);
    });

}

export async function deleteAccount() {
  const confirmed = await showModalConfirmation(i18next.t('settings.accountDeletionConfirmation'));
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
        i18next.t('settings.success'),
        i18next.t('settings.accountDeleted'),
        i18next.t('modal.ok'),
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
          i18next.t('settings.error'),
          i18next.t('settings.genericError').replace('{errorMessage}', error.message),
          i18next.t('modal.ok'),
          () => {}
        );
      }
    });
}

export async function anonymizeAccount() {
  const confirmed = await showModalConfirmation(i18next.t('settings.accountAnonymizationConfirmation'));
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
        i18next.t('settings.success'),
        data.message || i18next.t('settings.anonymizeAccountSuccess'),
        i18next.t('modal.ok'),
        () => {
          localStorage.clear();
          window.location.href = "/";
        }
      );
    })
    .catch((error) => {
      logger.error("Error anonymizing account:", error);
      showModal(
        i18next.t('settings.error'),
        i18next.t('settings.genericError').replace('{errorMessage}', error.message),
        i18next.t('modal.ok'),
        () => {}
      );
    });
}

export function uploadAvatar() {
  const input = document.getElementById("avatarInput");
  const file = input.files[0];

  if (!file) {
    showModal(
      i18next.t('auth.warning'),
      i18next.t('settings.selectFile'),
      i18next.t('modal.ok'),
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
        i18next.t('auth.success'),
        i18next.t('settings.profilePictureUpdated'),
        i18next.t('modal.ok'),
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
          //displaySettings();
        }
      );
    })
    .catch(error => {
      logger.error("Error uploading profile picture:", error);
      showModal(
        i18next.t('settings.error'),
        i18next.t('settings.avatarUploadFailed'),
        i18next.t('modal.ok'),
        () => {}
      );
    });
}

export function updateWelcomePageAvatar(avatarUrl) {
  const welcomeAvatar = document.getElementById("welcomeAvatar");
  if (welcomeAvatar && avatarUrl) { // Add check for avatarUrl
    welcomeAvatar.src = avatarUrl + "?t=" + new Date().getTime();
  } else if (welcomeAvatar) {
    // Use default avatar
    welcomeAvatar.src = "/media/avatars/default.png" + "?t=" + new Date().getTime();
  }
}


export async function deleteAvatar() {
  // First disable the button to prevent multiple clicks
  const deleteButton = document.getElementById("deleteAvatarButton");
  if (deleteButton) {
    deleteButton.disabled = true;
  }

  const confirmed = await showModalConfirmation(
    i18next.t('settings.avatarDeletionConfirmation'),
    i18next.t('settings.confirmDeletion')
  );

  // Re-enable the button if user cancels
  if (!confirmed) {
    if (deleteButton) {
      deleteButton.disabled = false;
    }
    return; // Exit the function if not confirmed
  }

  // User confirmed, proceed with deletion
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
        //deleteButton.classList.add("disabled");
      }

      // Update all UI elements
      displayMenu(data.avatar_url);
      updateWelcomePageAvatar(data.avatar_url);

      showModal(
        i18next.t('auth.success'),
        i18next.t('settings.avatarDeleted'),
        i18next.t('modal.ok'),
        () => {}
      );
      // // Wait briefly before re-rendering settings to ensure DOM stability
      // setTimeout(() => {
      //   displaySettings();
      // }, 300);
    })
    .catch((error) => {
      //console.error("Error deleting avatar:", error);
      logger.error("Error deleting avatar:", error);

      // Re-enable delete button in case of error
      if (deleteButton) {
        deleteButton.disabled = false;
      }

      // Show error once without callbacks
      showModal(
        i18next.t('settings.error'),
        i18next.t('settings.avatarDeletionFailed'),
        i18next.t('modal.ok'),
        () => {} // Empty callback to prevent recursion
      );
    });

}


export function updateProfile() {
  // Store raw values for validation
  const usernameRaw = document.getElementById("usernameInput").value.trim();
  const emailInput = document.getElementById("emailInput");
  const emailRaw = emailInput.value.trim();
  const phoneRaw = document.getElementById("phoneInput").value;

  // Validate username is not empty
  if (!usernameRaw) {
    showModal(
      i18next.t('settings.error'),
      i18next.t('settings.usernameRequired'),
      i18next.t('modal.ok'),
      () => {}
    );
    return;
  }

  // Regular Expression to validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate email if not empty
  if (emailRaw !== "" && !emailRegex.test(emailRaw)) {
    emailInput.classList.add("is-invalid"); // Bootstrap will show a validation error
    emailInput.classList.remove("is-valid");
    showModal(
      i18next.t('auth.error'),
      i18next.t('settings.invalidEmail'),
      i18next.t('modal.ok'),
      () => {}
    );
    return; // Stop execution if email is invalid
  } else {
    emailInput.classList.remove("is-invalid");
    emailInput.classList.add("is-valid");
  }

  // Sanitize inputs before sending to server
  const username = sanitizeAdvanced(usernameRaw);
  const emailValue = sanitizeAdvanced(emailRaw);
  const phoneNumber = sanitizeAdvanced(phoneRaw);

  // Disable the save button to prevent double submissions
  const saveButton = document.getElementById("saveProfileButton");
  if (saveButton) {
    saveButton.disabled = true;
  }

  fetch("/api/auth/user/", {
    method: "PUT",
    credentials: "include", // Send authentication cookies
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      username: username,
      email: emailValue || null,
      phone_number: phoneNumber || null
    }),
  })
    .then(response => {
      if (!response.ok) {
                return response.json().then(data => {
          throw new Error(data.error || data.detail || "Failed to update profile.");
        });
      }
      return response.json();
    })
    .then(data => {
        // The backend already issued new tokens
        // Update UI elements directly instead of reloading
        const profilePic = document.getElementById("profilePic");
        if (profilePic) {
          // Add cache-busting parameter if avatar was updated
          profilePic.src = profilePic.src.split('?')[0] + '?t=' + new Date().getTime();
        }
        // Update localStorage with new username
        localStorage.setItem("username", username);
        setTimeout(() => {
          showModal(
            i18next.t('auth.success'),
            i18next.t('settings.profileUpdated'),
            i18next.t('modal.ok'),
            () => {
              navigateTo("settings");
            }
          );

          // Re-enable save button
          if (saveButton) {
            saveButton.disabled = false;
          }
        }, 500);
    })
    .catch(error => {
      logger.error("Error updating profile:", error);

      // Re-enable save button
      if (saveButton) {
        saveButton.disabled = false;
      }

      // Check specific error messages from the backend
      let errorTitle = i18next.t('settings.error');
      let errorMessage = "";

      // error messages with translations
      if (error.message.includes("email is already in use")) {
        errorTitle = i18next.t('settings.emailError');
        errorMessage = i18next.t('settings.emailAlreadyInUse');
        // Highlight the problematic field
        const emailInput = document.getElementById("emailInput");
        if (emailInput) {
          emailInput.classList.add("is-invalid");
        }
      }
      else if (error.message.includes("phone number is already in use")) {
        errorTitle = i18next.t('settings.phoneError');
        errorMessage = i18next.t('settings.phoneAlreadyInUse');
        const phoneInput = document.getElementById("phoneInput");
        if (phoneInput) {
          phoneInput.classList.add("is-invalid");
        }
      }
      else if (error.message.includes("username is already taken")) {
        errorTitle = i18next.t('settings.usernameError');
        errorMessage = i18next.t('settings.usernameAlreadyTaken');
        const usernameInput = document.getElementById("usernameInput");
        if (usernameInput) {
          usernameInput.classList.add("is-invalid");
        }
      }
      else if (error.message.includes("Email address is too long")) {
        errorTitle = i18next.t('settings.validationError');
        errorMessage = i18next.t('settings.emailTooLong');
      }
      else if (error.message.includes("Phone number is too long")) {
        errorTitle = i18next.t('settings.validationError');
        errorMessage = i18next.t('settings.phoneTooLong');
      }
      else if (error.message.includes("Username is too long")) {
        errorTitle = i18next.t('settings.validationError');
        errorMessage = i18next.t('settings.usernameTooLong');
      }
      else {
        // unknown errors
        errorMessage = error.message;
      }

      showModal(
        errorTitle,
        errorMessage,
        i18next.t('modal.ok'),
        () => {}
      );
    });
}

export function changePassword() {
  const currentPassword = document.getElementById("currentPasswordInput").value;
  const newPassword = document.getElementById("newPasswordInput").value;
  const confirmPassword = document.getElementById("confirmPasswordInput").value;

  // Clear previous validation states
  document.getElementById("newPasswordInput").classList.remove("is-invalid");
  document.getElementById("confirmPasswordInput").classList.remove("is-invalid");

  // Validate inputs with the same rules as the backend serializer
  let errorMessage = "";

  // Check if new password is the same as current password
  if (newPassword === currentPassword) {
    errorMessage = i18next.t('settings.passwordSameAsCurrent');
    document.getElementById("newPasswordInput").classList.add("is-invalid");
    const feedbackElement = document.getElementById("newPasswordFeedback");
    if (feedbackElement) {
      feedbackElement.textContent = errorMessage;
    } else {
      // Fallback if element doesn't exist
      document.querySelector("#newPasswordInput + .invalid-feedback").textContent = errorMessage;
    }
    return;
  }

  // Check for minimum length
  if (newPassword.length < 8) {
    errorMessage = i18next.t('settings.passwordTooShort');
  }
  // Check for at least one digit
  else if (!/\d/.test(newPassword)) {
    errorMessage = i18next.t('settings.passwordRequiresDigit');
  }
  // Check for at least one uppercase letter
  else if (!/[A-Z]/.test(newPassword)) {
    errorMessage = i18next.t('settings.passwordRequiresUppercase');
  }
  // Check for at least one lowercase letter
  else if (!/[a-z]/.test(newPassword)) {
    errorMessage = i18next.t('settings.passwordRequiresLowercase');
  }
  // Check for at least one special character
  else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    errorMessage = i18next.t('settings.passwordRequiresSpecialChar');
  }
  // Check if passwords match
  else if (newPassword !== confirmPassword) {
    document.getElementById("confirmPasswordInput").classList.add("is-invalid");
    return;
  }

  // If there's an error message, show it
  if (errorMessage) {
    document.getElementById("newPasswordInput").classList.add("is-invalid");
    const feedbackElement = document.getElementById("newPasswordFeedback");
    if (feedbackElement) {
      feedbackElement.textContent = errorMessage;
    } else {
      // Fallback if element doesn't exist
      document.querySelector("#newPasswordInput + .invalid-feedback").textContent = errorMessage;
    }
    return;
  }

  // Disable the button to prevent double submissions
  const changeBtn = document.getElementById("changePasswordBtn");
  if (changeBtn) {
    changeBtn.disabled = true;
  }

  fetch("/api/auth/change-password/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    }),
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.current_password || data.new_password || "Failed to change password.");
        });
      }
      return response.json();
    })
    .then(data => {
      // Clear form fields
      document.getElementById("currentPasswordInput").value = "";
      document.getElementById("newPasswordInput").value = "";
      document.getElementById("confirmPasswordInput").value = "";

      // Wait for cookies to process
      setTimeout(() => {
        showModal(
          i18next.t('auth.success'),
          i18next.t('settings.passwordChangeSuccess'),
          i18next.t('modal.ok'),
          () => {
            // Navigate back to settings with fresh tokens
            navigateTo("settings");
          }
        );

        // Re-enable button
        if (changeBtn) {
          changeBtn.disabled = false;
        }
      }, 500);
    })
    .catch(error => {
      logger.error("Error changing password:", error);

      // Re-enable button
      if (changeBtn) {
        changeBtn.disabled = false;
      }

      // Check if the error message contains "Current password is incorrect"
      if (error.message.includes("Current password is incorrect") ||
          error.message.toLowerCase().includes("incorrect")) {
        showModal(
          i18next.t('auth.error'),
          i18next.t('settings.incorrectCurrentPassword'),
          i18next.t('modal.ok'),
          () => {}
        );
      } else {
        showModal(
          i18next.t('auth.error'),
          i18next.t('settings.passwordChangeFailed'),
          i18next.t('modal.ok'),
          () => {}
        );
      }
    });
}
