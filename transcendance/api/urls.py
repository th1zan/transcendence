from django.urls import path
from .views import PongResultList, PongResultDetail
from rest_framework_simplejwt.views import (
         TokenObtainPairView,
         TokenRefreshView,
     )

urlpatterns = [
    path('api/results/', PongResultList.as_view(), name='pongresult-list'),
    path('api/results/<int:pk>/', PongResultDetail.as_view(), name='pongresult-detail'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
