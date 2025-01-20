from django.contrib.auth.models import User
from rest_framework import serializers

from .models import PongMatch  # Assurez-vous que le modèle est correctement importé
from .models import PongSet


class PongMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongMatch
        fields = "__all__"


class PongSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongSet
        fields = "__all__"


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "password")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_password(self, value):
        if len(value) < 3:  # minimum 3 caractères pour dev
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 3 caractères."
            )
        return value
