from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Score


class ScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Score
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Utilisation de create_user pour gérer le hachage du mot de passe
        user = User.objects.create_user(**validated_data)
        return user
