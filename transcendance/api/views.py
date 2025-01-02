from rest_framework import viewsets
from .models import Score
from .serializer import ScoreSerializer

class ScoreViewSet(viewsets.ModelViewSet):
    queryset = Score.objects.all()
    serializer_class = ScoreSerializer
