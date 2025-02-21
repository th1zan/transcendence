// TODO: error message when user is already in friend list (now Friend request sent to 123 even if 123 is already a friend )
// prevent sending friend request to the user himself
export function sendFriendRequest(friendUsername) {
	const loggedInUsername = localStorage.getItem("username");

	if (friendUsername === loggedInUsername) {
		alert("You cannot send a friend request to yourself.");
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
			alert(`You are already friends with ${friendUsername}.`);
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
			alert("Error: " + data.error);
			} else {
			alert(`Friend request sent to ${friendUsername}.`);
			// alert(data.message);
			}
		})
		.catch((error) => {
			console.error("Error sending friend request:", error);
			alert("An error occurred.");
		});
	})
	.catch((error) => {
		console.error("Error fetching friend list:", error);
		alert("An error occurred while checking friend status.");
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
		  alert("Error: " + data.error);
		} else {
		  alert(data.message);
		  fetchFriendRequests(); // Refresh the friend request list
          fetchFriends(); // refresh the friend list
		}
	  })
	  .catch((error) => {
		console.error("Error responding to friend request:", error);
		alert("An error occurred.");
	  });
}

export function removeFriend(friendUsername) {
	if (!confirm(`Do you really want to remove ${friendUsername} from your friends list?`)) {
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
		  alert("Error: " + data.error);
		} else {
		  alert(data.message);
		  fetchFriends(); // Refresh friend list
		}
	  })
	  .catch((error) => {
		console.error("Error removing friend:", error);
		alert("An error occurred.");
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
    alert("🔔 Friend Request: " + data.message);
    fetchFriendRequests(); // Refresh friend requests dynamically
  } else {
    alert("🔔 Notification: " + data.message);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
