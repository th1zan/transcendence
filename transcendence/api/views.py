import logging
import uuid # Pour générer un pseudonyme aléatoire

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
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

# class LoginView(APIView):
#     def post(self, request):
#         username = request.data.get("username")
#         password = request.data.get("password")

#         user = authenticate(username=username, password=password)
#         if user is None:
#             return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

#         refresh = RefreshToken.for_user(user)
#         access_token = str(refresh.access_token)

#         response = JsonResponse({"detail": "Login successful."})
#         response.set_cookie(
#             key="access_token",
#             value=access_token,
#             httponly=True,
#             secure=True,  # Set to True in production (requires HTTPS)
#             samesite="Strict",  # Adjust SameSite attribute based on your needs
#         )
#         response.set_cookie(
#             key="refresh_token",
#             value=str(refresh),
#             httponly=True,
#             secure=True,  # Set to True in production (requires HTTPS)
#             samesite="Strict",
#         )

#         return response

class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            response = JsonResponse({'message': 'Login successful'})
            response.set_cookie(
                key='access_token',
                value=tokens['access'],
                httponly=True,
                secure=False,  # Set to True in production
                samesite='Lax'
            )
            # response.set_cookie(
            #     key='refresh_token',
            #     value=tokens['refresh'],
            #     httponly=True,
            #     secure=False,  # Set to True in production
            #     samesite='Lax'
            # )
        return response

class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            response = JsonResponse({'message': 'Token refreshed successfully'})
            response.set_cookie(
                key='access_token',
                value=tokens['access'],
                httponly=True,
                secure=False,  # Set to True in production
                samesite='Lax'
            )
        return response

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

        user = User.objects.create(username=username, password=make_password(password))

        return Response(
            {"success": "User created successfully."}, status=status.HTTP_201_CREATED
        )

  
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            response = JsonResponse({"detail": "Logout successful."})
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# # working function with local storage
# class LogoutView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         try:
#             # Authenticate user using the provided access token
#             auth = JWTAuthentication()
#             user, token = auth.authenticate(request)
#             if user is None or token is None:
#                 return Response({"error": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)

#             # Optional: Add logic to mark user as logged out (if applicable)
#             # Example: Logout event logging or user session invalidation
            
#             return Response({"detail": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
# class LogoutView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         refresh_token = request.data.get("refresh")
#         if not refresh_token:
#             return Response({"error": "No refresh token provided."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             token = RefreshToken(refresh_token)
#             token.blacklist()  # Blacklist the refresh token
#             return Response({"detail": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def delete(self, request):
        user = request.user
        if user.is_authenticated:
            # Delete related game history or other data before deleting the user
            # Generate a random pseudonym for the deleted user
            random_username = f"deleteduser_{uuid.uuid4().hex[:12]}"

            # Update matches where the user is user1 only
            PongMatch.objects.filter(user1=user.username).update(user1=random_username)
            
            user.delete()  # Deletes the user from the database
            return Response(
                {"success": "Compte supprimé avec succès."}, 
                status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED
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


class TournamentCreationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        tournament_data = request.data.get("tournament_name")
        players_data = request.data.get("players", [])

        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the tournament
        tournament_serializer = TournamentSerializer(
            data={"tournament_name": tournament_data, "date": timezone.now().date()}
        )
        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save()

            # Create or retrieve Player entries and link them to the tournament
            for player_pseudo in players_data:
                player, created = Player.objects.get_or_create(pseudo=player_pseudo)
                TournamentPlayer.objects.create(player=player, tournament=tournament)

            return Response(
                {"message": "Tournament and players added successfully"},
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                tournament_serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )
