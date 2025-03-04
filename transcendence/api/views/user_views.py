import logging
import os

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

# Import ajusté selon l'arborescence
from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player
from ..serializers import ChangePasswordSerializer, UserRegisterSerializer

logger = logging.getLogger(__name__)

CustomUser = get_user_model()  # Utilisé quand nécessaire


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def post(self, request):
        logger.info("Received data: %s", request.data)
        serializer = self.serializer_class(data=request.data)
        logger.info("Serializer validation result: %s", serializer.is_valid())

        if not serializer.is_valid():
            logger.error("Validation errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.create_user(
                username=serializer.validated_data.get("username"),
                password=serializer.validated_data.get("password"),
                privacy_policy_accepted=serializer.validated_data.get(
                    "privacy_policy_accepted"
                ),
            )
            logger.info("User created: %s", user.username)

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


class AnonymizeAccountView(APIView):
    permission_classes = [IsAuthenticated]

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
            if hasattr(user, "friend_list"):
                user.friend_list.clear()
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

            return Response(
                {"message": f"Your account has been anonymized as {anonymous_name}."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        deleted_name = f"Deleted_User"

        PongMatch.objects.filter(user1=user).update(user1=None)
        PongMatch.objects.filter(user2=user).update(user2=None)

        player = Player.objects.filter(user=user).first()
        if player:
            player.player = "Deleted_User"
            player.user = None
            player.save()

        user.delete()

        return Response(
            {"message": "Your account has been permanently deleted."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

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
                secure=False,
                samesite="Lax",
                max_age=600,  # 10 minutes
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=86400,  # 24 hours
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

        if "email" in data:
            email = data["email"]
            existing_user = (
                CustomUser.objects.filter(email=email).exclude(id=user.id).first()
            )
            if existing_user:
                return Response(
                    {"error": "This email is already in use."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = email
        else:
            user.email = None

        if "phone_number" in data:
            phone_number = data["phone_number"]
            if phone_number:
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
                user.phone_number = None

        if "username" in data:
            user.username = data["username"]

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
                secure=False,
                samesite="Lax",
                max_age=3600,
            )  # 1 hour
            response.set_cookie(
                "refresh_token",
                str(refresh),
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=86400,
            )  # 24 hours
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

        if user.avatar and user.avatar.name != "avatars/default.png":
            old_avatar_path = os.path.join(settings.MEDIA_ROOT, user.avatar.name)
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)

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

    def delete(self, request):
        user = request.user

        if (
            hasattr(user, "avatar")
            and user.avatar
            and user.avatar.name != "avatars/default.png"
        ):
            avatar_path = os.path.join(settings.MEDIA_ROOT, user.avatar.name)

            if os.path.exists(avatar_path):
                os.remove(avatar_path)

            user.avatar.name = "avatars/default.png"
            user.save(update_fields=["avatar"])

            return Response(
                {
                    "message": "Avatar deleted successfully.",
                    "avatar_url": "/media/avatars/default.png",
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "message": "No custom avatar to delete.",
                    "avatar_url": "/media/avatars/default.png",
                },
                status=status.HTTP_200_OK,
            )
