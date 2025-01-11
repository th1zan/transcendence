from django.contrib.auth.models import Permission, User
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def assign_default_permissions(sender, instance, created, **kwargs):
    if created:
        # Liste des codenames des permissions à attribuer
        permissions = [
            "add_pongmatch",
            "change_pongmatch",
            "delete_pongmatch",
            "view_pongmatch",
            "add_pongresult",
            "change_pongresult",
            "delete_pongresult",
            "view_pongresult",
            "add_pongset",
            "change_pongset",
            "delete_pongset",
            "view_pongset",
        ]
        for perm in permissions:
            try:
                permission = Permission.objects.get(codename=perm)
                # Assurez-vous que c'est bien écrit ainsi
                instance.user_permissions.add(permission)
            except Permission.DoesNotExist:
                # All permisisons in DB:
                print(f"Permission '{perm}' does not exist.")


#
# add_pongmatch Can add pong match
# change_pongmatch Can change pong match
# delete_pongmatch Can delete pong match
# view_pongmatch Can view pong match
# add_pongresult Can add pong result
# change_pongresult Can change pong result
# delete_pongresult Can delete pong result
# view_pongresult Can view pong result
# add_pongset Can add pong set
# change_pongset Can change pong set
# delete_pongset Can delete pong set
# view_pongset Can view pong set
