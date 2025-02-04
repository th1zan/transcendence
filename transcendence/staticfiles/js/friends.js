
export function addFriend(friendUsername) {
	fetch("/api/friends/add/", {
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
		  alert("Erreur : " + data.error);
		} else {
		  alert(data.message);
		  fetchFriends(); // Refresh the friend list
		}
	  })
	  .catch((error) => {
		console.error("Erreur lors de l'ajout d'ami :", error);
		alert("Une erreur est survenue.");
	  });
  }

export function removeFriend(friendUsername) {
	if (!confirm(`Voulez-vous vraiment supprimer ${friendUsername} de votre liste d'amis ?`)) {
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
		  alert("Erreur : " + data.error);
		} else {
		  alert(data.message);
		  fetchFriends(); // Refresh friend list
		}
	  })
	  .catch((error) => {
		console.error("Erreur lors de la suppression d'ami :", error);
		alert("Une erreur est survenue.");
	  });
  }

export function fetchFriends() {
	fetch("/api/friends/list/", {
	  method: "GET",
	  credentials: "include",
	})
	  .then((response) => response.json())
	  .then((data) => {
		const friendList = document.getElementById("friendList");
		friendList.innerHTML = "";
		data.friends.forEach((friend) => {
		  const listItem = document.createElement("li");
		  listItem.className = "list-group-item d-flex justify-content-between align-items-center";
		  listItem.innerHTML = `
			<span>${friend.username}</span>
			<button class="btn btn-danger btn-sm remove-friend" data-username="${friend.username}">❌ Supprimer</button>
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
	  .catch((error) => {
		console.error("Erreur lors de la récupération des amis :", error);
	  });
  }