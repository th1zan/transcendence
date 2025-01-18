#from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import \
    PongMatch  # Assurez-vous que le modèle est correctement importé
from .models import PongSet


class PongMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongMatch
        fields = "__all__"


class PongSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongSet
        fields = "__all__"

User = get_user_model()
class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]  #"id",
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_password(self, value):
        if len(value) < 3:  # minimum 3 caractères pour dev
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 3 caractères."
            )
        return value
    
    def create(self, validated_data):
        password = validated_data.pop("password", None)  # Extract password from validated data
        instance = self.Meta.model(**validated_data) # Create a new user instance
        if password is not None:
            instance.set_password(password) # hash the password
        instance.save() # Save the user instance
        return instance