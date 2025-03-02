import logging
import os
import random
import time
import uuid  # Pour générer un pseudonyme aléatoire
from itertools import combinations

import jwt
from api.authentication import CookieJWTAuthentication
from asgiref.sync import async_to_sync  # for notifications over WebSockets
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail

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
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import (
    CustomUser,
    FriendRequest,
    Notification,
    Player,
    PongMatch,
    PongSet,
    Tournament,
    TournamentPlayer,
)
from .serializers import (
    PongMatchSerializer,
    PongSetSerializer,
    TournamentPlayerSerializer,
    TournamentSerializer,
    UserRegisterSerializer,
    ChangePasswordSerializer,
)

CustomUser = get_user_model()  # Utilisé quand nécessaire


class PongMatchList(generics.ListCreateAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    filter_backends = [DjangoFilterBackend]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_param = self.request.query_params.get("user1")

        if user_param:
            player_id = (
                Player.objects.filter(player=user_param)
                .values_list("id", flat=True)
                .first()
            )
            if not player_id:
                return PongMatch.objects.none()  # Retourne un queryset vide
            queryset = queryset.filter(Q(player1=player_id) | Q(player2=player_id))

        return queryset


class PongMatchDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    permission_classes = [IsAuthenticated]


class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            match = PongMatch.objects.get(pk=pk)
            winner = match.winner
            player1 = match.player1
            player2 = match.player2
            sets = match.sets.all()

            match_serializer = PongMatchSerializer(match)
            sets_serializer = PongSetSerializer(sets, many=True)

            response_data = match_serializer.data
            response_data["sets"] = [set_data for set_data in sets_serializer.data]

            return Response(response_data)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def _is_match_finished(self, match_data, sets_data):
        """
        Détermine si un match est terminé en vérifiant les sets et le gagnant.
        Retourne True si le match est terminé, False sinon.
        """
        # Vérifie si des sets ont été joués (au moins un score non nul)
        if sets_data:
            for set_data in sets_data:
                if (
                    set_data.get("player1_score", 0) > 0
                    or set_data.get("player2_score", 0) > 0
                ):
                    return True
        # Vérifie si un gagnant est spécifié ou si c'est un match nul
        if match_data.get("winner") or (
            match_data.get("player1_sets_won", 0)
            == match_data.get("player2_sets_won", 0)
            and match_data.get("player1_sets_won", 0) > 0
        ):
            return True
        return False

    def post(self, request):
        match_data = request.data
        logger.debug("Received match data: %s", match_data)
        sets_data = match_data.pop("sets", [])
        logger.debug("Extracted sets data: %s", sets_data)
        mode = match_data.get("mode", "solo")

        user1 = request.user
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name,
            defaults={"user": user1 if user1.username == player1_name else None},
        )

        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        if mode != "solo" and player2.user:
            if not player2.authenticated:
                return Response(
                    {
                        "error": "Player2 must be authenticated or guest for multiplayer matches."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            match_data["user2"] = player2.user.id
        else:
            match_data["user2"] = None
            if mode != "solo":
                match_data["player2_sets_won"] = 0
                match_data["player1_sets_won"] = 0

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        # Créer et sauvegarder le match
        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Sauvegarder les sets après le match
            for set_data in sets_data:
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Vérifier si le match est terminé et mettre à jour le gagnant
            if self._is_match_finished(match_data, sets_data):
                if match_data.get("winner"):
                    try:
                        winner_player = Player.objects.get(player=match_data["winner"])
                        match.winner = winner_player
                    except Player.DoesNotExist:
                        match.winner = None
                else:
                    # Si pas de gagnant explicite mais match terminé, vérifier s'il y a match nul
                    if (
                        match.player1_sets_won == match.player2_sets_won
                        and match.player1_sets_won > 0
                    ):
                        match.winner = None  # Match nul
                    else:
                        match.winner = None  # Match non décidé ou en cours
                match.save()

            # Réinitialiser l'état d'authentification de player2 si nécessaire
            if mode != "solo" and player2.user:
                player2.authenticated = False
                player2.save()

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

        user1 = request.user
        player1_name = match_data.get("player1", match.player1.player)
        player2_name = match_data.get("player2", match.player2.player)

        player1, created = Player.objects.get_or_create(player=player1_name)
        player2, created = Player.objects.get_or_create(player=player2_name)

        if player2.user and player2.authenticated:
            match_data["user2"] = player2.user.id
        else:
            match_data["user2"] = None

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        match_serializer = PongMatchSerializer(match, data=match_data, partial=True)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Gérer les sets (mise à jour ou création)
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
                    set_data["match"] = match.id
                    set_serializer = PongSetSerializer(data=set_data)

                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Vérifier si le match est terminé et mettre à jour le gagnant
            if self._is_match_finished(match_data, sets_data):
                if match_data.get("winner"):
                    try:
                        winner_player = Player.objects.get(player=match_data["winner"])
                        match.winner = winner_player
                    except Player.DoesNotExist:
                        match.winner = None
                else:
                    # Vérifier s'il y a match nul
                    if (
                        match.player1_sets_won == match.player2_sets_won
                        and match.player1_sets_won > 0
                    ):
                        match.winner = None  # Match nul
                    else:
                        match.winner = None  # Match non décidé ou en cours
                match.save()

            return Response(match_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            username = request.data.get("username")
            user = CustomUser.objects.get(username=username)

            # Check if 2FA is enabled and not verified
            if user.is_2fa_enabled and not request.session.get("2fa_verified"):
                # Generate a new OTP
                otp_code = str(random.randint(100000, 999999))
                user.otp_secret = otp_code
                user.save()
                send_mail(
                    "Your Two-Factor Authentication Code",
                    f"Your OTP code is: {otp_code}",
                    "pong42lausanne@gmail.com",
                    [user.email],
                    fail_silently=False,
                )
                return Response(
                    {"detail": "2FA verification required. Please verify OTP."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

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


class Verify2FALoginView(APIView):
    """
    Endpoint for verifying OTP during login for users with 2FA enabled.
    This view does NOT require prior authentication.
    Expects both username and OTP in the request.
    On success, it issues new JWT tokens.
    """

    # No IsAuthenticated here because the user isn't fully authenticated yet
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        otp_code = request.data.get("otp_code")

        if not username or not otp_code:
            return Response(
                {"error": "Username and OTP code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

        stored_otp = str(user.otp_secret).strip() if user.otp_secret else None
        entered_otp = str(otp_code).strip()

        if stored_otp and stored_otp == entered_otp:
            user.is_2fa_enabled = True
            user.otp_secret = None
            user.save()

            # Mark session as 2FA verified
            request.session["2fa_verified"] = True
            request.session.modified = True

            # Issue new JWT tokens for login completion
            refresh = RefreshToken.for_user(user)
            response = Response(
                {
                    "message": "2FA successfully verified.",
                    "success": True,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_200_OK,
            )

            # Set tokens as HttpOnly cookies
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=False,
                samesite="Lax",
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=False,
                samesite="Lax",
            )

            return response
        else:
            return Response(
                {"error": "Invalid OTP. Try again."}, status=status.HTTP_400_BAD_REQUEST
            )


class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        otp_code = request.data.get("otp_code")

        # If 2FA is currently enabled, then toggle to disable it
        if user.is_2fa_enabled:
            user.is_2fa_enabled = False
            user.otp_secret = None
            user.save()
            # No OTP verification needed when disabling
            return Response(
                {"message": "2FA disabled successfully."}, status=status.HTTP_200_OK
            )

        # Otherwise, if 2FA is disabled:
        if otp_code:
            # If an OTP code is provided, verify it
            stored_otp = str(user.otp_secret).strip() if user.otp_secret else None
            entered_otp = str(otp_code).strip()

            if stored_otp and stored_otp == entered_otp:
                user.is_2fa_enabled = True
                user.otp_secret = None  # Clear OTP after verification
                user.save()

                # Mark session as 2FA verified (do not flush, so session remains)
                request.session["2fa_verified"] = True
                request.session.modified = True

                # Issue new JWT tokens so the user remains authenticated
                refresh = RefreshToken.for_user(user)
                response = Response(
                    {"message": "2FA successfully enabled."}, status=status.HTTP_200_OK
                )
                response.set_cookie(
                    "access_token",
                    str(refresh.access_token),
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                )
                response.set_cookie(
                    "refresh_token",
                    str(refresh),
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                )
                return response
            else:
                return Response(
                    {"error": "Invalid OTP. Try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # No OTP provided: generate one and send via email.
            otp_code_generated = str(random.randint(100000, 999999))
            user.otp_secret = otp_code_generated
            user.save()

            send_mail(
                "Your One-Time Code – Let’s Keep It Secure!",
                f"Hey {user.username},\n\n"
                "Here’s your one-time code:\n\n"
                f" {otp_code_generated} \n\n"
                "Use it to log in or enable Two-Factor Authentication (2FA) for extra security.\n\n"
                "Just enter it on the official site, and you’re all set.\n\n"
                "This code is just for you—don’t share it with anyone!\n\n"
                "See you on the leaderboard!\n\n"
                "The Pong Team\n"
                "42 Lausanne",
                "pong42lausanne@gmail.com",
                [user.email],
                fail_silently=False,
            )
            return Response(
                {
                    "message": "OTP sent to your email. Please verify.",
                    "otp_required": True,
                },
                status=status.HTTP_200_OK,
            )


class Session2FAView(APIView):
    """
    Stores 2FA verification status in the user's session.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.session["2fa_verified"] = True
        request.session.modified = True
        return Response({"message": "2FA session stored successfully."}, status=200)


class AuthenticateMatchPlayerView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        player_name = request.data.get("player_name")

        user = authenticate(username=username, password=password)
        if user is not None:
            try:
                player = Player.objects.get(player=player_name)
                if player.user != user:
                    return Response(
                        {"error": "Player name does not match authenticated user."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                # Mise à jour de l'état d'authentification du joueur
                player.authenticated = True
                player.save()

                return Response(
                    {
                        "message": "Player authenticated successfully for match",
                        "success": True,
                    },
                    status=status.HTTP_200_OK,
                )
            except Player.DoesNotExist:
                return Response(
                    {"error": "Player does not exist"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {"error": "Invalid credentials", "success": False},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class AuthenticateTournamentPlayerView(APIView):
    def post(self, request, tournament_id):
        username = request.data.get("username")
        password = request.data.get("password")
        player_name = request.data.get("player_name")

        user = authenticate(username=username, password=password)
        if user is not None:
            try:
                player = Player.objects.get(player=player_name)
                if player.user != user:
                    return Response(
                        {"error": "Player name does not match authenticated user."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                # Si vous avez besoin de vérifier si le joueur est dans le tournoi
                try:
                    tournament_player = TournamentPlayer.objects.get(
                        player=player, tournament_id=tournament_id
                    )
                    tournament_player.authenticated = True
                    tournament_player.save()
                except TournamentPlayer.DoesNotExist:
                    return Response(
                        {"error": "Player not in this tournament"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                player.authenticated = True
                player.save()

                return Response(
                    {"message": "Player authenticated successfully", "success": True},
                    status=status.HTTP_200_OK,
                )
            except Player.DoesNotExist:
                return Response(
                    {"error": "Player does not exist"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {"error": "Invalid credentials", "success": False},
                status=status.HTTP_401_UNAUTHORIZED,
            )


logger = logging.getLogger(__name__)


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            logger.warning("No refresh token provided in cookies")
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.data["refresh"] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            logger.info("Token refreshed successfully: %s", tokens)
            response = JsonResponse({"message": "Token refreshed successfully"})
            # Mettre à jour le cookie access_token
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # À passer à True en production
                samesite="Lax",
            )
            # Mettre à jour le cookie refresh_token avec le nouveau refresh_token
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=False,  # À passer à True en production
                samesite="Lax",
            )
        else:
            logger.error("Token refresh failed: %s", response.data)
        return response


# OLD version from janetta
# class CustomTokenRefreshView(TokenRefreshView):
#     permission_classes = [AllowAny]
#
#     def post(self, request, *args, **kwargs):
#         refresh_token = request.COOKIES.get("refresh_token")
#         if not refresh_token:
#             return Response(
#                 {"detail": "Refresh token not provided."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )
#         request.data["refresh"] = refresh_token
#
#         response = super().post(request, *args, **kwargs)
#         if response.status_code == 200:
#             tokens = response.data
#             response = JsonResponse({"message": "Token refreshed successfully"})
#             response.set_cookie(
#                 key="access_token",
#                 value=tokens["access"],
#                 httponly=True,
#                 secure=False,  # Set to True in production
#                 samesite="Lax",
#             )
#         return response


logger = logging.getLogger(__name__)


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def post(self, request):
        logger.info("Received data: %s", request.data)
        serializer = self.serializer_class(data=request.data)
        logger.info("Serializer validation result: %s", serializer.is_valid())

        # Check if the serializer is valid
        if not serializer.is_valid():
            logger.error("Validation errors: %s", serializer.errors)
            # Return detailed error messages from the serializer
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # At this point the serializer is valid so we can create the user
        try:
            # Create the user using validated data from the serializer
            user = CustomUser.objects.create_user(
                username=serializer.validated_data.get("username"),
                password=serializer.validated_data.get("password"),
                privacy_policy_accepted=serializer.validated_data.get(
                    "privacy_policy_accepted"
                ),
                # email = serializer.validated_data.get("email", None)  # Email might not be provided
            )
            logger.info("User created: %s", user.username)

            # Création du joueur
            player = Player.objects.create(
                user=user,
                player=serializer.validated_data.get("username"),
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
                {"error": "Could not create user. Identifier might be already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error("Error creating user or player: %s", str(e))
            return Response(
                {"error": "Could not create user or player."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CustomTokenValidateView(APIView):
    # authentication_classes = [JWTAuthentication]
    # permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # Extraire le token du cookie
        token = request.COOKIES.get("access_token")
        if not token:
            logger.warning("No access token found in cookies.")
            return Response(
                {"detail": "Access token not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Ajouter le token à l'en-tête d'autorisation manuellement si nécessaire
        # Cela pourrait être fait dans un middleware ou avant d'appeler cette vue
        request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"

        try:
            # La validation est déjà effectuée par JWTAuthentication, donc si on est ici,
            # cela signifie que le token est valide. Cependant, on peut ajouter plus de vérifications si nécessaire.
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

            # Vérifier si le token n'a pas expiré
            if payload.get("exp") <= int(time.time()):
                logger.warning("Token has expired.")
                return Response(
                    {"detail": "Token has expired."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Si nous sommes ici, le token est valide
            logger.info("Token validation successful.")
            return Response(
                {"detail": "Token is valid.", "valid": True}, status=status.HTTP_200_OK
            )

        except jwt.ExpiredSignatureError:
            logger.warning("Expired signature error.")
            return Response(
                {"detail": "Signature has expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError:
            logger.warning("Invalid token error.")
            return Response(
                {"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Update user's online status and last seen timestamp
            user = request.user
            user.is_online = False  # Set user as offline
            user.update_last_seen()
            user.save()

            # Clear 2FA session status
            request.session.flush()  # Removes all session data, including "2fa_verified"

            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    # Ensure the token is saved as an OutstandingToken
                    outstanding_token = OutstandingToken.objects.get(token=token)
                    if not BlacklistedToken.objects.filter(
                        token=outstanding_token
                    ).exists():
                        BlacklistedToken.objects.create(token=outstanding_token)
                except OutstandingToken.DoesNotExist:
                    pass  # If token
            response = JsonResponse({"detail": "Logout successful."})
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnonymizeAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_authenticated:
            # Generate a random pseudonym for the deleted user
            anonymous_name = f"Anonymized_User_{uuid.uuid4().hex[:5]}"

            # Update winner field if this user was a winner
            # PongMatch.objects.filter(winner=user.username).update(winner=anonymous_name)

            # Update the Player profile: change the player's display name to the new anonymous name
            # We keep the user association so foreign keys in PongMatch remain valid
            Player.objects.filter(user=user).update(player=anonymous_name)

            # Remove all personal data from User, but keep the account ID (FK in PongMatch)
            user.username = anonymous_name

            # Clear optional attributes if they exist
            if hasattr(user, "email"):
                user.email = None
            if hasattr(user, "first_name"):
                user.first_name = "Anonymous"
            if hasattr(user, "last_name"):
                user.last_name = "User"
            if hasattr(user, "phone_number"):
                user.phone_number = None
            if hasattr(user, "friend_list"):
                user.friend_list.clear()
            if hasattr(user, "is_online"):
                user.is_online = False
            if hasattr(user, "last_seen"):
                user.last_seen = None
            if hasattr(user, "avatar") and user.avatar:
                try:
                    # If there's a custom avatar file, delete it
                    if user.avatar.name and user.avatar.name != "avatars/default.png" and os.path.exists(user.avatar.path):
                        os.remove(user.avatar.path)
                except Exception as e:
                    print(f"Error deleting avatar file: {e}")
                # Reset to default avatar
                user.avatar.name = "avatars/default.png"
            user.is_active = False  # Deactivate the account
            user.date_joined = None
            user.set_unusable_password()
            user.save()
            request.session.flush()

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


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Generating new tokens
            refresh = RefreshToken.for_user(user)
            
            response = Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
            
            # Setting new tokens as cookies
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=600  # 10 minutes
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=86400  # 24 hours
            )
            
            return response
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
                "is_2fa_enabled": user.is_2fa_enabled,
            }
        )

    def put(self, request):
        """Updates the current user's details."""
        user = request.user
        data = request.data

        # Check if email already exists (excluding the current user's email)
        if "email" in data:
            email=data["email"]
            existing_user = (
                CustomUser.objects.filter(email=email)
                .exclude(id=user.id)
                .first()
            )
            if existing_user:
                return Response(
                    {"error": "This email is already in use."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = email
        else:
            user.email = None  # Allow email removal

        # Handle phone number: Allow None, Check Uniqueness
        if "phone_number" in data:
            phone_number = data["phone_number"]
            if phone_number:  # Only check if phone number is provided
                existing_user = (
                    CustomUser.objects.filter(phone_number=phone_number)
                    .exclude(id=user.id)
                    .first()
                )
                if existing_user:
                    return Response(
                        {"error": "This phone number is already in use."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.phone_number = phone_number
            else:
                user.phone_number = None  # Allow phone number removal
   

        if "username" in data:
            user.username = data["username"]
        try:
            user.save()
            refresh = RefreshToken.for_user(user)
            response = Response({"message": "Profile updated successfully!"}, status=status.HTTP_200_OK)
            response.set_cookie("access_token", str(refresh.access_token), httponly=True, secure=False, samesite="Lax", max_age=3600)  # 1 hour
            response.set_cookie("refresh_token", str(refresh), httponly=True, secure=False, samesite="Lax", max_age=86400)  # 24 hours
            return response
        except IntegrityError:
            return Response(
                {"error": "Database error: unique constraint failed."},
                status=status.HTTP_400_BAD_REQUEST,
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

class DeleteAvatarView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Check if the user has a custom avatar (not the default one)
        if hasattr(user, 'avatar') and user.avatar and user.avatar.name != "avatars/default.png":
            avatar_path = os.path.join(settings.MEDIA_ROOT, user.avatar.name)
            
            # Remove the file if it exists
            if os.path.exists(avatar_path):
                os.remove(avatar_path)

            # Reset the avatar to the default
            user.avatar.name = "avatars/default.png"
            user.save(update_fields=["avatar"])

            return Response({"message": "Avatar deleted successfully.", "avatar_url": "/media/avatars/default.png"}, status=status.HTTP_200_OK)
        else:
            # If the avatar is already the default, return a message
            return Response({"message": "No custom avatar to delete.", "avatar_url": "/media/avatars/default.png"}, status=status.HTTP_200_OK)

class ListFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        friends = user.friends.all()
        friends_data = [
            {
                "username": friend.username,
                "avatar": request.build_absolute_uri(friend.avatar.url)
                if friend.avatar else request.build_absolute_uri("/media/avatars/avatar1.png"),
            }
            for friend in friends
        ]
        return Response({"friends": friends_data})


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

        # Check if they are actually friends
        if friend_user not in current_user.friends.all():
            return Response(
                {"error": "This user is not in your friend list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove each other as friends (symmetrical relationship)
        current_user.friends.remove(friend_user)
        friend_user.friends.remove(current_user)
        # Delete any pending requests between these users
        FriendRequest.objects.filter(sender=current_user, receiver=friend_user).delete()
        FriendRequest.objects.filter(sender=friend_user, receiver=current_user).delete()

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
                    friend.last_seen.strftime("%Y-%m-%d %H:%M")
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
        receiver_username = request.data.get("username")
        try:
            receiver = CustomUser.objects.get(username=receiver_username)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        # Check if friend request is already sent
        if FriendRequest.objects.filter(
            sender=request.user, receiver=receiver, status="pending"
        ).exists():
            return Response(
                {"error": "Friend request already sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if they are already friends
        if receiver in request.user.friends.all():
            return Response(
                {"error": "You are already friends with this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the friend request
        friend_request = FriendRequest.objects.create(
            sender=request.user, receiver=receiver
        )

        # Create a notification for the receiver
        Notification.objects.create(
            user=receiver,
            message=f"{request.user.username} sent you a friend request.",
            notification_type="friend_request",  # this should match websocket event type
        )

        # Push the notification over WebSockets
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{receiver.id}",
            {
                "type": "send_notification",
                "content": {
                    "message": f"{request.user.username} sent you a friend request.",
                    "notification_type": "friend_request",
                },
            },
        )
        return Response({"message": "Friend request sent."}, status=status.HTTP_200_OK)


class ViewFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friend_requests = FriendRequest.objects.filter(
            receiver=request.user, status="pending"
        )
        requests_data = [
            {
                "sender": fr.sender.username,
                "avatar": request.build_absolute_uri(fr.sender.avatar.url)
                if fr.sender.avatar else request.build_absolute_uri("/media/avatars/avatar1.png"),
                
            } 
            for fr in friend_requests
        ]

        return Response({"requests": requests_data}, status=200)


class RespondToFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sender_username = request.data.get("username")
        action = request.data.get("action")  # 'accept' or 'decline'

        if not sender_username or action not in ["accept", "decline"]:
            return Response(
                {"error": "Invalid action. Use 'accept' or 'decline'."}, status=400
            )

        try:
            friend_request = FriendRequest.objects.get(
                sender__username=sender_username,
                receiver=request.user,
                status="pending",
            )
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

            # Create a notification for the sender to inform them that their request was declined
            Notification.objects.create(
                user=friend_request.sender,
                message=f"{request.user.username} declined your friend request.",
                notification_type="friend_request_declined",
            )

        friend_request.save()

        return Response({"message": message}, status=200)


logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        tournament_data = request.data.get("tournament_name")

        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tournament_serializer = TournamentSerializer(
            data={
                "tournament_name": tournament_data,
                "date": timezone.now().date(),
                "is_finalized": False,  # Set this to False by default
            }
        )

        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save()
            return Response(
                {
                    "message": "Tournament created successfully",
                    "tournament_id": tournament.id,
                    "tournament_name": tournament.tournament_name,
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


class TournamentFinalizationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request, tournament_id):
        players_data = request.data.get("players", [])
        number_of_games = request.data.get("number_of_games", 1)
        points_to_win = request.data.get("points_to_win", 3)

        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if tournament.is_finalized:
            return Response(
                {"error": "This tournament has already been finalized"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update tournament with match rules
        tournament.number_of_games = number_of_games
        tournament.points_to_win = points_to_win
        tournament.is_finalized = True  # Mark as finalized
        tournament.save()

        # Player management
        for player_data in players_data:
            player_name = player_data.get("name")
            authenticated = player_data.get("authenticated", False)
            guest = player_data.get("guest", False)

            try:
                user = CustomUser.objects.get(username=player_name)
                player, created = Player.objects.get_or_create(
                    player=player_name, defaults={"user": user}
                )
                if not created and not player.user:
                    player.user = user
                    player.save()
            except CustomUser.DoesNotExist:
                player, created = Player.objects.get_or_create(player=player_name)

            TournamentPlayer.objects.create(
                player=player,
                tournament=tournament,
                authenticated=authenticated,
                guest=guest,
            )

        # Generate matches after all players are added and tournament details are set
        generate_matches(tournament_id, number_of_games, points_to_win)

        # Clean up unfinalized tournaments when a new tournament is finalized
        from django.core.management import call_command

        call_command("cleanup_tournaments")

        return Response(
            {
                "message": "Tournament finalized, players added, and matches generated successfully",
                "tournament_id": tournament_id,
                "tournament_name": tournament.tournament_name,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def cleanup_unfinalized_tournaments():
        # Define how old an unfinalized tournament should be to be considered for deletion
        # max_age = timezone.now() - timezone.timedelta(
        #     days=7
        # )  # Example: delete tournaments older than 7 days if not finalized
        unfinalized_tournaments = Tournament.objects.filter(
            is_finalized=False
            # is_finalized=False, date__lt=max_age
        )

        for tournament in unfinalized_tournaments:
            # Delete associated TournamentPlayer entries
            TournamentPlayer.objects.filter(tournament=tournament).delete()
            # Then delete the tournament
            tournament.delete()

        return {
            "message": f"Cleaned up {unfinalized_tournaments.count()} unfinalized tournaments"
        }


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
            {
                "id": t.id,
                "tournament_name": t.tournament_name,
                "date": t.date,
                "is_finished": t.is_finished,
            }
            for t in tournaments
        ]
        return JsonResponse(data, safe=False)


class UserTournamentsView(APIView):
    permission_classes = [
        IsAuthenticated
    ]  # Assurez-vous que seuls les utilisateurs authentifiés peuvent accéder

    def get(self, request):
        # Utiliser l'utilisateur connecté pour filtrer les tournois
        username = request.user.username
        try:
            # Supposons que vous avez une relation entre Tournament et Player via TournamentPlayer
            user_tournaments = Tournament.objects.filter(
                tournamentplayer__player__user__username=username  # Cette relation dépend de comment vos modèles sont liés
            ).distinct()  # Utiliser distinct pour éviter les doublons si un utilisateur est dans plusieurs matchs du même tournoi

            serializer = TournamentSerializer(user_tournaments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# class RankingView(APIView):
#     def get(self, request):
#         # Calculer le nombre de victoires pour chaque joueur
#         players = Player.objects.all()
#         ranking_data = []
#
#         for player in players:
#             total_wins = PongMatch.objects.filter(winner=player).count()
#             ranking_data.append({"name": player.player, "total_wins": total_wins})
#
#         # Trier le classement par nombre de victoires décroissant
#         ranking_data.sort(key=lambda x: x["total_wins"], reverse=True)
#
#         return Response(ranking_data)


class RankingView(APIView):
    def get(self, request):
        players = Player.objects.all()
        ranking_data = []

        for player in players:
            # Matchs gagnés
            total_wins = PongMatch.objects.filter(winner=player).count()

            # Matchs joués où le joueur est player1 ou player2
            matches_played = PongMatch.objects.filter(
                Q(player1=player) | Q(player2=player)
            )

            # Matchs perdus : joués mais pas gagnés (winner != player et winner non null)
            total_losses = (
                matches_played.exclude(winner=player)
                .filter(winner__isnull=False)
                .count()
            )

            # Matchs nuls : joués mais sans vainqueur (winner est null)
            total_draws = matches_played.filter(winner__isnull=True).count()

            # Sets gagnés et perdus
            sets_won = 0
            sets_lost = 0
            points_scored = 0
            points_conceded = 0

            # Parcourir les matchs joués pour calculer sets et points
            for match in matches_played:
                if match.player1 == player:
                    sets_won += match.player1_sets_won or 0
                    sets_lost += match.player2_sets_won or 0
                elif match.player2 == player:
                    sets_won += match.player2_sets_won or 0
                    sets_lost += match.player1_sets_won or 0

                # Points à partir des sets
                sets = match.sets.all()
                for pong_set in sets:
                    if match.player1 == player:
                        points_scored += pong_set.player1_score or 0
                        points_conceded += pong_set.player2_score or 0
                    elif match.player2 == player:
                        points_scored += pong_set.player2_score or 0
                        points_conceded += pong_set.player1_score or 0

            ranking_data.append(
                {
                    "name": player.player,
                    "total_wins": total_wins,
                    "total_losses": total_losses,
                    "total_draws": total_draws,
                    "sets_won": sets_won,
                    "sets_lost": sets_lost,
                    "points_scored": points_scored,
                    "points_conceded": points_conceded,
                }
            )

        # Trier par nombre de victoires décroissant
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_player_exists(request):
    player_name = request.GET.get("player_name", "")
    try:
        player = Player.objects.get(player=player_name)
        return Response(
            {
                "exists": True,
                "player_id": player.id,
                "player_name": player.player,
                "is_guest": player.is_guest,  # Assuming Player has this property or method
            }
        )
    except Player.DoesNotExist:
        return Response({"exists": False}, status=status.HTTP_200_OK)


class TournamentPlayersView(APIView):
    def get(self, request, tournament_id):
        try:
            # Fetch all players for the specified tournament
            tournament_players = TournamentPlayer.objects.filter(
                tournament_id=tournament_id
            )

            # Serialize the data
            serializer = TournamentPlayerSerializer(tournament_players, many=True)

            # Prepare the response
            response_data = []
            for player_data in serializer.data:
                # Get player details safely, considering 'user' might not exist for guests
                player = Player.objects.get(id=player_data["player"]["id"])
                player_info = {
                    "name": player_data["player"]["player"],
                    "authenticated": player_data["authenticated"],
                    "guest": player.user
                    is None,  # Check if user is None to determine if guest
                }
                response_data.append(player_info)

            return Response(response_data, status=status.HTTP_200_OK)
        except TournamentPlayer.DoesNotExist:
            return Response(
                {"error": "Tournament or players not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PendingTournamentAuthenticationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.user.username  # Utilisateur connecté
        # Récupérer les tournois où l'utilisateur est joueur mais non authentifié
        pending_auths = TournamentPlayer.objects.filter(
            player__user__username=username,
            authenticated=False,
            tournament__is_finished=False,  # Exclure les tournois terminés
        ).select_related("tournament")

        # Formater la réponse
        data = [
            {
                "tournament_id": tp.tournament.id,
                "tournament_name": tp.tournament.tournament_name,
                "player_name": tp.player.player,
            }
            for tp in pending_auths
        ]
        return Response({"pending_authentications": data})


class ConfirmTournamentParticipationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_id):
        player_name = request.data.get("player_name")
        if not player_name:
            return Response(
                {"error": "Player name is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tournament_player = TournamentPlayer.objects.get(
                tournament_id=tournament_id,
                player__user__username=request.user.username,
                player__player=player_name,
                authenticated=False,
            )
            tournament_player.authenticated = True
            tournament_player.save()
            return Response(
                {"message": "Player authenticated successfully", "success": True},
                status=status.HTTP_200_OK,
            )
        except TournamentPlayer.DoesNotExist:
            return Response(
                {"error": "Player not found or already authenticated"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
