import logging
import random
import time

import jwt
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (BlacklistedToken,
                                                             OutstandingToken)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player, TournamentPlayer

logger = logging.getLogger(__name__)
CustomUser = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    # NOTE: Validates input and ensures secure cookie settings for login.
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        if not username or not request.data.get("password"):
            logger.warning("Missing username or password in login attempt")
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            user = CustomUser.objects.get(username=username)

            if user.is_2fa_enabled and not request.session.get("2fa_verified"):
                otp_code = str(random.randint(100000, 999999))
                user.otp_secret = (
                    otp_code  # TODO: Should be hashed or use a proper 2FA library
                )
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

            user.is_online = True
            user.update_last_seen()
            user.save()

            response = JsonResponse({"message": "Login successful"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=True,  # Secure cookies in production
                samesite="Lax",
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=True,  # Secure cookies in production
                samesite="Lax",
            )
        return response


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    # NOTE: Ensures refresh token is present and sets secure cookies.
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
            logger.info("Token refreshed successfully")
            response = JsonResponse({"message": "Token refreshed successfully"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=True,  # Secure cookies in production
                samesite="Lax",
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=True,  # Secure cookies in production
                samesite="Lax",
            )
        return response


class CustomTokenValidateView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Valide le token d'accès dans les cookies et met à jour last_seen si valide.
        Retourne une réponse indiquant si le token est valide ou non.
        """
        # Récupérer le token d'accès depuis les cookies
        token = request.COOKIES.get("access_token")
        if not token:
            logger.warning("No access token found in cookies during validation.")
            return Response(
                {"detail": "Access token not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Simuler l'en-tête Authorization pour l'authentification JWT
        request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"

        try:
            # Décoder le token pour vérifier sa validité
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

            # Vérifier l'expiration du token
            if payload.get("exp") <= int(time.time()):
                logger.warning("Token has expired during validation.")
                return Response(
                    {"detail": "Token has expired."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Si le token est valide, récupérer l'utilisateur authentifié
            user = request.user
            if user.is_authenticated:
                # Mettre à jour last_seen pour indiquer l'activité
                user.update_last_seen()
                logger.info(f"Token validated successfully for user: {user.username}")
                return Response(
                    {"detail": "Token is valid.", "valid": True},
                    status=status.HTTP_200_OK,
                )
            else:
                logger.warning("Token valid but no authenticated user found.")
                return Response(
                    {"detail": "No authenticated user associated with this token."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        except jwt.ExpiredSignatureError:
            logger.warning("Expired token detected during validation.")
            return Response(
                {"detail": "Token has expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError:
            logger.warning("Invalid token detected during validation.")
            return Response(
                {"detail": "Invalid token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as e:
            logger.error(f"Unexpected error during token validation: {str(e)}")
            return Response(
                {"detail": "An error occurred during token validation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Ensures secure logout by blacklisting tokens and clearing cookies.
    def post(self, request):
        user = request.user
        user.is_online = False
        user.update_last_seen()
        user.save()

        request.session.flush()

        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                outstanding_token = OutstandingToken.objects.get(token=token)
                if not BlacklistedToken.objects.filter(
                    token=outstanding_token
                ).exists():
                    BlacklistedToken.objects.create(token=outstanding_token)
            except OutstandingToken.DoesNotExist:
                pass
        response = JsonResponse({"detail": "Logout successful."})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Adds input validation and secure OTP handling (though OTP storage should be improved).
    def post(self, request):
        user = request.user
        otp_code = request.data.get("otp_code")

        if user.is_2fa_enabled:
            user.is_2fa_enabled = False
            user.otp_secret = None
            user.save()
            return Response(
                {"message": "2FA disabled successfully."}, status=status.HTTP_200_OK
            )

        if not otp_code:
            otp_code_generated = str(random.randint(100000, 999999))
            user.otp_secret = otp_code_generated  # TODO: Hash this value
            user.save()
            send_mail(
                "Your One-Time Code – Let’s Keep It Secure!",
                f"Hey {user.username},\n\nHere’s your one-time code:\n\n {otp_code_generated} \n\nUse it to log in or enable Two-Factor Authentication (2FA) for extra security.\n\nJust enter it on the official site, and you’re all set.\n\nThis code is just for you—don’t share it with anyone!\n\nSee you on the leaderboard!\n\nThe Pong Team\n42 Lausanne",
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

        stored_otp = str(user.otp_secret).strip() if user.otp_secret else None
        entered_otp = str(otp_code).strip()
        if stored_otp and stored_otp == entered_otp:
            user.is_2fa_enabled = True
            user.otp_secret = None
            user.save()
            request.session["2fa_verified"] = True
            request.session.modified = True
            refresh = RefreshToken.for_user(user)
            response = Response(
                {"message": "2FA successfully enabled."}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=True,
                samesite="Lax",
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=True,
                samesite="Lax",
            )
            return response
        return Response(
            {"error": "Invalid OTP. Try again."}, status=status.HTTP_400_BAD_REQUEST
        )


class Verify2FALoginView(APIView):
    permission_classes = []

    # NOTE: Validates 2FA input to prevent unauthorized access.
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
            stored_otp = str(user.otp_secret).strip() if user.otp_secret else None
            entered_otp = str(otp_code).strip()
            if stored_otp and stored_otp == entered_otp:
                user.is_2fa_enabled = True
                user.otp_secret = None
                user.save()
                request.session["2fa_verified"] = True
                request.session.modified = True
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
                response.set_cookie(
                    "access_token",
                    str(refresh.access_token),
                    httponly=True,
                    secure=True,
                    samesite="Lax",
                )
                response.set_cookie(
                    "refresh_token",
                    str(refresh),
                    httponly=True,
                    secure=True,
                    samesite="Lax",
                )
                return response
            return Response(
                {"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )


class Session2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.session["2fa_verified"] = True
        request.session.modified = True
        return Response({"message": "2FA session stored successfully."}, status=200)


class AuthenticateMatchPlayerView(APIView):
    # NOTE: Ensures credentials and player match to prevent unauthorized authentication.
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        player_name = request.data.get("player_name")
        if not all([username, password, player_name]):
            return Response(
                {"error": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)
        if user is not None:
            try:
                player = Player.objects.get(player=player_name)
                if player.user != user:
                    return Response(
                        {"error": "Player name does not match authenticated user."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
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
        return Response(
            {"error": "Invalid credentials", "success": False},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class AuthenticateTournamentPlayerView(APIView):
    # NOTE: Validates credentials and tournament participation for secure player authentication.
    def post(self, request, tournament_id):
        username = request.data.get("username")
        password = request.data.get("password")
        player_name = request.data.get("player_name")
        if not all([username, password, player_name]):
            return Response(
                {"error": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)
        if user is not None:
            try:
                player = Player.objects.get(player=player_name)
                if player.user != user:
                    return Response(
                        {"error": "Player name does not match authenticated user."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
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
        return Response(
            {"error": "Invalid credentials", "success": False},
            status=status.HTTP_401_UNAUTHORIZED,
        )
