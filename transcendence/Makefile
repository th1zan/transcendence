# Name of the Docker image
IMAGE_NAME = transcendance

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Run the Docker container
run:
	@echo "🚀Running Docker container...🚀\n"; \
	docker run -d -p 8000:8000 $(IMAGE_NAME)
	@echo "\n🚀Docker container is running on http://localhost:8000🚀 \n"

# Run the Docker container in interactive mode (for development)
run-dev:
	docker run -it -v $(PWD):/app -p 8000:8000 $(IMAGE_NAME)

# Stop all running containers
stop:
# docker stop $(shell docker ps -q)
	@if [ ! -z "$(shell docker ps -q)" ]; then \
		docker stop $(shell docker ps -q); \
		echo "\n🚫Stopping running containers🚫\n"; \
	else \
		echo "No running containers to stop"; \
	fi

# Remove all stopped containers
clean:
# docker rm $(shell docker ps -q)
	@if [ ! -z "$(shell docker ps -a -q)" ]; then \
		echo "\n🚫Stopping running containers🚫"; \
		docker stop $(shell docker ps -q); \
	fi; \
	if [ ! -z "$(shell docker ps -a -q)" ]; then \
		echo "\n🗑️Removing stopped containers🗑️"; \
		docker rm $(shell docker ps -a -q) || echo "Error: Unable to remove some containers. Ensure they are stopped."; \
		echo "\n🗑️All stopped containers removed🗑️"; \
	else \
		echo "No containers to remove."; \
	fi

#remove database and cache files
remove-db:
	@echo "🗑️ Removing database and cache files..."; \
	rm -f db.sqlite3; \
	rm -rf api/__pycache__/*; \
	rm -rf api/migrations/__pycache__/*; \
	rm -f api/migrations/000*; \
	echo "✅ Database and cache files removed."

# Remove the Docker image
remove-image:
	docker rmi $(IMAGE_NAME)


# # Name of the Docker image
# IMAGE_NAME = transcendance
#
# # Build the Docker image
# build:
# 	docker build -t $(IMAGE_NAME) .
#
# # Run the Docker container
# run:
# 	docker run -p 8000:8000 $(IMAGE_NAME)
#
# # Run the Docker container in interactive mode (for development)
# run-dev:
# 	docker run -it -v $(PWD):/app -p 8000:8000 $(IMAGE_NAME)
#
# # Stop all running containers
# stop:
# 	docker stop $(shell docker ps -q)
#
# # Remove all stopped containers
# clean:
# 	docker rm $(shell docker ps -a -q)
#
# # Remove the Docker image
# remove-image:
# 	docker rmi $(IMAGE_NAME)