from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PongResult
from .serializers import PongResultSerializer


class PongResultList(generics.ListCreateAPIView):
    queryset = PongResult.objects.all()
    serializer_class = PongResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user1', 'user2']
    permission_classes = [IsAuthenticated]


class PongResultDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongResult.objects.all()
    serializer_class = PongResultSerializer
    permission_classes = [IsAuthenticated]


class UserSignupView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            username=username,
            password=make_password(password)
        )

        return Response({'success': 'User created successfully.'}, status=status.HTTP_201_CREATED)
