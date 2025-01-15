import logging
import uuid  # Pour générer un pseudonyme aléatoire

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PongMatch
from .serializers import PongMatchSerializer, PongSetSerializer

logger = logging.getLogger(__name__)


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


class UserRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 3:  # Exemple de vérification pour un mot de passe trop court
            return Response(
                {"error": "Password must be at least 3 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create(
            username=username, password=make_password(password))

        # Génération du token JWT refresh = RefreshToken.for_user(user)
        refresh = RefreshToken.for_user(user)

        response = Response(
            {"success": "User created successfully."}, status=status.HTTP_201_CREATED)

        # Configuration du cookie sécurisé avec le token d'accès
        response.set_cookie('access_token', str(
            refresh.access_token), httponly=True, secure=True, samesite='Strict')

        # Implémentation 2FA ici. Envoie code sms ou email

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


class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
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
