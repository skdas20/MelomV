let userLocation = null;
let loadingTimeout;
let predictionInterval;

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  initializeNavigation();
});

function initializeApp() {
  // Request location permission
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log("User location obtained:", userLocation);
      },
      (error) => {
        console.error("Error obtaining location:", error);
        userLocation = null;
      }
    );
  } else {
    console.error("Geolocation not supported.");
  }

  // Use matchMedia to check if mobile
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  
  // Initialize loading screen
  setupLoadingScreen();
  
  // Setup device-specific UI
  if (isMobile) {
    setupMobileExperience();
  } else {
    setupDesktopExperience();
  }
}

// Function to handle loading screen
function setupLoadingScreen() {
  const loadingScreen = document.getElementById('loading');
  const mainContent = document.getElementById('mainContent');
  const mobileVideo = document.getElementById('loadingVideoMobile');
  const desktopVideo = document.getElementById('loadingVideoDesktop');
  
  // Ensure videos play properly on mobile
  if (mobileVideo) {
    mobileVideo.setAttribute('playsinline', '');
    mobileVideo.setAttribute('muted', '');
    mobileVideo.muted = true;
    mobileVideo.play().catch(error => {
      console.error("Mobile video autoplay failed:", error);
    });
  }
  
  if (desktopVideo) {
    desktopVideo.setAttribute('playsinline', '');
    desktopVideo.setAttribute('muted', '');
    desktopVideo.muted = true;
    desktopVideo.play().catch(error => {
      console.error("Desktop video autoplay failed:", error);
    });
  }
  
  // Hide loading screen and show main content after 4 seconds with fade transition
  loadingTimeout = setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 1s ease';
    
    // Prepare main content before showing
    mainContent.style.display = 'block';
    mainContent.style.opacity = '0';
    
    setTimeout(() => {
      // Hide loading screen
      loadingScreen.style.display = 'none';
      
      // Show main content with animation
      setTimeout(() => {
        mainContent.style.opacity = '1';
      }, 50);
    }, 1000);
  }, 4000);
}

// Function to handle navigation between sections
function initializeNavigation() {
  const navLinks = document.querySelectorAll('nav ul li a');
  const sections = document.querySelectorAll('.content-section');
  const tryItBtnHIW = document.getElementById('tryItBtnHIW');
  
  // Handle navigation clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links and sections
      navLinks.forEach(item => item.classList.remove('active'));
      sections.forEach(section => section.classList.remove('active'));
      
      // Add active class to clicked link
      this.classList.add('active');
      
      // Show the corresponding section
      const sectionId = this.getAttribute('data-section');
      document.getElementById(sectionId).classList.add('active');
    });
  });
  
  // "Try It Now" button in How It Works section should navigate to home and activate camera
  if (tryItBtnHIW) {
    tryItBtnHIW.addEventListener('click', function() {
      // Switch to home section
      navLinks.forEach(item => item.classList.remove('active'));
      sections.forEach(section => section.classList.remove('active'));
      
      // Activate home link and section
      document.querySelector('a[data-section="home"]').classList.add('active');
      document.getElementById('home').classList.add('active');
      
      // Trigger the appropriate "Try It" button based on device
      if (window.matchMedia("(max-width: 768px)").matches) {
        // Mobile: just scroll into view as camera activates automatically
        document.getElementById('mobileOverlay').scrollIntoView({ behavior: 'smooth' });
      } else {
        // Desktop: trigger the Try It button
        const tryItBtn = document.getElementById('tryItBtn');
        if (tryItBtn && !tryItBtn.disabled) {
          tryItBtn.click();
        }
      }
    });
  }
}

// Common function: capture frame from a video element and send to /predict endpoint
function captureAndPredict(videoElement, resultElement, loadingElement = null) {
  if (loadingElement) {
    loadingElement.style.display = 'inline-block';
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  // Make sure the video element is valid before drawing
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    console.error("Video dimensions not available");
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    return;
  }
  
  try {
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    const payload = {
      image: dataURL,
      location: userLocation
    };
    
    fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Prediction response:", data);
      // Add additional debugging for weather data
      console.log("Weather data received:", data.weather);
      
      if (data.error) {
        resultElement.innerHTML = `<span class="error-message"><i class="fas fa-exclamation-circle"></i> ${data.error}</span>`;
      } else {
        // Format results with mood, age, and weather
        let weatherIcon = getWeatherIcon(data.weather);
        let weatherText = formatWeather(data.weather);
        
        // Check if location data is being sent properly
        console.log("Location data being sent:", userLocation);
        
        resultElement.innerHTML = `<div class="prediction-result">
          <div class="prediction-item">
            <i class="fas fa-smile"></i>
            <span class="prediction-label">Mood:</span>
            <span class="prediction-value">${data.mood}</span>
          </div>
          
          <div class="prediction-item">
            <i class="fas fa-user"></i>
            <span class="prediction-label">Age:</span>
            <span class="prediction-value">${data.age}</span>
          </div>
          
          <div class="prediction-item">
            <i class="fas ${weatherIcon}"></i>
            <span class="prediction-label">Weather:</span>
            <span class="prediction-value">${weatherText}</span>
          </div>
        </div>`;
      }
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    })
    .catch(err => {
      console.error("Error during prediction:", err);
      resultElement.innerHTML = `<span class="error-message"><i class="fas fa-exclamation-circle"></i> Connection error</span>`;
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    });
  } catch (err) {
    console.error("Error capturing frame:", err);
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
}

// Function to extract prediction from result element
function extractPrediction(resultElement) {
  // Try to find the prediction values from the structured HTML
  const moodValue = resultElement.querySelector('.prediction-item:nth-child(1) .prediction-value');
  const ageValue = resultElement.querySelector('.prediction-item:nth-child(2) .prediction-value');
  const weatherValue = resultElement.querySelector('.prediction-item:nth-child(3) .prediction-value');
  
  if (moodValue && ageValue) {
    return {
      mood: moodValue.textContent.trim(),
      age: ageValue.textContent.trim(),
      weather: weatherValue ? weatherValue.textContent.trim() : null
    };
  }
  
  // Fallback to older parsing method
  const resultText = resultElement.textContent;
  let mood = "";
  let age = "";
  
  if (resultText.includes("Mood:") && resultText.includes("Age:")) {
    let parts = resultText.split(/[|,]/); // Split by either | or ,
    for (let part of parts) {
      if (part.includes("Mood:")) {
        mood = part.replace("Mood:", "").trim();
      } else if (part.includes("Age:")) {
        age = part.replace("Age:", "").trim();
      }
    }
  }
  return { mood, age, weather: null };
}

// Function to trigger music playback (with weather data)
function playMusic(resultElement, buttonElement) {
  buttonElement.classList.add('loading');
  buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  
  const pred = extractPrediction(resultElement);
  if (pred.mood && pred.age) {
    const payload = {
      mood: pred.mood,
      age: pred.age,
      weather: pred.weather,
      location: userLocation
    };
    
    fetch('/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Play response:", data);
      buttonElement.classList.remove('loading');
      buttonElement.innerHTML = '<i class="fas fa-play"></i> Play Music';
      
      if (data.external_url) {
        // Show a toast notification before opening the URL
        showToast('Opening Spotify...', 'success');
        setTimeout(() => {
          window.open(data.external_url, '_blank');
        }, 1000);
      } else if (data.error) {
        showToast(data.error, 'error');
      }
    })
    .catch(err => {
      console.error("Error playing song:", err);
      buttonElement.classList.remove('loading');
      buttonElement.innerHTML = '<i class="fas fa-play"></i> Play Music';
      showToast('Failed to load music. Please try again.', 'error');
    });
  } else {
    buttonElement.classList.remove('loading');
    buttonElement.innerHTML = '<i class="fas fa-play"></i> Play Music';
    showToast('Please wait for mood detection to complete', 'warning');
  }
}

// Helper to show toast messages
function showToast(message, type = 'info') {
  // First, remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-content">
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                  type === 'error' ? 'fa-exclamation-circle' : 
                  type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  </div>`;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Show with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// MOBILE SETUP
function setupMobileExperience() {
  const mobileCamera = document.getElementById('mobileCamera');
  const resultMobile = document.getElementById('resultMobile');
  const mobilePlayBtn = document.getElementById('mobilePlayBtn');
  
  // Set initial loading state
  resultMobile.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-pulse"></i> Preparing camera...</div>';
  
  // Initialize camera with retry mechanism
  initializeCamera();
  
  function initializeCamera(retryCount = 0) {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    })
    .then(stream => {
      mobileCamera.srcObject = stream;
      mobileCamera.play().catch(e => console.error("Mobile camera play failed:", e));
      
      // Wait for camera to be fully initialized
      mobileCamera.onloadedmetadata = () => {
        // Once the camera is active, show the Play button
        mobilePlayBtn.style.display = 'block';
        resultMobile.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-pulse"></i> Analyzing...</div>';
        
        // Clear any existing intervals
        if (predictionInterval) {
          clearInterval(predictionInterval);
        }
        
        // Start predictions every 3 seconds
        predictionInterval = setInterval(() => {
          captureAndPredict(mobileCamera, resultMobile);
        }, 3000);
      };
    })
    .catch(err => {
      console.error("Error accessing webcam:", err);
      if (retryCount < 3) {
        // Retry after a short delay
        setTimeout(() => {
          initializeCamera(retryCount + 1);
        }, 1000);
      } else {
        resultMobile.innerHTML = `<span class="error-message">
          <i class="fas fa-camera-slash"></i> 
          Could not access camera. Please check permissions.
        </span>`;
      }
    });
  }
  
  // Mobile Play Button: trigger Spotify playback
  mobilePlayBtn.addEventListener('click', () => {
    playMusic(resultMobile, mobilePlayBtn);
  });
}

// DESKTOP SETUP
function setupDesktopExperience() {
  const desktopCamera = document.getElementById('desktopCamera');
  const resultDesktop = document.getElementById('resultDesktop');
  const tryItBtn = document.getElementById('tryItBtn');
  const quoteDesktop = document.getElementById('quoteDesktop');
  const desktopPlayBtn = document.getElementById('desktopPlayBtn');
  
  // Set up rotating quotes
  setupRotatingQuotes();
  
  // Initially, hide desktop camera feed and play button
  desktopCamera.style.display = 'none';
  desktopPlayBtn.style.display = 'none';
  
  // When "Try It!" is clicked, start the camera and predictions
  tryItBtn.addEventListener('click', () => {
    tryItBtn.disabled = true;
    tryItBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Activating...';
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 } 
      } 
    })
    .then(stream => {
      desktopCamera.srcObject = stream;
      desktopCamera.style.display = 'block';
      // Add fade-in class for smooth animation
      desktopCamera.classList.add('fade-in');
      
      // Update button state
      tryItBtn.disabled = true;
      tryItBtn.innerHTML = '<i class="fas fa-check-circle"></i> Camera Active';
      tryItBtn.classList.add('success-btn');
      
      // Show the desktop Play button once camera is active
      setTimeout(() => {
        desktopPlayBtn.style.display = 'block';
        desktopPlayBtn.classList.add('fade-in');
        resultDesktop.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-pulse"></i> Analyzing...</div>';
      }, 500);
      
      // Clear any existing intervals
      if (predictionInterval) {
        clearInterval(predictionInterval);
      }
      
      // Start predictions every 3 seconds
      predictionInterval = setInterval(() => {
        captureAndPredict(desktopCamera, resultDesktop);
      }, 3000);
    })
    .catch(err => {
      console.error("Error accessing webcam:", err);
      tryItBtn.disabled = false;
      tryItBtn.innerHTML = '<i class="fas fa-camera"></i> Try Again';
      resultDesktop.innerHTML = `<span class="error-message">
        <i class="fas fa-camera-slash"></i> 
        Could not access camera. Please check permissions.
      </span>`;
    });
  });
  
  // Desktop Play Button: trigger Spotify playback on click
  desktopPlayBtn.addEventListener('click', () => {
    playMusic(resultDesktop, desktopPlayBtn);
  });
  
  // Also allow "q" key press on desktop to trigger playback
  document.addEventListener('keydown', function(e) {
    if (e.key === 'q' || e.key === 'Q') {
      if (desktopPlayBtn.style.display !== 'none') {
        playMusic(resultDesktop, desktopPlayBtn);
      }
    }
  });
  
  function setupRotatingQuotes() {
    const quotes = [
      "Music expresses that which cannot be put into words.",
      "Where words fail, music speaks.",
      "Music is the literature of the heart.",
      "Without music, life would be a mistake.",
      "Music gives a soul to the universe, wings to the mind, flight to the imagination.",
      "Music is the universal language of mankind.",
      "Life seems to go on without effort when I am filled with music."
    ];
    
    // Set initial quote with animation
    setQuoteWithAnimation(quotes[0]);
    
    // Rotate quotes every 10 seconds
    let quoteIndex = 1;
    setInterval(() => {
      setQuoteWithAnimation(quotes[quoteIndex]);
      quoteIndex = (quoteIndex + 1) % quotes.length;
    }, 10000);
    
    function setQuoteWithAnimation(quote) {
      quoteDesktop.style.opacity = '0';
      setTimeout(() => {
        quoteDesktop.innerText = quote;
        quoteDesktop.style.opacity = '1';
      }, 500);
    }
  }
}

// Function to format weather information nicely
function formatWeather(weatherData) {
  if (!weatherData || typeof weatherData !== 'object') {
    return "Checking weather...";
  }
  
  let weatherText = weatherData.conditions || "";
  if (weatherText === "Unknown") {
    weatherText = "Checking weather...";
  }
  
  let temp = "";
  if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
    temp = `${Math.round(weatherData.temperature)}°${weatherData.unit || 'C'}`;
  }
  
  if (temp && weatherText && weatherText !== "Checking weather...") {
    return `${weatherText}, ${temp}`;
  } else if (temp) {
    return temp;
  } else if (weatherText) {
    return weatherText;
  } else {
    return "Checking weather...";
  }
}

// Function to get weather icon
function getWeatherIcon(weatherData) {
  if (!weatherData || !weatherData.conditions) return "fa-cloud";
  
  const condition = weatherData.conditions.toLowerCase();
  
  if (condition.includes("sun") || condition.includes("clear")) {
    return "fa-sun";
  } else if (condition.includes("cloud")) {
    return "fa-cloud-sun";
  } else if (condition.includes("rain") || condition.includes("drizzle")) {
    return "fa-cloud-rain";
  } else if (condition.includes("snow")) {
    return "fa-snowflake";
  } else if (condition.includes("thunder") || condition.includes("storm")) {
    return "fa-bolt";
  } else if (condition.includes("fog") || condition.includes("mist")) {
    return "fa-smog";
  } else if (condition.includes("wind")) {
    return "fa-wind";
  } else {
    return "fa-cloud";
  }
}
