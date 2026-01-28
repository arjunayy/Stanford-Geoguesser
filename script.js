// --- GAME DATA: The correct locations for 20 rounds ---
const locations = [
    { id: 1, lat: 37.425435, lng: -122.162083 },
    { id: 2, lat: 37.423240, lng: -122.163327 },
    { id: 3, lat: 37.412819795693224, lng: -122.18132817116833 },
    { id: 4, lat: 37.429242, lng: -122.167912 },
    { id: 5, lat: 37.428362, lng: -122.168392 },
    { id: 6, lat: 37.423618, lng: -122.168088 },
    { id: 7, lat: 37.429780, lng: -122.169518 },
    { id: 8, lat: 37.437341929891936, lng: -122.16891870831157 },
    { id: 9, lat: 37.42982941066154, lng: -122.1767814102329 },
    { id: 10, lat: 37.42704886155755, lng: -122.16785463968473 },
    { id: 11, lat: 37.42566680900708, lng: -122.16191220285634 },
    { id: 12, lat: 37.43599928967367, lng: -122.17094986481438 },
    { id: 13, lat: 37.4202602272918, lng: -122.17065149008204 },
    { id: 14, lat: 37.425496, lng: -122.167229 },
    { id: 15, lat: 37.42429820134515, lng: -122.1676890091537 },
    { id: 16, lat: 37.42644224911268, lng: -122.16657788087397 },
    { id: 17, lat: 37.436479816443914, lng: -122.16977189587362 },
    { id: 18, lat: 37.42734313692284, lng: -122.16522902884236 },
    { id: 19, lat: 37.423889477821724, lng: -122.16424804685245 },
    { id: 20, lat: 37.42513685199563, lng: -122.17020441518086 }
];

// --- STATE VARIABLES ---
let currentRound = 0;
let totalScore = 0;
let timerInterval;
let timeLeft = 90; // Default variable, updated in loadRound

// MAP OBJECTS
let map = null;
let userMarker = null;   // The marker the user places
let trueMarker = null;   // The actual answer marker
let currentPolyline = null; // The line connecting guess to answer

// --- DOM ELEMENTS ---
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const resultOverlay = document.getElementById('result-overlay');
const endScreen = document.getElementById('end-screen');
const hudScore = document.getElementById('total-score');
const hudTimer = document.getElementById('timer');
const locationImage = document.getElementById('location-image');
const confirmBtn = document.getElementById('confirm-btn');
const floatingNextBtn = document.getElementById('floating-next-btn');


// --- INITIALIZE MAP ---
// Centered on Stanford University
function initMap() {
    map = L.map('map').setView([37.4275, -122.1697], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Map Click Listener to place or move the guess marker
    map.on('click', function(e) {
        // Prevent clicking if round is already submitted
        if (confirmBtn.classList.contains('hidden')) return; 

        if (userMarker) {
            map.removeLayer(userMarker);
        }
        userMarker = L.marker(e.latlng).addTo(map);
    });
}

// --- GAME FLOW LISTENERS ---

// START GAME
document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.classList.remove('active'); // Must remove 'active' first
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    initMap();
    loadRound();
});

// GUESS & NEXT BUTTONS
document.getElementById('confirm-btn').addEventListener('click', submitGuess);
document.getElementById('modal-next-btn').addEventListener('click', nextRound);
document.getElementById('floating-next-btn').addEventListener('click', nextRound);
document.getElementById('view-map-btn').addEventListener('click', () => {
    // Hide the result modal to review the map
    resultOverlay.classList.add('hidden'); 
});


// --- GAME LOGIC ---

function loadRound() {
    if (currentRound >= locations.length) {
        endGame();
        return;
    }

    // 1. RESET UI
    timeLeft = 90; // CHANGED: Set timer to 90 seconds (1m 30s)
    hudTimer.innerText = timeLeft;
    confirmBtn.classList.remove('hidden');
    floatingNextBtn.classList.add('hidden');
    resultOverlay.classList.add('hidden');
    
    // 2. CLEANUP MAP LAYERS
    if (userMarker) map.removeLayer(userMarker);
    if (trueMarker) map.removeLayer(trueMarker);
    if (currentPolyline) map.removeLayer(currentPolyline);
    
    userMarker = null;
    trueMarker = null;
    currentPolyline = null;

    // 3. LOAD IMAGE
    locationImage.src = `images/round${currentRound + 1}.jpeg`;

    // 4. START TIMER
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        hudTimer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitGuess();
        }
    }, 1000);
    
    // 5. Reset Map View
    map.setView([37.4275, -122.1697], 14); // Centered over Stanford
    setTimeout(() => { map.invalidateSize(); }, 100);
}

function submitGuess() {
    clearInterval(timerInterval);
    confirmBtn.classList.add('hidden'); // Hide guess button
    floatingNextBtn.classList.remove('hidden'); // Show next button at bottom center

    let roundData = locations[currentRound];
    let distanceInMeters = 0;
    let score = 0;
    let answerLatLng = [roundData.lat, roundData.lng];

    if (userMarker) {
        let userLatLng = userMarker.getLatLng();
        distanceInMeters = getDistanceFromLatLonInMeters(userLatLng.lat, userLatLng.lng, roundData.lat, roundData.lng);
        score = calculateScore(distanceInMeters);

        // Draw Line
        currentPolyline = L.polyline([userLatLng, answerLatLng], {color: 'red'}).addTo(map);
        
        // Fit map view to show both guess and answer
        map.fitBounds(L.latLngBounds([userLatLng, answerLatLng]), {padding: [50,50]});
    } else {
        // No guess made
        distanceInMeters = 99999;
        score = 0;
        map.setView(answerLatLng, 15); // Just show the answer
    }

    // Update Total Score
    totalScore += score;
    hudScore.innerText = totalScore;

    // Place True Location Marker (Green)
    trueMarker = L.marker(answerLatLng, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/marker-icon-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            shadowSize: [41, 41]
        })
    }).addTo(map);

    // Show Results Overlay
    // CHANGED: Display feet to match the scoring system
    let distanceInFeet = distanceInMeters * 3.28084;
    document.getElementById('round-distance').innerText = Math.round(distanceInFeet) + " feet";
    document.getElementById('round-score').innerText = score;
    resultOverlay.classList.remove('hidden');
}

function nextRound() {
    currentRound++;
    loadRound();
}

function endGame() {
    gameContainer.classList.add('hidden');
    endScreen.classList.remove('hidden');
    document.getElementById('final-score').innerText = totalScore;
}


// --- MATH HELPERS ---

// Haversine Formula (Calculates distance between two lat/lng points in meters)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000; 
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

// CHANGED: New Tiered Scoring Function
function calculateScore(distanceInMeters) {
    // 1 meter = 3.28084 feet
    const distanceInFeet = distanceInMeters * 3.28084;

    if (distanceInFeet <= 20) return 2;
    if (distanceInFeet <= 100) return 1.5;
    if (distanceInFeet <= 200) return 1;
    if (distanceInFeet <= 500) return 0.75;
    if (distanceInFeet <= 1000) return 0.5;
    if (distanceInFeet <= 2000) return 0.25;
    
    // Greater than 2000 feet
    return 0;
}