class PongAI:

	def __init__(self):
		self.ball= [0,0]
		self.vel = [0,0]
		self.paddle = [0, 0]
		self.level = 0
		self.score = [0,0]
		self.pred_y = 0

		self.agressivness = 0.1
		self.touches = 0
		self.precision = 0.1
		self.reactivity = 0.1

		self.timer	= 0
		self.movement_accumulator = 0

		self.canvas_height = 0
		self.canvas_width = 0
		self.paddle_height = 0
		self.fps = 0
		self.step = 0
		self.control = 0

	def start(self, canvas_height, canvas_width, paddle_height, fps, step, control):
		self.canvas_height = canvas_height
		self.canvas_width = canvas_width
		self.paddle_height = paddle_height
		self.fps = fps
		self.step = step
		self.control = control

		self.paddle = [0, canvas_height/2 - paddle_height/2]

	def reset(self):
		self.paddle = [0, self.canvas_height/2 - self.paddle_height/2]
		self.timer = 0

	def update(self, ball_x, ball_y, vel_x, vel_y):

		if self.timer <= 0:
			self.timer = 1
			self.ball[0] = ball_x
			self.ball[1] = ball_y
			self.vel[0] = vel_x
			self.vel[1] = vel_y

			self.pred_y = self.impact()

		#self.think()
		self.move()
		self.timer -= 1 / self.fps
		return self.paddle[1]
	
	def impact(self):
		# Distance jusqu'à la raquette
		distance_x = self.canvas_width - 10 - self.ball[0]  # TABLE_WIDTH - PADDLE_WIDTH - ball_x
		
		# Temps avant impact
		if self.vel[0] != 0:  # Éviter division par zéro
			time_to_impact = distance_x / self.vel[0]
			
			# Position Y projetée à l'impact
			impact_y = self.ball[1] + (self.vel[1] * time_to_impact)
			
			# Gestion des rebonds
			board_top = 0
			board_bottom = 400
			bounces = 0
			
			while (impact_y < board_top or impact_y > board_bottom) and bounces < 10:
				if impact_y < board_top:
					# Rebond contre le haut
					impact_y = abs(impact_y)
				elif impact_y > board_bottom:
					# Rebond contre le bas
					impact_y = board_bottom - (impact_y - board_bottom)
				bounces += 1
				
			return impact_y
		return self.ball[1]  # Retourne la position actuelle si vitesse horizontale nulle
			
	
	def think(self): 
		pass

	def move(self):
		# Distance entre la position actuelle de la raquette et la position cible (balle)
		distance = self.pred_y - self.paddle[1] - self.movement_accumulator - 40
		
		# Vitesse maximale de déplacement de la raquette
		paddle_speed = 20
		
		# Déplacement progressif vers la balle avec un facteur de lissage
		move_amount = distance * 0.1
		
		# Limiter le déplacement à la vitesse maximale
		if move_amount > paddle_speed:
			move_amount = paddle_speed
		elif move_amount < -paddle_speed:
			move_amount = -paddle_speed
		new_position = self.paddle[1]
		# Mettre à jour la position en s'assurant de ne pas sortir des limites du terrain
		self.movement_accumulator += move_amount
		if abs(self.movement_accumulator) >= 20:
			direction = 1 if self.movement_accumulator > 0 else -1
			new_position = self.paddle[1] + direction * 20
			self.movement_accumulator = 0
		
		# Vérifier les limites (en supposant une hauteur de raquette de 80 et une hauteur de terrain de 400)
		if new_position < 0:
			new_position = 0
		elif new_position > 400 - 80:
			new_position = 400 - 80
		
		# Appliquer la nouvelle position
		if self.vel[0] > 0:
			self.paddle[1] = new_position
