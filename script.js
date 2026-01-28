// --- 1. Game Data ---
const GAME_ROUNDS = [
    { lat: 37.425435, lng: -122.162083, locationName: "Main Quad Entrance" },
    { lat: 37.423240, lng: -122.163327, locationName: "Hoover Tower" },
    { lat: 37.412819795693224, lng: -122.18132817116833, locationName: "Stanford University Golf Course" },
    { lat: 37.429242, lng: -122.167912, locationName: "Cantor Arts Center" },
    { lat: 37.428362, lng: -122.168392, locationName: "The Oval" },
    { lat: 37.423618, lng: -122.168088, locationName: "Green Library" },
    { lat: 37.429780, lng: -122.169518, locationName: "Memorial Church" },
    { lat: 37.437341929891936, lng: -122.16891870831157, locationName: "Stanford Stadium" },
    { lat: 37.42982941066154, lng: -122.1767814102329, locationName: "SLAC National Accelerator Laboratory" },
    { lat: 37.42704886155755, lng: -122.16785463968473, locationName: "White Plaza" },
    { lat: 37.42566680900708, lng: -122.16191220285634, locationName: "Main Quad (Inner Area)" },
    { lat: 37.43599928967367, lng: -122.17094986481438, locationName: "Arrillaga Center for Sports and Rec" },
    { lat: 37.4202602272918, lng: -122.17065149008204, locationName: "School of Engineering" },
    { lat: 37.425496, lng: -122.167229, locationName: "Tressider Memorial Union" },
    { lat: 37.42429820134515, lng: -122.1676890091537, locationName: "Old Union" },
    { lat: 37.42644224911268, lng: -122.16657788087397, locationName: "Vaden Health Services" },
    { lat: 37.436479816443914, lng: -122.16977189587362, locationName: "Maples Pavilion" },
    { lat: 37.42734313692284, lng: -122.16522902884236, locationName: "Stanford Bookstore" },
    { lat: 37.423889477821724, lng: -122.16424804685245, locationName: "The Dish Trail Entrance" },
    { lat: 37.42513685199563, lng: -122.17020441518086, locationName: "Leland Stanford Jr. Museum" }
];

let currentRound = 0;
let totalScore = 0;
let userGuessMarker = null;
let correctLocationMarker = null;
let polyline = null;
let map = null;
let timeLeft = 60;
let timerInterval = null;

const STANFORD_CENTER = [37.4275, -122.1697]; 

function initializeMap() {
    map = L.map('map', { 
        minZoom: 13, maxZoom: 17,
        maxBounds: [[37.38, -122.22], [37.46, -122.10]]
    }).setView(STANFORD_CENTER, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.on('click', handleMapClick);
}

function startGame() {
    currentRound = 0;
    totalScore = 0;
    updateScoreDisplay();
    if (!map) initializeMap();
    else clearMapLayers();
    loadRound(currentRound);
}

function clearMapLayers() {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });
}

function loadRound(roundIndex) {
    if (roundIndex >= GAME_ROUNDS.length) { showGameOver(); return; }
    
    clearMapLayers();
    map.setView(STANFORD_CENTER, 13);
    userGuessMarker = null;

    document.getElementById('round-title').textContent = `Round ${roundIndex + 1} / ${GAME_ROUNDS.length}`;
    document.getElementById('location-image').src = `./images/round${roundIndex + 1}.jpeg`;
    document.getElementById('guess-button').textContent = "Place your guess on the map!";
    document.getElementById('guess-button').disabled = true;
    document.getElementById('result-modal').style.display = 'none';
    
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) handleTimeUp();
    }, 1000);
}

function updateTimerDisplay() {
    const el = document.getElementById('timer');
    el.textContent = `Time: ${timeLeft}s`;
    el.style.color = timeLeft <= 10 ? "red" : "#8c1515";
}

function handleTimeUp() {
    clearInterval(timerInterval);
    if (userGuessMarker) {
        handleGuess(); // Auto-submit existing marker
    } else {
        // No marker: End round with 0 points
        const correctLoc = GAME_ROUNDS[currentRound];
        showResultModal(correctLoc, null, 0, 0);
        drawResultsOnMap(correctLoc, null);
        currentRound++;
    }
}

function handleMapClick(e) {
    if (document.getElementById('result-modal').style.display === 'block') return;
    
    if (userGuessMarker) map.removeLayer(userGuessMarker);
    userGuessMarker = L.circleMarker(e.latlng, { color: 'red', radius: 8 }).addTo(map);
    
    document.getElementById('guess-button').textContent = "Make Guess";
    document.getElementById('guess-button').disabled = false;
}

function handleGuess() {
    clearInterval(timerInterval);
    document.getElementById('guess-button').disabled = true;
    
    const correctLoc = GAME_ROUNDS[currentRound];
    const guessLoc = userGuessMarker.getLatLng();
    const dist = L.latLng(correctLoc.lat, correctLoc.lng).distanceTo(guessLoc) / 1000;
    const score = Math.round(5000 * Math.exp(-0.3 * dist));
    
    totalScore += score;
    updateScoreDisplay();
    showResultModal(correctLoc, guessLoc, dist, score);
    drawResultsOnMap(correctLoc, guessLoc);
    currentRound++;
}

function showResultModal(correctLoc, guessLoc, dist, score) {
    const modal = document.getElementById('result-modal');
    document.getElementById('modal-title').textContent = score === 5000 ? "Perfect! 🎉" : "Round Results";
    document.getElementById('modal-distance').textContent = guessLoc ? `Distance: ${dist.toFixed(2)} km` : "No guess placed.";
    document.getElementById('modal-points').textContent = `Points: ${score}`;
    document.getElementById('correct-coords').textContent = correctLoc.locationName;
    modal.style.display = 'block';
}

function drawResultsOnMap(correctLoc, guessLoc) {
    const correct = L.latLng(correctLoc.lat, correctLoc.lng);
    L.circleMarker(correct, { color: 'blue', radius: 8 }).addTo(map).bindPopup(correctLoc.locationName).openPopup();
    if (guessLoc) {
        L.polyline([guessLoc, correct], { color: 'red', weight: 3 }).addTo(map);
        map.fitBounds(L.latLngBounds(guessLoc, correct), { padding: [50, 50] });
    } else {
        map.setView(correct, 15);
    }
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = `Total Score: ${totalScore}`;
}

function showGameOver() {
    document.getElementById('final-score').textContent = totalScore;
    document.getElementById('game-over-modal').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    startGame();
    document.getElementById('guess-button').addEventListener('click', handleGuess);
    document.getElementById('next-button').addEventListener('click', () => loadRound(currentRound));
    document.getElementById('restart-button').addEventListener('click', startGame);
});