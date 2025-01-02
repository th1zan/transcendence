from django.urls import path
from . import views
from .views import MyLoginView
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name = 'profile'),
    path('login/', MyLoginView.as_view(), name = 'login'),
]
