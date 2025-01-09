from rest_framework import serializers

from .models import \
    PongResult  # Assurez-vous que le modèle est correctement importé


class PongResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongResult
        fields = '__all__'  # Ou les champs spécifiques que vous souhaitez inclure
