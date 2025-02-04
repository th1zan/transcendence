import logging
import os
import uuid  # Pour générer un pseudonyme aléatoire
from itertools import combinations

from asgiref.sync import async_to_sync #for notifications over WebSockets
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password

# from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.db.utils import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import CustomUser, FriendRequest, Notification, Player, PongMatch, PongSet, Tournament, TournamentPlayer
from .serializers import (
    PongMatchSerializer,
    PongSetSerializer,
    TournamentPlayerSerializer,
    TournamentSerializer,
    UserRegisterSerializer,
)

CustomUser = get_user_model()  # Utilisé quand nécessaire

# Le reste de votre code...logger = logging.getLogger(__name__)


class PongMatchList(generics.ListCreateAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    filter_backends = [DjangoFilterBackend]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_param = self.request.query_params.get("user1")

        if user_param:
            # Récupérer l'ID du joueur à partir du nom d'utilisateur
            player_id = (
                Player.objects.filter(player=user_param)
                .values_list("id", flat=True)
                .first()
            )

            if player_id:
                # Filtrer les matchs où le joueur est soit player1 soit player2
                queryset = queryset.filter(Q(player1=player_id) | Q(player2=player_id))

        return queryset


class PongMatchDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    permission_classes = [IsAuthenticated]


class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        match_data = request.data
        sets_data = match_data.pop("sets", [])

        # Récupérer l'utilisateur connecté pour user1
        user1 = request.user
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name,
            defaults={"user": user1 if user1.username == player1_name else None},
        )

        # Gérer player2 comme un joueur invité ou connecté
        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(
            player=player2_name,
            defaults={
                "user": (
                    CustomUser.objects.filter(username=player2_name).first()
                    if player2_name != player1_name
                    and CustomUser.objects.filter(username=player2_name).exists()
                    else None
                )
            },
        )

        # Remplacer les noms par des identifiants dans match_data
        match_data["user1"] = user1.id if user1.username == player1_name else None
        match_data["user2"] = (
            CustomUser.objects.filter(username=player2_name).first().id
            if player2_name != player1_name
            and CustomUser.objects.filter(username=player2_name).exists()
            else None  # Si l'utilisateur n'existe pas, user2 sera None
        )
        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            for set_data in sets_data:
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Définir le gagnant
            if match_data.get("winner"):
                try:
                    winner_player = Player.objects.get(player=match_data["winner"])
                    match.winner = winner_player
                    match.save()
                except Player.DoesNotExist:
                    return Response(
                        {"error": "Player not found."}, status=status.HTTP_404_NOT_FOUND
                    )

            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        try:
            match = PongMatch.objects.get(pk=pk)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

        match_data = request.data
        sets_data = match_data.pop("sets", [])

        # Récupérer l'utilisateur connecté pour user1
        user1 = request.user

        # Vérifier si player1 existe, sinon le créer
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name,
            defaults={"user": user1 if user1.username == player1_name else None},
        )

        # Gérer player2 comme un joueur invité ou connecté
        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        # Remplacer les noms par des identifiants dans match_data
        match_data["user1"] = user1.id if user1.username == player1_name else None
        match_data["user2"] = (
            CustomUser.objects.filter(username=player2_name).first().id
            if player2_name != player1_name
            and CustomUser.objects.filter(username=player2_name).exists()
            else None
        )
        match_data["player1"] = player1.id
        match_data["player2"] = player2.id  # Mettre à jour les champs du match

        match_serializer = PongMatchSerializer(match, data=match_data, partial=True)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Mettre à jour les sets associés
            for set_data in sets_data:
                set_id = set_data.get("id")
                if set_id:
                    try:
                        pong_set = PongSet.objects.get(pk=set_id, match=match)
                        set_serializer = PongSetSerializer(
                            pong_set, data=set_data, partial=True
                        )
                    except PongSet.DoesNotExist:
                        return Response(
                            {"error": "Set not found."},
                            status=status.HTTP_404_NOT_FOUND,
                        )
                else:
                    # Créer un nouveau set si l'ID n'est pas fourni
                    set_data["match"] = match.id
                    set_serializer = PongSetSerializer(data=set_data)

                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Définir le gagnant pour la mise à jour
            if match_data.get("winner"):
                try:
                    winner_player = Player.objects.get(player=match_data["winner"])
                    match.winner = winner_player
                    match.save()
                except Player.DoesNotExist:
                    return Response(
                        {"error": "Player not found."}, status=status.HTTP_404_NOT_FOUND
                    )

            return Response(match_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            user = CustomUser.objects.get(username=request.data.get("username"))
            user.is_online = True  # Set user as online
            user.update_last_seen()
            user.save()
            response = JsonResponse({"message": "Login successful"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
        return response


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.data["refresh"] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            response = JsonResponse({"message": "Token refreshed successfully"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
        return response


logger = logging.getLogger(__name__)


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def post(self, request):
        logger.info("Received data: %s", request.data)
        serializer = self.serializer_class(data=request.data)
        logger.info("Serializer validation result: %s", serializer.is_valid())

        if serializer.is_valid():
            username = serializer.validated_data.get("username")
            email = serializer.validated_data.get(
                "email", None
            )  # Email might not be provided

            # Vérifier si le username existe déjà
            if CustomUser.objects.filter(username=username).exists():
                logger.error("Username already exists: %s", username)
                return Response(
                    {"error": "Username already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info("Creating user with data: %s", serializer.validated_data)
            try:
                user = CustomUser.objects.create_user(
                    username=username,
                    #email=email,  # Pass None if email is not provided
                    password=serializer.validated_data.get("password"),
                )
                logger.info("User created: %s", user.username)

                # Création du joueur
                player = Player.objects.create(
                    user=user,
                    player=username,
                )
                logger.info("Player created for user: %s", user.username)

                return Response(
                    {"success": "User and player created successfully."},
                    status=status.HTTP_201_CREATED,
                )
            except IntegrityError as e:
                # This would catch unique constraint errors
                logger.error("Integrity error creating user or player: %s", str(e))
                return Response(
                    {
                        "error": "Could not create user or player. Email might be already in use."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                logger.error("Error creating user or player: %s", str(e))
                return Response(
                    {"error": "Could not create user or player."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            logger.error("Validation errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Update user's online status and last seen timestamp
            user = request.user
            user.is_online = False  # Set user as offline
            user.update_last_seen()
            user.save()

            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                # Ensure the token is saved as an OutstandingToken
                outstanding_token = OutstandingToken.objects.get(token=token)
                if not BlacklistedToken.objects.filter(
                    token=outstanding_token
                ).exists():
                    BlacklistedToken.objects.create(token=outstanding_token)
            response = JsonResponse({"detail": "Logout successful."})
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnonymizeAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def post(self, request):
        user = request.user
        if user.is_authenticated:
            # Generate a random pseudonym for the deleted user
            anonymous_name = f"Anonymized_User_{uuid.uuid4().hex[:12]}"

            # Update winner field if this user was a winner
            # PongMatch.objects.filter(winner=user.username).update(winner=anonymous_name)

            # Update the Player profile: change the player's display name to the new anonymous name
            # We keep the user association so foreign keys in PongMatch remain valid
            Player.objects.filter(user=user).update(player=anonymous_name)

            # Remove all personal data from User, but keep the account ID (FK in PongMatch)
            user.username = anonymous_name

            # Clear optional attributes if they exist
            if hasattr(user, "email"):
                user.email = ""
            if hasattr(user, "first_name"):
                user.first_name = ""
            if hasattr(user, "last_name"):
                user.last_name = ""
            if hasattr(user, "phone_number"):
                user.phone_number = ""
            if hasattr(user, "profile_picture"):
                user.profile_picture = None
            if hasattr(user, "friend_list"):
                user.friend_list.clear()
            if hasattr(user, "is_online"):
                user.is_online = False
            if hasattr(user, "last_seen"):
                user.last_seen = None
            user.is_active = False  # Deactivate the account
            user.date_joined = None
            user.set_unusable_password()
            user.save()

            return Response(
                {"message": f"Your account has been anonymized as {anonymous_name}."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def delete(self, request):
        user = request.user
        deleted_name = f"Deleted_User"

        # Update matches where the user is user1 or user2, but do not remove the opponent
        # Remove the user association from PongMatch records.
        # This clears the user field while preserving the player foreign keys (and thus match scores).
        PongMatch.objects.filter(user1=user).update(user1=None)
        PongMatch.objects.filter(user2=user).update(user2=None)

        # Retrieve the associated Player profile, if any.
        player = Player.objects.filter(user=user).first()
        if player:
            # Instead of deleting the player's record,
            # update the player's name to "Deleted_User" and dissociate it from the user.
            player.player = "Deleted_User"
            player.user = None
            player.save()

        # Delete the user completely
        user.delete()

        return Response(
            {"message": "Your account has been permanently deleted."},
            status=status.HTTP_200_OK,
        )


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "avatar_url": (
                    user.avatar.url if user.avatar else "/media/avatars/default.png"
                ),
            }
        )

    def put(self, request):
        """Updates the current user's details."""
        user = request.user
        data = request.data

        # Update fields
        if "username" in data:
            user.username = data["username"]
        if "email" in data:
            user.email = data["email"]
        if "phone_number" in data:
            user.phone_number = data["phone_number"]

        user.save()

        return Response(
            {"message": "Profile updated successfully!"}, status=status.HTTP_200_OK
        )


class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        user = request.user

        # Check if a file was uploaded
        if "avatar" not in request.FILES:
            return Response(
                {"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST
            )

        file_obj = request.FILES["avatar"]

        # Extract file extension and validate type
        file_extension = os.path.splitext(file_obj.name)[-1].lower()
        allowed_extensions = {".jpg", ".jpeg", ".png"}

        if file_extension not in allowed_extensions:
            return Response(
                {"error": "Invalid file type. Only JPG, JPEG, and PNG are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Define a unique filename using the user ID
        new_filename = f"user_{user.id}{file_extension}"
        avatar_path = f"avatars/{new_filename}"

        # Delete the old avatar (if it exists and is not the default)
        if user.avatar and user.avatar.name != "avatars/default.png":
            old_avatar_path = os.path.join(settings.MEDIA_ROOT, user.avatar.name)
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)

        # Save the new avatar
        user.avatar.save(avatar_path, file_obj)
        user.save(update_fields=["avatar"])  # Ensure the database updates the field

        return Response(
            {
                "message": "Profile picture updated successfully.",
                "avatar_url": user.avatar.url,
            },
            status=status.HTTP_200_OK,
        )


class AddFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        friend_username = request.data.get("username")
        if not friend_username:
            return Response(
                {"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure consistency: Use `CustomUser` instead of `User`
        friend_user = get_object_or_404(CustomUser, username=friend_username)
        current_user = request.user  # Current authenticated user

        # Prevent adding oneself
        if current_user == friend_user:
            return Response(
                {"error": "You cannot add yourself as a friend."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if they are already friends
        if friend_user in current_user.friends.all():
            return Response({"message": "Already friends."}, status=status.HTTP_200_OK)

        # Add each other as friends (symmetrical relationship)
        current_user.friends.add(friend_user)
        friend_user.friends.add(current_user)

        return Response(
            {"message": f"{friend_username} added as a friend."},
            status=status.HTTP_200_OK,
        )


class ListFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        friends = user.friends.all().values("username")
        return Response({"friends": list(friends)})


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        friend_username = request.data.get("username")
        if not friend_username:
            return Response(
                {"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get the current authenticated user
        current_user = request.user

        # Get the friend user safely
        friend_user = get_object_or_404(CustomUser, username=friend_username)

        # Prevent removing oneself
        if current_user == friend_user:
            return Response(
                {"error": "You cannot remove yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if they are actually friends
        if friend_user not in current_user.friends.all():
            return Response(
                {"error": "This user is not in your friend list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove each other as friends (symmetrical relationship)
        current_user.friends.remove(friend_user)
        friend_user.friends.remove(current_user)

        return Response(
            {"message": f"{friend_username} has been removed from your friend list."},
            status=status.HTTP_200_OK,
        )


class FriendsOnlineStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        friends = current_user.friends.all()

        friends_status = [
            {
                "username": friend.username,
                "is_online": friend.is_online,
                "last_seen": (
                    friend.last_seen.strftime("%Y-%m-%d %H:%M:%S")
                    if friend.last_seen
                    else "Never"
                ),
            }
            for friend in friends
        ]

        return Response({"friends_status": friends_status}, status=status.HTTP_200_OK)   

class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        receiver_username = request.data.get('username')
        try:
            receiver = CustomUser.objects.get(username=receiver_username)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if FriendRequest.objects.filter(sender=request.user, receiver=receiver, status='pending').exists():
            return Response({"error": "Friend request already sent."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the friend request
        friend_request = FriendRequest.objects.create(sender=request.user, receiver=receiver)
        
        # Create a notification for the receiver
        Notification.objects.create(
            user=receiver,
            message=f"{request.user.username} sent you a friend request."
        )
        
        # (Optional) Push the notification over WebSockets here
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{receiver.id}",
            {
                "type": "send_notification",
                "content": {"message": f"{request.user.username} sent you a friend request."}
            }
        )
        return Response({"message": "Friend request sent."}, status=status.HTTP_200_OK)


class ViewFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friend_requests = FriendRequest.objects.filter(receiver=request.user, status="pending")
        requests_data = [{"sender": fr.sender.username} for fr in friend_requests]

        return Response({"requests": requests_data}, status=200)


class RespondToFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sender_username = request.data.get("username")
        action = request.data.get("action")  # 'accept' or 'decline'

        if action not in ["accept", "decline"]:
            return Response({"error": "Invalid action. Use 'accept' or 'decline'."}, status=400)

        try:
            friend_request = FriendRequest.objects.get(sender__username=sender_username, receiver=request.user, status="pending")
        except FriendRequest.DoesNotExist:
            return Response({"error": "Friend request not found."}, status=404)

        if action == "accept":
            # Add each other as friends
            request.user.friends.add(friend_request.sender)
            friend_request.sender.friends.add(request.user)
            friend_request.status = "accepted"
            message = f"You are now friends with {sender_username}!"
        else:
            friend_request.status = "declined"
            message = f"You have declined {sender_username}'s friend request."

        friend_request.save()

        return Response({"message": message}, status=200)

# class ConfirmFriendRequestView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request):
#         sender_username = request.data.get('username')
#         try:
#             sender = CustomUser.objects.get(username=sender_username)
#         except CustomUser.DoesNotExist:
#             return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
#         try:
#             friend_request = FriendRequest.objects.get(
#                 sender=sender,
#                 receiver=request.user,
#                 status='pending'
#             )
#         except FriendRequest.DoesNotExist:
#             return Response({"error": "No pending friend request from this user."}, status=status.HTTP_400_BAD_REQUEST)
        
#         friend_request.status = 'accepted'
#         friend_request.save()
        
#         # Optionally, update both users’ friend lists (depending on your overall user management)
        
#         # Create a notification for the sender
#         Notification.objects.create(
#             user=sender,
#             message=f"{request.user.username} accepted your friend request."
#         )
        
#         # (Optional) Push the notification over WebSockets here
        
#         return Response({"message": "Friend request accepted."}, status=status.HTTP_200_OK)

import logging

logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        tournament_data = request.data.get("tournament_name")
        players_data = request.data.get("players", [])
        number_of_games = request.data.get(
            "number_of_games", 1
        )  # Valeur par défaut à 1
        points_to_win = request.data.get("points_to_win", 3)  # Valeur par défaut à 3

        logger.debug(f"Tournament data: {tournament_data}")
        logger.debug(f"Players data: {players_data}")
        logger.debug(f"Number of games: {number_of_games}")
        logger.debug(f"Points to win: {points_to_win}")

        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Création du tournoi
        tournament_serializer = TournamentSerializer(
            data={
                "tournament_name": tournament_data,
                "date": timezone.now().date(),
                "number_of_games": number_of_games,
                "points_to_win": points_to_win,
            }
        )
        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save()
            tournament_id = tournament.id

            # 2. Gestion des joueurs
            players = []
            for player_player in players_data:
                logger.debug(f"Processing player: {player_player}")

                # Vérifier si un utilisateur avec ce pseudo existe
                try:
                    user = CustomUser.objects.get(username=player_player)
                    player, created = Player.objects.get_or_create(
                        player=player_player, defaults={"user": user}
                    )
                    if (
                        not created
                    ):  # Si le joueur existait déjà, mettre à jour le champ user si nécessaire
                        if player.user is None:
                            player.user = user
                            player.save()
                except CustomUser.DoesNotExist:
                    # Si l'utilisateur n'existe pas, le joueur est un "guest"
                    player, created = Player.objects.get_or_create(player=player_player)

                players.append(player)

            # 3. Association des joueurs au tournoi
            for player in players:
                TournamentPlayer.objects.create(player=player, tournament=tournament)

            # 4. Génération des matchs
            generate_matches(tournament_id, number_of_games, points_to_win)

            return Response(
                {
                    "message": "Tournament, players, and matches added successfully",
                    "tournament_id": tournament_id,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            logger.error(
                f"Tournament serializer errors: {tournament_serializer.errors}"
            )
            return Response(
                tournament_serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )


def generate_matches(tournament_id, number_of_games, points_to_win):
    # Récupérer tous les joueurs associés au tournoi
    tournament_players = TournamentPlayer.objects.filter(tournament_id=tournament_id)
    players = [tp.player for tp in tournament_players]

    # Générer tous les matchs possibles
    matches = combinations(players, 2)

    # Enregistrer les matchs dans le modèle PongMatch
    for player1, player2 in matches:
        PongMatch.objects.create(
            tournament_id=tournament_id,
            player1=player1,
            player2=player2,
            user1=player1.user,  # Peut être None
            user2=player2.user,  # Peut être None
            sets_to_win=number_of_games,
            points_per_set=points_to_win,
            is_tournament_match=True,  # Indiquer que c'est un match de tournoi
        )

    logger.debug(f"Matches generated for tournament {tournament_id}")


class TournamentMatchesView(APIView):
    def get(self, request):
        tournament_id = request.GET.get("tournament_id")
        if not tournament_id:
            return Response(
                {"error": "Tournament ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tournament = Tournament.objects.get(id=tournament_id)
            matches = PongMatch.objects.filter(tournament=tournament)
            serializer = PongMatchSerializer(matches, many=True)
            return Response(serializer.data)
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"},
                status=status.HTTP_404_NOT_FOUND,
            )


class TournamentSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        name = request.GET.get("name", "")
        tournaments = Tournament.objects.filter(tournament_name__icontains=name)
        data = [
            {"id": t.id, "tournament_name": t.tournament_name, "date": t.date}
            for t in tournaments
        ]
        return JsonResponse(data, safe=False)


class RankingView(APIView):
    def get(self, request):
        # Calculer le nombre de victoires pour chaque joueur
        players = Player.objects.all()
        ranking_data = []

        for player in players:
            total_wins = PongMatch.objects.filter(winner=player).count()
            ranking_data.append({"name": player.player, "total_wins": total_wins})

        # Trier le classement par nombre de victoires décroissant
        ranking_data.sort(key=lambda x: x["total_wins"], reverse=True)

        return Response(ranking_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_user_exists(request):
    username = request.GET.get("username", "")
    try:
        user = CustomUser.objects.get(username=username)
        player = Player.objects.get(user=user)
        return JsonResponse(
            {
                "exists": True,
                "user_id": user.id,
                "username": user.username,
                "is_guest": player.is_guest,
            }
        )
    except CustomUser.DoesNotExist:
        return JsonResponse({"exists": False})
