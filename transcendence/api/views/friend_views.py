import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Import ajusté selon l'arborescence
from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, FriendRequest, Notification

logger = logging.getLogger(__name__)


class ListFriendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        friends = user.friends.all()
        friends_data = [
            {
                "username": friend.username,
                "avatar": (
                    request.build_absolute_uri(friend.avatar.url)
                    if friend.avatar
                    else request.build_absolute_uri("/media/avatars/avatar1.png")
                ),
            }
            for friend in friends
        ]
        return Response({"friends": friends_data})


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

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

    def post(self, request):
        receiver_username = request.data.get("username")
        try:
            receiver = CustomUser.objects.get(username=receiver_username)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

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

        friend_request = FriendRequest.objects.create(
            sender=request.user, receiver=receiver
        )

        Notification.objects.create(
            user=receiver,
            message=f"{request.user.username} sent you a friend request.",
            notification_type="friend_request",
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{receiver.id}",
            {
                "type": "send_notification",
                "content": {
                    "message": f"{request.user.username} sent you a friend request.",
                    "notification_type": "friend_request",
                },
            },
        )
        return Response({"message": "Friend request sent."}, status=status.HTTP_200_OK)


class ViewFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friend_requests = FriendRequest.objects.filter(
            receiver=request.user, status="pending"
        )
        requests_data = [
            {
                "sender": fr.sender.username,
                "avatar": (
                    request.build_absolute_uri(fr.sender.avatar.url)
                    if fr.sender.avatar
                    else request.build_absolute_uri("/media/avatars/avatar1.png")
                ),
            }
            for fr in friend_requests
        ]

        return Response({"requests": requests_data}, status=200)


class RespondToFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sender_username = request.data.get("username")
        action = request.data.get("action")  # 'accept' or 'decline'

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
        except FriendRequest.DoesNotExist:
            return Response({"error": "Friend request not found."}, status=404)

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
