     from rest_framework import serializers
     from .models import PongResult

     class PongResultSerializer(serializers.ModelSerializer):
         class Meta:
             model = PongResult
             fields = '__all__'
