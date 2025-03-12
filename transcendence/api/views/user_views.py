import logging
import os
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from django.http import JsonResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player, PongMatch
from ..serializers import ChangePasswordSerializer, UserRegisterSerializer

logger = logging.getLogger(__name__)
CustomUser = get_user_model()


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    # NOTE: Ensures secure user creation with validated input.
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.create_user(
                username=serializer.validated_data.get("username"),
                password=serializer.validated_data.get("password"),
                privacy_policy_accepted=serializer.validated_data.get(
                    "privacy_policy_accepted"
                ),
            )
            Player.objects.create(
                user=user, player=serializer.validated_data.get("username")
            )
            return Response(
                {"success": "User and player created successfully."},
                status=status.HTTP_201_CREATED,
            )
        except IntegrityError:
            return Response(
                {"error": "Username already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AnonymizeAccountView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Securely anonymizes user data and clears sensitive information.
    def post(self, request):
        user = request.user
        if user.is_authenticated:
            anonymous_name = f"Anonymized_User_{uuid.uuid4().hex[:5]}"

            Player.objects.filter(user=user).update(player=anonymous_name)

            user.username = anonymous_name

            if hasattr(user, "email"):
                user.email = None
            if hasattr(user, "first_name"):
                user.first_name = "Anonymous"
            if hasattr(user, "last_name"):
                user.last_name = "User"
            if hasattr(user, "phone_number"):
                user.phone_number = None
            if hasattr(user, "friends"):
                user.friends.clear()
            if hasattr(user, "is_online"):
                user.is_online = False
            if hasattr(user, "last_seen"):
                user.last_seen = None

            if hasattr(user, "avatar") and user.avatar:
                try:
                    if (
                        user.avatar.name
                        and user.avatar.name != "avatars/default.png"
                        and os.path.exists(user.avatar.path)
                    ):
                        os.remove(user.avatar.path)
                except Exception as e:
                    print(f"Error deleting avatar file: {e}")
                user.avatar.name = "avatars/default.png"

            user.is_active = False
            user.date_joined = None
            user.set_unusable_password()
            user.save()

            request.session.flush()

            response = JsonResponse(
                {"message": f"Your account has been anonymized as {anonymous_name}."},
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            response.delete_cookie("sessionid")
            response.delete_cookie("csrftoken")

            return response

        return Response(
            {"message": "Authentication required to anonymize account."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Ensures secure deletion by disassociating user data before removal.
    def delete(self, request):
        user = request.user
        PongMatch.objects.filter(user1=user).update(user1=None)
        PongMatch.objects.filter(user2=user).update(user2=None)
        player = Player.objects.filter(user=user).first()
        if player:
            unique_deleted_name = f"Deleted_User_{player.id}"
            player.player = unique_deleted_name
            player.user = None
            player.save()
        user.delete()

        response = JsonResponse(
            {"message": "Your account has been deleted, and cookies are cleared."},
            status=200,
        )
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        response.delete_cookie("sessionid")
        response.delete_cookie("csrftoken")

        return response


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Uses serializer for secure password change and updates tokens.
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            refresh = RefreshToken.for_user(user)
            response = Response(
                {"message": "Password changed successfully"}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=600,
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=86400,
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
        user = request.user
        data = request.data

        # Vérifications de longueur (de main)
        if "email" in data and data["email"] and len(data["email"]) > 255:
            return Response(
                {"error": "Email address is too long. Maximum 255 characters allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            "phone_number" in data
            and data["phone_number"]
            and len(data["phone_number"]) > 16
        ):
            return Response(
                {"error": "Phone number is too long. Maximum 16 characters allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "username" in data and len(data["username"]) > 255:
            return Response(
                {"error": "Username is too long. Maximum 255 characters allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mise à jour des champs avec vérification d’unicité
        if "email" in data:
            email = data["email"]
            if email:  # Vérifie si non vide
                if CustomUser.objects.filter(email=email).exclude(id=user.id).exists():
                    return Response(
                        {"error": "This email is already in use."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.email = email
            else:
                user.email = None

        if "phone_number" in data:
            phone_number = data["phone_number"]
            if phone_number:  # Vérifie si non vide
                if (
                    CustomUser.objects.filter(phone_number=phone_number)
                    .exclude(id=user.id)
                    .exists()
                ):
                    return Response(
                        {"error": "This phone number is already in use."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.phone_number = phone_number
            else:
                user.phone_number = None

        if "username" in data:
            username = data["username"]
            # Vérification d’unicité (optionnelle, inspirée de main)
            if (
                CustomUser.objects.filter(username=username)
                .exclude(id=user.id)
                .exists()
            ):
                return Response(
                    {"error": "This username is already taken."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.username = username
            
            # update the player field in the associated Player model
            try:
                player = Player.objects.get(user=user)
                player.player = username
                player.save()
            except Player.DoesNotExist:
                # If player doesn't exist, create one
                Player.objects.create(user=user, player=username)

        try:
            user.save()
            refresh = RefreshToken.for_user(user)
            response = Response(
                {"message": "Profile updated successfully!"}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=3600,
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=86400,
            )
            return response
        except IntegrityError:
            return Response(
                {"error": "Username already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    # NOTE: Restricts file types to prevent malicious uploads.
    def post(self, request, *args, **kwargs):
        user = request.user
        if "avatar" not in request.FILES:
            return Response(
                {"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST
            )

        file_obj = request.FILES["avatar"]
        file_extension = os.path.splitext(file_obj.name)[-1].lower()
        allowed_extensions = {".jpg", ".jpeg", ".png"}
        if file_extension not in allowed_extensions:
            return Response(
                {"error": "Invalid file type. Only JPG, JPEG, and PNG are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_filename = f"user_{user.id}{file_extension}"
        avatar_path = f"avatars/{new_filename}"
        if (
            user.avatar
            and user.avatar.name != "avatars/default.png"
            and os.path.exists(user.avatar.path)
        ):
            os.remove(user.avatar.path)
        user.avatar.save(avatar_path, file_obj)
        user.save(update_fields=["avatar"])
        return Response(
            {
                "message": "Profile picture updated successfully.",
                "avatar_url": user.avatar.url,
            },
            status=status.HTTP_200_OK,
        )


class DeleteAvatarView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Securely resets avatar to default and removes old file.
    def delete(self, request):
        user = request.user
        if (
            user.avatar
            and user.avatar.name != "avatars/default.png"
            and os.path.exists(user.avatar.path)
        ):
            os.remove(user.avatar.path)
            user.avatar.name = "avatars/default.png"
            user.save(update_fields=["avatar"])
            return Response(
                {
                    "message": "Avatar deleted successfully.",
                    "avatar_url": "/media/avatars/default.png",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "message": "No custom avatar to delete.",
                "avatar_url": "/media/avatars/default.png",
            },
            status=status.HTTP_200_OK,
        )
