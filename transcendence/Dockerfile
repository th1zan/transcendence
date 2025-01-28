# Use a lightweight base Python image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements.txt file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project content into the container
COPY . .

# Expose port 8000 (default for Django)
EXPOSE 8000

# Default command to run the Django server
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000", ""]

#added "python..." to make migrations and migrate before running the server
CMD ["sh", "-c", "python manage.py makemigrations && python manage.py makemigrations api && python manage.py migrate api && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"] 
