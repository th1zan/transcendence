from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import PongResult
from .serializers import PongResultSerializer

class PongResultList(generics.ListCreateAPIView):
    queryset = PongResult.objects.all()
    serializer_class = PongResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user1', 'user2']

class PongResultDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongResult.objects.all()
    serializer_class = PongResultSerializer
