import {showModal } from './app.js';
import {showModalConfirmation } from './auth.js';

// TODO: error message when user is already in friend list (now Friend request sent to 123 even if 123 is already a friend )
// prevent sending friend request to the user himself

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
                () => {}
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
                    () => {}
                );
            } else {
                showModal(
                    'Success',
                    `Friend request sent to ${friendUsername}.`,
                    'OK',
                    () => {}
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
            console.error("Error sending friend request:", error);
            showModal(
                'Error',
                'An error occurred.',
                'OK',
                () => {}
            );
        });
    })
    .catch((error) => {
        console.error("Error fetching friend list:", error);
        showModal(
            'Error',
            'An error occurred while checking friend status.',
            'OK',
            () => {}
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
            () => {}
          );
        } else {
          showModal(
            'Success',
            data.message,
            'OK',
            () => {
              fetchFriendRequests(); // Refresh the friend request list
              fetchFriends(); // refresh the friend list
            }
          );
        }
      })
      .catch((error) => {
        console.error("Error responding to friend request:", error);
        showModal(
            'Error',
            'An error occurred.',
            'OK',
            () => {}
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
              () => {}
            );
          } else {
            showModal(
              'Success',
              data.message,
              'OK',
              () => {
                fetchFriends(); // Refresh friend list
              }
            );
          }
        })
        .catch((error) => {
          console.error("Error removing friend:", error);
          showModal(
            'Error',
            'An error occurred.',
            'OK',
            () => {}
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
		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
			<span>${request.sender}</span>
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
	  .catch(error => console.error("Error fetching friend requests:", error));
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

		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
			<span>${friend.username} ${statusBadge}</span>
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
	  .catch((error) => console.error("Error fetching friend statuses:", error));
    })
	.catch((error) => console.error("Error fetching friends:", error));
}

const ws = new WebSocket("wss://127.0.0.1:8000/ws/notifications/");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.notification_type === "friend_request") {
    showModal(
      'Notification',
      "🔔 Friend Request: " + data.message,
      'OK',
      () => {
        fetchFriendRequests(); // Refresh friend requests dynamically
      }
    );
  } else {
    showModal(
      'Notification',
      "🔔 Notification: " + data.message,
      'OK',
      () => {}
    );
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
