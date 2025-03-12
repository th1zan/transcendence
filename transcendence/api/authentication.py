import logging

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


class CookieJWTAuthentication(JWTAuthentication):
    # NOTE: Logs authentication attempts and enforces secure token validation.
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get("access_token")
            if not raw_token:
                logger.debug("No access token found in cookies.")
                return None  # No token provided, proceed without authentication
        else:
            raw_token = self.get_raw_token(header)
            if not raw_token:
                logger.debug("No raw token extracted from header.")
                return None

        try:
            # Validate the token using JWTAuthentication's built-in method
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)

            # Ensures only active users can authenticate, preventing access with disabled accounts
            if not user.is_active:
                logger.warning(
                    f"Authentication failed: User {user.username} is inactive."
                )
                raise AuthenticationFailed("User account is disabled.")

            # Enforces 2FA verification with session check to enhance security
            if user.is_2fa_enabled:
                if not request.session.get("2fa_verified"):
                    logger.info(
                        f"2FA required for user {user.username} but not verified."
                    )
                    raise AuthenticationFailed(
                        "2FA verification required. Please verify OTP."
                    )
                # timeout for 2FA session verification
                last_2fa_time = request.session.get("2fa_verified_time")
                if (
                    last_2fa_time
                    and (timezone.now().timestamp() - last_2fa_time) > 3600
                ):  # 1 hour timeout
                    logger.info(f"2FA session expired for user {user.username}.")
                    del request.session["2fa_verified"]
                    raise AuthenticationFailed(
                        "2FA session expired. Please re-verify OTP."
                    )

            logger.info(f"User {user.username} authenticated successfully.")
            return user, validated_token

        except InvalidToken as e:
            logger.warning(f"Invalid token provided: {str(e)}")
            raise AuthenticationFailed("Invalid or expired token.") from e
        except TokenError as e:
            logger.error(f"Token processing error: {str(e)}")
            raise AuthenticationFailed("Token processing failed.") from e
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {str(e)}")
            raise AuthenticationFailed(
                "Authentication failed due to an internal error."
            ) from e
