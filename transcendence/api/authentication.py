from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class CookieJWTAuthentication(JWTAuthentication):
    
    def authenticate(self, request):
        # Retrieve token from the "access_token" cookie
        raw_token = request.COOKIES.get("access_token")
        if not raw_token:
            return None  # No token in cookie, skip authentication
        try:
            # Validate the token
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except Exception as e:
            raise AuthenticationFailed(f"Invalid token: {e}")
        