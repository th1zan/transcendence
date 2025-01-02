from rest_framework import serializers
from .models import Score

class ScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Score
        fields = ['id', 'name', 'value']
    
    # EXAMPLE: validation function 
    # def validate_value(self, value):
    #     if value < 0:
    #         raise serializers.ValidationError("La valeur doit être positive.")
    #     return value
