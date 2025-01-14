# Name of the Docker image
IMAGE_NAME = transcendance

# Build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Run the Docker container
run:
	docker run -p 8000:8000 $(IMAGE_NAME)

# Run the Docker container in interactive mode (for development)
run-dev:
	docker run -it -v $(PWD):/app -p 8000:8000 $(IMAGE_NAME)

# Stop all running containers
stop:
	docker stop $(shell docker ps -q)

# Remove all stopped containers
clean:
	docker rm $(shell docker ps -a -q)

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
