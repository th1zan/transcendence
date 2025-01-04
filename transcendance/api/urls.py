from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScoreViewSet, UserCreate
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'scores', ScoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obten_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('signup/', UserCreate.as_view(), name='user_signup'),
]
