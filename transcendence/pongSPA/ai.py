import random

class PongAI:

	def __init__(self):
		self.ball= [0,0]
		self.vel = [0,0]
		self.paddle = [0, 0]
		self.level = 0
		self.score = [0,0]
		self.pred_y = 0

		self.touch = 0
		self.handicap = 0 # erreur en pixel

		self.timer	= 0
		self.movement_accumulator = 0

		self.canvas_height = 0
		self.canvas_width = 0
		self.paddle_height = 0
		self.fps = 0
		self.step = 0
		self.control = 0

	def start(self, canvas_height, canvas_width, paddle_height, paddle_width, fps, step, control):
		self.canvas_height = canvas_height
		self.canvas_width = canvas_width
		self.paddle_height = paddle_height
		self.paddle_width = paddle_width
		self.fps = fps
		self.step = step
		self.control = control

		self.paddle = [0, canvas_height/2 - paddle_height/2]

		self.set_handicap()

	def reset(self):
		self.paddle = [0, self.canvas_height/2 - self.paddle_height/2]
		self.timer = 0
		self.touch = 0

		self.set_handicap()

	def update(self, ball_x, ball_y, vel_x, vel_y):

		if self.timer <= 0:
			self.timer = 1
			self.ball[0] = ball_x
			self.ball[1] = ball_y
			self.vel[0] = vel_x
			self.vel[1] = vel_y

			self.pred_y = self.impact() + self.handicap

		self.move()
		self.timer -= 1 / self.fps
		return self.paddle[1]
	
	def impact(self):
		# Distance jusqu'à la raquette
		distance_x = self.canvas_width - self.paddle_width - self.ball[0]
		
		# Temps avant impact
		if self.vel[0] != 0:  # Éviter division par zéro
			time_to_impact = distance_x / self.vel[0]
			
			# Position Y projetée à l'impact
			impact_y = self.ball[1] + (self.vel[1] * time_to_impact)
			
			# Gestion des rebonds
			board_top = 0
			board_bottom = self.canvas_height
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
	

	def move(self):
		# Calculer la position cible (point d'impact centré sur la raquette)
		paddle_middle = self.paddle_height / 2
		target_position = self.pred_y - paddle_middle
		
		if self.control == "mouse":
			# Pour la souris: mouvement fluide et direct
			distance = target_position - self.paddle[1]
			# Facteur de lissage standard de 0.1
			move_amount = distance * 0.1
			
			# Appliquer directement le mouvement fluide
			new_position = self.paddle[1] + move_amount
		else:
			# Pour les contrôles clavier: mouvement par paliers
			distance = target_position - self.paddle[1] - self.movement_accumulator
			move_amount = distance * 0.1
			
			new_position = self.paddle[1]
			
			# Mettre à jour l'accumulateur
			self.movement_accumulator += move_amount
			
			# Si l'accumulateur dépasse le seuil, effectuer un déplacement par palier
			if abs(self.movement_accumulator) >= self.step:
				direction = 1 if self.movement_accumulator > 0 else -1
				new_position = self.paddle[1] + direction * self.step
				self.movement_accumulator -= direction * self.step  # Réduire l'accumulateur du mouvement effectué
		
		# Vérifier les limites du terrain
		if new_position < 0:
			new_position = 0
		elif new_position > self.canvas_height - self.paddle_height:
			new_position = self.canvas_height - self.paddle_height
		
		# Appliquer la nouvelle position (seulement si la balle va vers l'IA)
		if self.vel[0] > 0:
			self.paddle[1] = new_position
	
	def register_hit(self):
		self.touch += 1
		self.set_handicap()

	def update_score(self, player_score, ai_score):
		self.score = [player_score, ai_score]
		self.set_handicap()

	def set_handicap(self):
		# Erreur de base
		base_error = self.paddle_height
		
		# Facteur de probabilité
		prob_factor = random.uniform(-1.0, 1.0)
		
		# On veut que l'IA soit plus précise quand elle est menée, moins quand elle mène
		score_diff = self.score[0] - self.score[1]
		
		# Ajustement basé sur le score (0.1 par point d'écart)
		score_adjustment = 0.1 * score_diff
		
		# Réduit l'erreur de 0.02 par touche, mais plafonné à 0.3
		touch_adjustment = min(0.3, 0.02 * self.touch)
	
		final_adjustment = score_adjustment - touch_adjustment
		
		error_multiplier = max(0.3, 1.0 - final_adjustment)
		
		self.handicap = base_error * error_multiplier * prob_factor