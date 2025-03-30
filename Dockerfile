# Use an official lightweight Python image
FROM python:3.12-slim

# Install system dependencies required for Pillow (including zlib)
RUN apt-get update && apt-get install -y \
    build-essential \
    zlib1g-dev \
    libjpeg-dev \
    libtiff-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port (adjust if needed)
EXPOSE 8000

# Start the application (adjust this command for your app)
CMD ["python", "app.py"]
