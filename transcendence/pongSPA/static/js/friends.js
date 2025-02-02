
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
		  listItem.textContent = friend.username;
		  listItem.className = "list-group-item";
		  friendList.appendChild(listItem);
		});
	  })
	  .catch((error) => {
		console.error("Erreur lors de la récupération des amis :", error);
	  });
  }