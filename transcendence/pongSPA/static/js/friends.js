import {showModal, navigateTo, logger } from './app.js';
import {showModalConfirmation } from './auth.js';

// TODO: error message when user is already in friend list (now Friend request sent to 123 even if 123 is already a friend )
// prevent sending friend request to the user himself


export function displayFriends() {
  // Vide tous les conteneurs
  document.getElementById('app_top').innerHTML = '';
  document.getElementById('app_main').innerHTML = '';
  document.getElementById('app_bottom').innerHTML = '';

  const appTop = document.getElementById("app_main");
  appTop.innerHTML = `
    <div class="container mt-4">
      <div class="row g-4">
        <!-- Colonne 1 : Carte pour envoyer une demande d'ami -->
        <div class="col-12 col-md-4">
          <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
            <div class="card-body text-center">
              <h5 class="card-title mb-3" >Send Friend Request</h5>
              <div class="form-group mt-2">
                <label for="friendUsername" class="form-label" >Username</label>
                <input type="text" id="friendUsername" placeholder="Username" class="form-control bg-transparent" required >
                <button id="sendFriendRequestButton" class="btn btn-outline-success mt-2 w-100 shadow-sm" >
                  Send Friend Request
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Colonne 2 : 3 cartes pour les demandes et amis -->
        <div class="col-12 col-md-6">
          <div class="row g-4">
            <!-- Carte pour les demandes d'amis en attente -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" >Pending Friend Requests</h4>
                  <ul id="friendRequests" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte pour la liste des amis -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" >My Friends</h4>
                  <ul id="friendList" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte vide pour équilibrer la mise en page (facultatif, peut être retirée si le contenu est dynamique) -->
            <div class="col-12 d-md-none d-lg-block" style="height: 0;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("sendFriendRequestButton").addEventListener("click", () => {
    const friendUsername = document.getElementById("friendUsername").value.trim();
    if (friendUsername) {
      sendFriendRequest(friendUsername);
    } else {
      // Remplacer une éventuelle alert par oneButtonModal
      showModal(
        'Warning',
        'Please enter a username.',
        'OK', // Texte du bouton
        () => {} // Action vide, juste fermer la modale
      );
    }
  });

  fetchFriendRequests();
  fetchFriends();
}


export function sendFriendRequest(friendUsername) {
    const loggedInUsername = localStorage.getItem("username");

    if (friendUsername === loggedInUsername) {
        showModal(
            'Warning',
            'You cannot send a friend request to yourself.',
            'OK',
            () => {}
        );
        return;
    }
    
    // Fetch the current friends list before sending the request
    fetch("/api/friends/list/", {
        method: "GET",
        credentials: "include",
    })
    .then((response) => response.json())
    .then((friendsData) => {
        // Check if the user is already in the friend list
        const isAlreadyFriend = friendsData.friends.some(friend => friend.username === friendUsername);
        if (isAlreadyFriend) {
            showModal(
                'Warning',
                `You are already friends with ${friendUsername}.`,
                'OK',
                () => {
                  navigateTo('friends');
                }
            );
            return;
        }

        // If checks pass, send the friend request
        fetch("/api/friends/send-request/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: friendUsername }),
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                showModal(
                    'Error',
                    'Error: ' + data.error,
                    'OK',
                    () => {
                      navigateTo('friends');
                    }
                );
            } else {
                showModal(
                    'Success',
                    `Friend request sent to ${friendUsername}.`,
                    'OK',
                    () => {
                      navigateTo('friends');
                    }
                );
                // showModal(
                // 	'Success',
                // 	data.message,
                // 	'OK',
                // 	() => {}
                // );
            }
        })
        .catch((error) => {
            logger.error("Error sending friend request:", error);
            showModal(
                'Error',
                'An error occurred.',
                'OK',
                () => {
                  navigateTo('friends');
                }
            );
        });
    })
    .catch((error) => {
        logger.error("Error fetching friend list:", error);
        showModal(
            'Error',
            'An error occurred while checking friend status.',
            'OK',
            () => {
              navigateTo('friends');
            }
        );
    });
}


export function respondToFriendRequest(friendUsername, action) {
    fetch("/api/friends/respond/", {  
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username: friendUsername, action: action }), // 'accept' or 'decline'
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          showModal(
            'Error',
            'Error: ' + data.error,
            'OK',
            () => {
              navigateTo('friends');
            }
          );
        } else {
          showModal(
            'Success',
            data.message,
            'OK',
            () => {
              fetchFriendRequests();
              fetchFriends();
              navigateTo('friends');
            }
          );
        }
      })
      .catch((error) => {
        logger.error("Error responding to friend request:", error);
        showModal(
            'Error',
            'An error occurred.',
            'OK',
            () => {
              navigateTo('friends');
            }
        );
      });
}

export function removeFriend(friendUsername) {
  showModalConfirmation(`Do you really want to remove ${friendUsername} from your friends list?`)
    .then(confirmed => {
      if (!confirmed) {
        return;
      }
  
      fetch("/api/friends/remove/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: friendUsername }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            showModal(
              'Error',
              'Error: ' + data.error,
              'OK',
              () => {
                navigateTo('friends');
              }
            );
          } else {
            showModal(
              'Success',
              data.message,
              'OK',
              () => {
                fetchFriends();
                navigateTo('friends');
              }
            );
          }
        })
        .catch((error) => {
          logger.error("Error removing friend:", error);
          showModal(
            'Error',
            'An error occurred.',
            'OK',
            () => {
              navigateTo('friends');
            }
          );
        });
    });
}

export function fetchFriendRequests() {
	fetch("/api/friends/requests/", {
	  method: "GET",
	  credentials: "include",
	})
	  .then(response => response.json())
	  .then(requestsData => {
		const requestList = document.getElementById("friendRequests");
		requestList.innerHTML = "";
  
		requestsData.requests.forEach(request => {
      const avatarUrl = request.avatar;
		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
      <div class="d-flex align-items-center">
            <img src="${avatarUrl}" alt="${request.sender}'s avatar" class="friend-avatar" 
              style="width:50px; height:50px; border-radius:50%; margin-right:12px;">
            <span style="font-weight: bold; font-size: 16px;">${request.sender}</span>
          </div>
			<div>
			  <button class="btn btn-success btn-sm accept-request" data-username="${request.sender}">Accept</button>
			  <button class="btn btn-danger btn-sm decline-request" data-username="${request.sender}">Decline</button>
			</div>
		  `;
		  requestList.appendChild(listItem);
		});
  
		// Add event listeners for accept and decline buttons
		document.querySelectorAll(".accept-request").forEach(button => {
		  button.addEventListener("click", event => {
			const friendUsername = event.target.getAttribute("data-username");
			respondToFriendRequest(friendUsername, "accept");
		  });
		});
  
		document.querySelectorAll(".decline-request").forEach(button => {
		  button.addEventListener("click", event => {
			const friendUsername = event.target.getAttribute("data-username");
			respondToFriendRequest(friendUsername, "decline");
		  });
		});
	  })
	  .catch(error => logger.error("Error fetching friend requests:", error));
}

export function fetchFriends() {
	fetch("/api/friends/list/", {
	  method: "GET",
	  credentials: "include",
	})
	  .then((response) => response.json())
	  .then((friendsData) => {
		// Now fetch friend statuses
		fetch("/api/friends/status/", {
		  method: "GET",
		  credentials: "include",
		})
		  .then((statusResponse) => statusResponse.json())
		  .then((statusData) => {
			const friendList = document.getElementById("friendList");
			friendList.innerHTML = "";
  
			friendsData.friends.forEach((friend) => {
			  // Find corresponding status in statusData
			  const friendStatus = statusData.friends_status.find(
				(status) => status.username === friend.username
			  );
  
			  const isOnline = friendStatus ? friendStatus.is_online : false;
			  const lastSeen = friendStatus ? friendStatus.last_seen : "Never";
  
			  const statusBadge = isOnline
				? `<span >🟢 Online</span>`
				: `<span >🔘 Offline (last seen: ${lastSeen})</span>`;

        const avatarUrl = friend.avatar;

		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
        <div class="d-flex align-items-center">
          <img src="${avatarUrl}" alt="${friend.username}'s avatar" class="friend-avatar" 
            style="width:50px; height:50px; border-radius:50%; margin-right:12px;">
            <div class="d-flex flex-column">
			        <span style="font-weight: bold; font-size: 16px;">${friend.username}</span>
              <span style="font-size: 14px; ">${statusBadge}</span>
            </div>
        </div>
			<button class="btn btn-danger btn-sm remove-friend" data-username="${friend.username}">Remove</button>
		  `;
		  friendList.appendChild(listItem);
		});
		// event listeners to remove buttons
		document.querySelectorAll(".remove-friend").forEach((button) => {
			button.addEventListener("click", (event) => {
			  const friendUsername = event.target.getAttribute("data-username");
			  removeFriend(friendUsername);
			});
		});
	  })
	  .catch((error) => logger.error("Error fetching friend statuses:", error));
    })
	.catch((error) => logger.error("Error fetching friends:", error));
}

// const ws = new WebSocket("wss://127.0.0.1:8000/ws/notifications/");

// ws.onmessage = (event) => {
//   const data = JSON.parse(event.data);
  
//   if (data.notification_type === "friend_request") {
//     showModal(
//       'Notification',
//       "🔔 Friend Request: " + data.message,
//       'OK',
//       () => {
//         fetchFriendRequests(); // Refresh friend requests dynamically
//       }
//     );
//   } else {
//     showModal(
//       'Notification',
//       "🔔 Notification: " + data.message,
//       'OK',
//       () => {}
//     );
//   }
// };

// ws.onerror = (error) => {
//   logger.error("WebSocket error:", error);
// };
