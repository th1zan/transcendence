class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        match_data = request.data
        sets_data = match_data.pop("sets", [])

        # Convertir les noms en objets User et Player
        try:
            user1 = get_object_or_404(User, username=match_data['user1'])
            user2 = get_object_or_404(User, username=match_data['user2']) if match_data['user2'] else None
            player1 = get_object_or_404(Player, name=match_data['player1'])
            player2 = get_object_or_404(Player, name=match_data['player2'])
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Remplacer les noms par des identifiants dans match_data
        match_data['user1'] = user1.id
        match_data['user2'] = user2.id if user2 else None
        match_data['player1'] = player1.id
        match_data['player2'] = player2.id

        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            for set_data in sets_data:
                # Associe le match ID à chaque set
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
