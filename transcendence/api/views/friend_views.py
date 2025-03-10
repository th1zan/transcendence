import logging
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, FriendRequest, Notification

logger = logging.getLogger(__name__)


def get_avatar_url(user):
    if user.avatar:
        if user.avatar.url.startswith(settings.MEDIA_URL):
            return user.avatar.url
        return settings.MEDIA_URL + user.avatar.url.lstrip('/')
    else:
        return settings.MEDIA_URL + "avatars/avatar1.png"


class ListFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        friends = user.friends.all()
        friends_data = [
            {
                "username": friend.username,
                "avatar": get_avatar_url(friend),
            }
            for friend in friends
        ]
        return Response({"friends": friends_data})


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Validates input to prevent unauthorized friend removal.
    def delete(self, request):
        friend_username = request.data.get("username")
        if not friend_username:
            return Response(
                {"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        current_user = request.user
        friend_user = get_object_or_404(CustomUser, username=friend_username)
        if friend_user not in current_user.friends.all():
            return Response(
                {"error": "This user is not in your friend list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_user.friends.remove(friend_user)
        friend_user.friends.remove(current_user)
        FriendRequest.objects.filter(sender=current_user, receiver=friend_user).delete()
        FriendRequest.objects.filter(sender=friend_user, receiver=current_user).delete()
        return Response(
            {"message": f"{friend_username} has been removed from your friend list."},
            status=status.HTTP_200_OK,
        )


class FriendsOnlineStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        friends = current_user.friends.all()
        friends_status = [
            {
                "username": friend.username,
                "is_online": friend.is_online,
                "last_seen": (
                    friend.last_seen.strftime("%Y-%m-%d %H:%M")
                    if friend.last_seen
                    else "Never"
                ),
            }
            for friend in friends
        ]
        return Response({"friends_status": friends_status}, status=status.HTTP_200_OK)


class SendFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Ensures valid receiver and prevents duplicate requests.
    def post(self, request):
        receiver_username = request.data.get("username")
        if not receiver_username:
            return Response(
                {"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            receiver = CustomUser.objects.get(username=receiver_username)
            if FriendRequest.objects.filter(
                sender=request.user, receiver=receiver, status="pending"
            ).exists():
                return Response(
                    {"error": "Friend request already sent."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if receiver in request.user.friends.all():
                return Response(
                    {"error": "You are already friends with this user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            FriendRequest.objects.create(
                sender=request.user, receiver=receiver
            )
            Notification.objects.create(
                user=receiver,
                message=f"{request.user.username} sent you a friend request.",
                notification_type="friend_request",
            )
            
            return Response(
                {"message": "Friend request sent."}, status=status.HTTP_200_OK
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "game.userNotFound"}, status=status.HTTP_404_NOT_FOUND
            )


class ViewFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friend_requests = FriendRequest.objects.filter(
            receiver=request.user, status="pending"
        )
        requests_data = [
            {
                "sender": fr.sender.username,
                "avatar": get_avatar_url(fr.sender),
            }
            for fr in friend_requests
        ]
        return Response({"requests": requests_data}, status=200)


class RespondToFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Validates action input to ensure secure request handling.
    def post(self, request):
        sender_username = request.data.get("username")
        action = request.data.get("action")
        if not sender_username or action not in ["accept", "decline"]:
            return Response(
                {"error": "Invalid action. Use 'accept' or 'decline'."}, status=400
            )

        try:
            friend_request = FriendRequest.objects.get(
                sender__username=sender_username,
                receiver=request.user,
                status="pending",
            )
            if action == "accept":
                request.user.friends.add(friend_request.sender)
                friend_request.sender.friends.add(request.user)
                friend_request.status = "accepted"
                message = f"You are now friends with {sender_username}!"
            else:
                friend_request.status = "declined"
                message = f"You have declined {sender_username}'s friend request."
                Notification.objects.create(
                    user=friend_request.sender,
                    message=f"{request.user.username} declined your friend request.",
                    notification_type="friend_request_declined",
                )
            friend_request.save()
            return Response({"message": message}, status=200)
        except FriendRequest.DoesNotExist:
            return Response({"error": "Friend request not found."}, status=404)
