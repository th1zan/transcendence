import { update2FAStatus, toggle2FA, verifyOTP, showModalConfirmation} from "./auth.js";
import { navigateTo, showModal, logger } from "./app.js";
import { displayMenu } from "./menu.js";

function displayHTMLforSettings(user) {

  //empty all the containers
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const avatarUrl = user.avatar_url || "/media/avatars/default.png";
  const isDefaultAvatar = avatarUrl.includes("default.png");
  const appTop = document.getElementById("app_main");

  appTop.innerHTML = `
  <div class="container mt-4">
    <h3 class="text-center">Account Management</h3>

    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Update Profile Picture</h4>
      <div class="d-flex flex-column align-items-center">
        <img id="profilePic" src="${avatarUrl}" alt="Profile Picture" class="rounded-circle border" width="150" height="150">

        <!-- Disable delete button if the avatar is default -->
          <button id="deleteAvatarButton" class="btn btn-danger mt-2" ${isDefaultAvatar ? "disabled" : ""}>
            Delete Avatar
          </button>

        <div class="mt-3 w-75">
          <label class="form-label">Choose a new profile picture:</label>
          <div class="input-group">
            <input type="file" id="avatarInput" accept="image/*" class="form-control">
            <button id="uploadAvatarButton" class="btn btn-primary">Upload</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Profile Information Update -->
    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Edit Profile Information</h4>
      <div class="form-group mt-2">
        <label>Username:</label>
        <input type="text" id="usernameInput" class="form-control" value="${user.username}">
      </div>
      <div class="form-group mt-2">
        <label>Email:</label>
        <input type="email" id="emailInput" class="form-control" value="${user.email}">
      </div>
      <div class="form-group mt-2">
        <label>Phone Number:</label>
        <input type="text" id="phoneInput" class="form-control" value="${user.phone_number || ''}">
      </div>
      <div class="d-flex justify-content-center mt-3">
        <button id="saveProfileButton" class="btn btn-success px-4">Save Changes</button>
      </div>
    </div>

    <!-- ✅ 2FA Section -->
    <div class="card shadow-sm p-4 mt-3">
      <h4 class="text-center">Two-Factor Authentication (2FA)</h4>
      <p class="text-center" id="2fa_status">${user.is_2fa_enabled ? "2FA is Enabled ✅" : "2FA is Disabled ❌"}</p>
      <div class="d-flex justify-content-center">
        <button id="toggle2FAButton" class="btn ${user.is_2fa_enabled ? "btn-danger" : "btn-success"}">
          ${user.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      </div>
      <div id="otpSection" class="text-center mt-3" style="display:none;">
        <input type="text" id="otpInput" class="form-control text-center w-50 mx-auto" placeholder="Enter OTP">
        <button id="verifyOTPButton" class="btn btn-primary mt-2">Verify OTP</button>
      </div>
    </div>

    <!-- Account Actions -->
    <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-link nav-link text-danger">Delete account</button>
      <button id="anonymizeAccountButton" class="btn btn-link nav-link text-success">Anonimize account</button>
    </div>
  `;

  document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
  document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
  document.getElementById("deleteAvatarButton").addEventListener("click", deleteAvatar);
  document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
  //document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
  document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
  document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
  document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
  update2FAStatus();
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
      
      const appDiv = document.getElementById("app_main");
      appDiv.innerHTML = `
    <div class="container mt-4">
      <h3 class="text-center">Account Management</h3>

      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Update Profile Picture</h4>
        <div class="d-flex flex-column align-items-center">
          <img id="profilePic" src="${avatarUrl}" alt="Profile Picture" class="rounded-circle border" width="150" height="150">

          <!-- Disable delete button if the avatar is default -->
          <button id="deleteAvatarButton" class="btn btn-danger mt-2" ${isDefaultAvatar ? "disabled" : ""}>
            Delete Avatar
          </button>

          <div class="mt-3 w-75">
            <label class="form-label">Choose a new profile picture:</label>
            <div class="input-group">
              <input type="file" id="avatarInput" accept="image/*" class="form-control">
              <button id="uploadAvatarButton" class="btn btn-primary">Upload</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile Information Update -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Edit Profile Information</h4>
        <div class="form-group mt-2">
          <label>Username:</label>
          <input type="text" id="usernameInput" class="form-control" value="${username}">
        </div>
        <div class="form-group mt-2">
          <label>Email:</label>
          <input type="email" id="emailInput" class="form-control" required>
          <div class="invalid-feedback">
            Please enter a valid email address with "@" and a domain (e.g., user@example.com).
          </div>
        </div>
        <div class="form-group mt-2">
          <label>Phone Number:</label>
          <input type="text" id="phoneInput" class="form-control" value="${user.phone_number || ''}">
        </div>
        <div class="d-flex justify-content-center mt-3">
          <button id="saveProfileButton" class="btn btn-success px-4">Save Changes</button>
        </div>
      </div>

      <!-- ✅ 2FA Section -->
      <div class="card shadow-sm p-4 mt-3">
        <h4 class="text-center">Two-Factor Authentication (2FA)</h4>
        <p class="text-center" id="2fa_status">${user.is_2fa_enabled ? "2FA is Enabled ✅" : "2FA is Disabled ❌"}</p>
        <div class="d-flex justify-content-center">
          <button id="toggle2FAButton" class="btn ${user.is_2fa_enabled ? "btn-danger" : "btn-success"}">
            ${user.is_2fa_enabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
        <div id="otpSection" class="text-center mt-3" style="display:none;">
          <input type="text" id="otpInput" class="form-control text-center w-50 mx-auto" placeholder="Enter OTP">
          <button id="verifyOTPButton" class="btn btn-primary mt-2">Verify OTP</button>
        </div>
      </div>

      <!-- Account Actions -->
      <div class="d-flex justify-content-center mt-4">
      <button id="deleteAccountButton" class="btn btn-danger px-4" style="margin-right: 38px;">Delete Account</button>
      <button id="anonymizeAccountButton" class="btn btn-warning">Anonymize Account</button>
       </div>
    `;

    document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
    document.getElementById("anonymizeAccountButton").addEventListener("click", anonymizeAccount);
    document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
    document.getElementById("saveProfileButton").addEventListener("click", updateProfile);
    //document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
    document.getElementById("uploadAvatarButton").addEventListener("click", uploadAvatar);
    document.getElementById("toggle2FAButton").addEventListener("click", toggle2FA);
    document.getElementById("verifyOTPButton").addEventListener("click", verifyOTP);
    update2FAStatus();
  })
  .catch(error => {
    logger.error("Error loading user data:", error);
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

export async function deleteAvatar() {
  // First disable the button to prevent multiple clicks
  const deleteButton = document.getElementById("deleteAvatarButton");
  if (deleteButton) {
    deleteButton.disabled = true;
  }
  
  const confirmed = await showModalConfirmation(
    "Are you sure you want to delete your avatar? This action cannot be undone.",
    "Confirm Deletion"
  );
  
  // Re-enable the button if user cancels
  if (!confirmed) {
    if (deleteButton) {
      deleteButton.disabled = false;
    }
    return; // Exit the function if not confirmed
  }
  
  // User confirmed, proceed with deletion,
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
      
      // // Force recreate the file input with event listeners
      // const fileContainer = document.getElementById("avatarInputContainer"); // Use a container with this ID
      // if (fileContainer) {
      //   // Remove old input completely
      //   fileContainer.innerHTML = '';
        
      //   // Create new input with all needed attributes
      //   const newInput = document.createElement("input");
      //   newInput.type = "file";
      //   newInput.id = "avatarInput";
      //   newInput.accept = "image/*";
      //   newInput.className = "form-control";
        
      //   // Add it back to DOM
      //   fileContainer.appendChild(newInput);
        
      //   // Reattach any necessary event listeners
      //   newInput.addEventListener("change", function() {
      //     // Enable upload button when file selected
      //     const uploadBtn = document.getElementById("uploadAvatarButton");
      //     if (uploadBtn) {
      //       uploadBtn.disabled = false;
      //     }
      //   });
      // }
      
      // Update all UI elements
      displayMenu(data.avatar_url);
      updateWelcomePageAvatar(data.avatar_url);
      
      // // Optional: Provide feedback without modal
      // console.log("Avatar deleted successfully");
      
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
  
    // // Enable the button if user cancels
    // () => {
    //   if (deleteButton) {
    //     deleteButton.disabled = false;
    //   }
    // }
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
