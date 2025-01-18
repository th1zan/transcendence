import logging
import uuid  # Pour générer un pseudonyme aléatoire
import jwt
import datetime

from django.contrib.auth.hashers import make_password
#from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView


from .models import PongMatch, User
from .serializers import PongMatchSerializer, PongSetSerializer, UserRegisterSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

class PongMatchList(generics.ListCreateAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user1", "user2"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user1 = self.request.query_params.get("user1")
        user2 = self.request.query_params.get("user2")

        if user1 and user2:
            return queryset.filter(Q(user1=user1) | Q(user2=user2))
        elif user1:
            return queryset.filter(Q(user1=user1) | Q(user2=user1))
        elif user2:
            return queryset.filter(Q(user1=user2) | Q(user2=user2))
        return queryset


class PongMatchDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    permission_classes = [IsAuthenticated]


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.set_cookie(
                key="access_token",
                value=response.data["access"],
                httponly=True,
                secure=True,  # Activez cela en production avec HTTPS
                samesite="Lax",
            )
        return response


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save(password=make_password(serializer.validated_data["password"]))
            # Génération du token JWT 
            refresh = RefreshToken.for_user(user)

            response = Response(
                {"success": "User created successfully."}, status=status.HTTP_201_CREATED
            )

            # Configuration du cookie sécurisé avec le token d'accès
            response.set_cookie(
                "access_token",
                str(refresh.access_token),
                httponly=True, # Empêche JavaScript d'accéder au cookie
                secure=False,  # Set to True in production with HTTPS
                samesite="Strict",
            )

        # Implémentation 2FA ici. Envoie code sms ou email
            return response

        # Return validation errors from serializer
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    parser_classes = [JSONParser]
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            raise AuthenticationFailed("Nom d'utilisateur et mot de passe requis.")

        # Debug log
        logger.debug(f"Username: {username}, Password: {password}")

        user = User.objects.filter(username=username).first()

        if user is None:
            logger.error(f"User not found: {username}")
            raise AuthenticationFailed("Utilisateur non trouvé.")

        if not user.check_password(password):
            logger.error(f"Incorrect password for user: {username}")
            raise AuthenticationFailed("Mot de passe incorrect.")

        #return Response({"success": "Logged in successfully."}, status=200)
        payload = {
            "id": user.id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=60),
            "iat": datetime.datetime.utcnow(),
        }

        token = jwt.encode(payload, "secret", algorithm="HS256") #.decode("utf-8") - ne need in newer versions

        response = Response({"message": "Login successful."})
        response.set_cookie(key="jwt", value=token, httponly=True)
        response.data = ({"jwt": token})
        return response

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        token = request.COOKIES.get("jwt")

        if not token:
            raise AuthenticationFailed("Non authentifié.")
        
        try:
            payload = jwt.decode(token, "secret", algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Non authentifié.")
        
        user = User.objects.filter(id=payload["id"]).first()
        serializer = UserRegisterSerializer(user)
        return Response(serializer.data)
    

class LogoutView(APIView):
    def post(self, request):
        response = Response()
        response.delete_cookie("jwt")
        response.data = {
            "message": "Déconnexion réussie."
        }
        return response

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def delete(self, request):
        user = request.user
        if user.is_authenticated:
            # Delete related game history or other data before deleting the user
            # Generate a random pseudonym for the deleted user
            random_username = f"deleteduser_{uuid.uuid4().hex[:12]}"

            # Update matches where the user is user1 only
            PongMatch.objects.filter(user1=user.username).update(
                user1=random_username)

            user.delete()  # Deletes the user from the database
            return Response(
                {"success": "Compte supprimé avec succès."}, status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@method_decorator(
    csrf_exempt, name="dispatch"
)  # Considérez la suppression si vous gérez le CSRF correctement
class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        match_data = request.data
        sets_data = match_data.pop("sets", [])

        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            for set_data in sets_data:
                # Associe le match ID à chaque set
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
