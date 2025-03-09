import {showModal, navigateTo, logger } from './app.js';
import {showModalConfirmation } from './auth.js';
import { sanitizeAdvanced, sanitizeHTML } from './utils.js';

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
        <div class="col-12 col-md-5">
          <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
            <div class="card-body text-center">
              <h5 class="card-title mb-3" >${i18next.t('friends.sendFriendRequest')}</h5>
              <div class="form-group mt-2">
                <input type="text" id="friendUsername" placeholder="${i18next.t('friends.enterFriendUsername')}" class="form-control bg-transparent" required >
                <button id="sendFriendRequestButton" class="btn btn-outline-success mt-2 w-100 shadow-sm" >
                  ${i18next.t('friends.sendRequest')}
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
                  <h4 class="card-title mb-3" >${i18next.t('friends.pendingRequests')}</h4>
                  <ul id="friendRequests" class="list-group list-group-flush"></ul>
                </div>
              </div>
            </div>
            <!-- Carte pour la liste des amis -->
            <div class="col-12">
              <div class="card shadow-sm bg-transparent" style="border-radius: 8px;">
                <div class="card-body text-center">
                  <h4 class="card-title mb-3" >${i18next.t('friends.myFriends')}</h4>
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
    const friendUsernameRaw = document.getElementById("friendUsername").value.trim();
    if (friendUsernameRaw) {
      sendFriendRequest(friendUsernameRaw);
    } else {
      // Remplacer une éventuelle alert par oneButtonModal
      showModal(
        i18next.t('friends.warning'),
        i18next.t('friends.enterUsername'),
        'OK', // Texte du bouton
        () => {} // Action vide, juste fermer la modale
      );
    }
  });

  fetchFriendRequests();
  fetchFriends();
}


export function sendFriendRequest(friendUsernameRaw) {
    const loggedInUsername = localStorage.getItem("username");
    
    // Sanitize input
    const friendUsername = sanitizeAdvanced(friendUsernameRaw);

    if (friendUsername === loggedInUsername) {
        showModal(
            i18next.t('friends.warning'),
            i18next.t('friends.cannotAddSelf'),
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
                i18next.t('friends.warning'),
                i18next.t('friends.alreadyFriend', { username: friendUsername }),
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
                    i18next.t('friends.error'),
                    i18next.t('friends.errorPrefix') + data.error,
                    'OK',
                    () => {
                      navigateTo('friends');
                    }
                );
            } else {
                showModal(
                    i18next.t('friends.success'),
                    i18next.t('friends.requestSent', { username: friendUsername }),
                    'OK',
                    () => {
                      navigateTo('friends');
                    }
                );
            }
        })
        .catch((error) => {
            logger.error("Error sending friend request:", error);
            showModal(
                i18next.t('friends.error'),
                i18next.t('friends.errorOccurred'),
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
            i18next.t('friends.error'),
            i18next.t('friends.errorCheckingStatus'),
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
            i18next.t('friends.error'),
            i18next.t('friends.errorPrefix') + data.error,
            'OK',
            () => {
              navigateTo('friends');
            }
          );
        } else {
          showModal(
            i18next.t('friends.success'),
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
            i18next.t('friends.error'),
            i18next.t('friends.errorOccurred'),
            'OK',
            () => {
              navigateTo('friends');
            }
        );
      });
}

export function removeFriend(friendUsername) {
  showModalConfirmation(i18next.t('friends.confirmRemove', { username: friendUsername }))
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
              i18next.t('friends.error'),
              i18next.t('friends.errorPrefix') + data.error,
              'OK',
              () => {
                navigateTo('friends');
              }
            );
          } else {
            showModal(
              i18next.t('friends.success'),
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
            i18next.t('friends.error'),
            i18next.t('friends.errorOccurred'),
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
            <img src="${avatarUrl}" alt="${i18next.t('friends.avatarAlt', { username: request.sender })}" class="friend-avatar"
              style="width:50px; height:50px; border-radius:50%; margin-right:12px;">
            <span style="font-weight: bold; font-size: 16px;">${request.sender}</span>
          </div>
			<div>
			  <button class="btn btn-success btn-sm accept-request" data-username="${request.sender}">${i18next.t('friends.accept')}</button>
			  <button class="btn btn-danger btn-sm decline-request" data-username="${request.sender}">${i18next.t('friends.decline')}</button>
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
			  const lastSeen = friendStatus ? friendStatus.last_seen : i18next.t('friends.never');

			  const statusBadge = isOnline
				? `<span >🟢 ${i18next.t('friends.online')}</span>`
				: `<span >🔘 ${i18next.t('friends.offline', { lastSeen: lastSeen })}</span>`;

        const avatarUrl = friend.avatar;

		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
        <div class="d-flex align-items-center">
          <img src="${avatarUrl}" alt="${i18next.t('friends.avatarAlt', { username: friend.username })}" class="friend-avatar"
            style="width:50px; height:50px; border-radius:50%; margin-right:12px;">
            <div class="d-flex flex-column">
			        <span style="font-weight: bold; font-size: 16px;">${friend.username}</span>
              <span style="font-size: 14px; ">${statusBadge}</span>
            </div>
        </div>
			<button class="btn btn-danger btn-sm remove-friend" data-username="${friend.username}">${i18next.t('friends.remove')}</button>
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
