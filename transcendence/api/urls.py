from django.urls import path
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from .views import PongResultDetail, PongResultList, UserSignupView

urlpatterns = [
    path('results/', PongResultList.as_view(), name='pongresult-list'),
    path('results/<int:pk>/', PongResultDetail.as_view(),
         name='pongresult-detail'),
    path('auth/login/', TokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('signup/', UserSignupView.as_view(), name='user_signup'),
]
