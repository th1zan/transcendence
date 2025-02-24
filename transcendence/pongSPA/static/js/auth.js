import { displayWelcomePage, navigateTo } from "./app.js";
import { displayMenu } from "./menu.js";
import { displayConnectionFormular } from "./login.js";

// export function getToken(username, password) {
//   const csrftoken = getCookie("csrftoken");

//   fetch("/api/auth/login/", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//       "X-CSRFToken": csrftoken,
//     },
//     body: JSON.stringify({ username, password }),
//   })
//     .then(response => {
//       return response.json().then(data => {
//         console.log("Server Response:", data); 

//         if (!response.ok) {
//           throw new Error(data.detail || `HTTP error: ${response.status}`);
//         }
//         return data;
//       });
//     })
//     .then(data => {
//       console.log("Checking response for 2FA requirement...");

//       // Detect if 2FA is required
//       if (data.detail && data.detail.includes("2FA verification required")) {
//         console.log("🔐 2FA required! Switching to OTP input field...");
        
//         // Show OTP input and hide login form
//         document.getElementById("otpSection").style.display = "block";
//         document.getElementById("loginSection").style.display = "none";
//         document.getElementById("otpInput").focus();

//         // Store the username for OTP verification later
//         localStorage.setItem("2fa_pending_user", username);
//         return; // Stop further execution
//       }
      
//       // If login was successful (without 2FA)
//       if (data.message === "Login successful") {
//         console.log("Login successful");
//         localStorage.setItem("username", username); // Stocker le nom d'utilisateur
//         displayMenu();
//         displayWelcomePage()
//         navigateTo('welcome');
//       } else {
//         alert("Connection error. Please retry.");
//       }
//     })
//     .catch((error) => {
//       console.error("Error during connection.", error);
//     });
// }

// export function getToken(username, password) {
//   const csrftoken = getCookie("csrftoken");

//   fetch("/api/auth/login/", {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//       "X-CSRFToken": csrftoken,
//     },
//     body: JSON.stringify({ username, password }),
//   })
//     .then(response => response.json().then(data => {
//       console.log("🔹 Server Response:", data);

//       if (!response.ok) {
//         throw new Error(data.detail || `HTTP error: ${response.status}`);
//       }
//       return data;
//     }))
//     .then(data => {
//       console.log("🔹 Checking response for 2FA requirement...");

//       if (data.detail === "2FA verification required. Please verify OTP.") {
//         console.log("🔐 2FA required! Switching to OTP input field...");

//         // ✅ Check if OTP section exists
//         const otpSection = document.getElementById("otpSection");
//         const otpInput = document.getElementById("otpInput");
//         const loginForm = document.getElementById("loginForm");

//         if (!otpSection || !otpInput) {
//           console.error("🚨 OTP section/input not found in DOM!");
//           return;
//         }

//         // ✅ Hide login form, show OTP input
//         if (loginForm) loginForm.style.display = "none";
//         otpSection.style.display = "block";
//         otpInput.focus();

//         // ✅ Store username temporarily for OTP verification
//         sessionStorage.setItem("2fa_pending_user", username);
//         return; // 🚨 STOP further execution!
//       }

//       if (data.message === "Login successful") {
//         console.log("✅ Login successful!");
//         displayMenu();
//         navigateTo("welcome");
//       } else {
//         alert("⚠️ Connection error. Please retry.");
//       }
//     })
//     .catch(error => {
//       console.error("❌ Login failed:", error);
//       alert(`❌ Login failed: ${error.message}`);
//     });
// }

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
      console.log("🔹 Response Status:", response.status, response.statusText);
      return response.json().then(data => {
        console.log("🔹 Server Response Data:", data);
        return { ok: response.ok, status: response.status, data };
      });
    })
    .then(({ ok, status, data }) => {
      console.log("🔹 Processing response...", { ok, status, data });

      // Check for 2FA requirement
      if (data.detail === "2FA verification required. Please verify OTP." || status === 401 || status === 403) {
        console.log("🔐 2FA required! Switching to OTP input field...");

        const otpSection = document.getElementById("otpSection");
        const otpInput = document.getElementById("otpInput");
        const loginForm = document.getElementById("loginForm");

        console.log("🔍 DOM Check - otpSection:", otpSection, "otpInput:", otpInput, "loginForm:", loginForm);

        if (!otpSection || !otpInput || !loginForm) {
          console.error("🚨 OTP section/input or login form not found in DOM!");
          alert("Something went wrong. Please refresh the page and try again.");
          return;
        }

        loginForm.style.display = "none";
        otpSection.style.display = "block";
        otpInput.focus();

        console.log("✅ UI switched to OTP section");
        sessionStorage.setItem("2fa_pending_user", username);
        return;
      }

      // Handle successful login
      if (ok && data.message === "Login successful") {
        console.log("✅ Login successful!");
        localStorage.setItem("username", username);
        displayMenu();
        navigateTo("welcome");
      } else {
        // Throw error for unexpected cases
        throw new Error(data.detail || `Unexpected response (status: ${status})`);
      }
    })
    .catch(error => {
      console.error("❌ Login failed:", error);
      alert(`❌ Login failed: ${error.message}`);
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
    let response = await fetch("/api/auth/refresh/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    let data = await response.json();
    console.log("🔄 Refresh response:", data);

    if (response.ok && data.access) {
      console.log("✅ Access token refreshed successfully");
      return true;
    }

    console.warn("❌ Failed to refresh access token");
    return false;

  } catch (error) {
    console.error("⚠️ Error refreshing token:", error);
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
        update2FAStatus(); // Refresh status
      }
    })
    .catch(error => console.error("Error toggling 2FA:", error));
}


export function verifyOTP() {
  const otpCode = document.getElementById("otpInput").value.trim();
  if (!otpCode) {
    alert("Please enter the OTP code.");
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
        alert("✅ 2FA enabled successfully!");
        // Hide the OTP section again
        document.getElementById("otpSection").style.display = "none";
        update2FAStatus(); // Refresh UI to show new status
      } else if (data.error) {
        alert(`❌ ${data.error}`);
      } else {
        alert("❌ Unknown error verifying OTP.");
      }
    })
    .catch(error => {
      console.error("Error verifying OTP for 2FA:", error);
      alert("Error verifying OTP: " + error.message);
    });
}


export function verify2FALogin() {
  const otp_code = document.getElementById("otpInput").value;
  const username = sessionStorage.getItem("2fa_pending_user");
  console.log("Verifying OTP for username:", username, "OTP entered:", otp_code);

  if (!otp_code) {
    alert("Please enter the OTP code.");
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
        alert("✅ 2FA verified! Redirecting...");
        // Set the username in localStorage so the welcome page can use it
        localStorage.setItem("username", username);
        // Also, clear the temporary session storage value
        sessionStorage.removeItem("2fa_pending_user");
        displayMenu();
        navigateTo("welcome");
      } else {
        alert("❌ Invalid OTP. Try again.");
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

  const confirmLogout = confirm("Are you sure you want to log out?");
  if (!confirmLogout) return;
  try {
    const response = await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
  })
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Logout request failed.");
      }
      console.log("✅ Logout successful!");
      localStorage.clear(); // Clear all user data
      alert("Logout successful!");
      window.location.href = "/"; // Redirect to login page
  } catch (error) {
      console.error("Logout failed:", error);
      alert("An error occurred during logout: " + error.message);
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
  const emailInput = document.getElementById("emailInput");
  const emailValue = emailInput.value.trim();
  const phoneNumber = document.getElementById("phoneInput").value;

  // Regular Expression to validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let hasError = false; // Flag to track errors

  if (!emailRegex.test(emailValue)) {
    emailInput.classList.add("is-invalid"); // Bootstrap will show a validation error
    emailInput.classList.remove("is-valid");
    alert("Invalid email format. Please enter a valid email (e.g., user@example.com).");
    return; // Stop execution if email is invalid
  } else {
    emailInput.classList.remove("is-invalid");
    emailInput.classList.add("is-valid");
  }

  // Stop execution if there is an error
  if (hasError) {
    alert("Please enter a valid email before saving changes.");
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

