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
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Import ajusté selon l'arborescence
from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player, TournamentPlayer

logger = logging.getLogger(__name__)

CustomUser = get_user_model()  # Utilisé quand nécessaire


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
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # À passer à True en production
                samesite="Lax",
            )
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


class CustomTokenValidateView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token = request.COOKIES.get("access_token")
        if not token:
            logger.warning("No access token found in cookies.")
            return Response(
                {"detail": "Access token not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("exp") <= int(time.time()):
                logger.warning("Token has expired.")
                return Response(
                    {"detail": "Token has expired."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
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
            user = request.user
            user.is_online = False  # Set user as offline
            user.update_last_seen()
            user.save()

            request.session.flush()  # Removes all session data, including "2fa_verified"

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
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        otp_code = request.data.get("otp_code")

        # If user is disabling 2FA
        if user.is_2fa_enabled:
            user.is_2fa_enabled = False
            user.otp_secret = None
            user.save()
            return Response(
                {"message": "2FA disabled successfully."}, status=status.HTTP_200_OK
            )

        # Check if user has an email before enabling 2FA
        if not user.email:
            return Response(
                {"error": "Email is required for 2FA.", "need_email": True},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle OTP verification for enabling 2FA
        if otp_code:
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


class Verify2FALoginView(APIView):
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


class Session2FAView(APIView):
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
