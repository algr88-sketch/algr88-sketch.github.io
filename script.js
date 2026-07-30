// --- CONFIGURACIÓN DE FIREBASE (Reemplaza con tus datos reales de Firebase Console) ---
const firebaseConfig = {
  apiKey: "AIzaSyBI7hzuEoHTBfvD3qi9pemIsgfv1OwEvpU",
  authDomain: "ag-executive.firebaseapp.com",
  databaseURL: "https://ag-executive-default-rtdb.firebaseio.com",
  projectId: "ag-executive",
  storageBucket: "ag-executive.firebasestorage.app",
  messagingSenderId: "611392539268",
  appId: "1:611392539268:web:2dafae6cd3e01d0f3bd0d1",
  measurementId: "G-V1E4ERNKY6"
};
// Inicializar Firebase
if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener("DOMContentLoaded", () => {

    // --- IDIOMAS ---
    const btnEs = document.getElementById("btn-es");
    const btnEn = document.getElementById("btn-en");
    const translateElements = document.querySelectorAll("[data-es]");
    let currentLang = "es";

    function changeLanguage(lang) {
        currentLang = lang;
        translateElements.forEach(elem => {
            elem.textContent = (lang === "es") ? elem.getAttribute("data-es") : elem.getAttribute("data-en");
        });
        btnEs.classList.toggle("active", lang === "es");
        btnEn.classList.toggle("active", lang === "en");
    }

    btnEs.addEventListener("click", () => changeLanguage("es"));
    btnEn.addEventListener("click", () => changeLanguage("en"));


    // --- CALCULADORA CON PARADAS MÚLTIPLES ---
const originInput = document.getElementById("origin-input");
const destinationInput = document.getElementById("destination-input");
const stopsContainer = document.getElementById("stops-container");
const btnAddStop = document.getElementById("btn-add-stop");

const tollCheck = document.getElementById("toll-check");
const tollsNumberBox = document.getElementById("tolls-number-box");
const tollsCount = document.getElementById("tolls-count");

const calcForm = document.getElementById("calc-form");
const calcResult = document.getElementById("calc-result");
const resTime = document.getElementById("res-time");
const resDistance = document.getElementById("res-distance");
const resPrice = document.getElementById("res-price");
const btnBookWhatsapp = document.getElementById("btn-book-whatsapp");

let calculatedTripData = null;

// Mostrar/ocultar casilla de peajes
tollCheck.addEventListener("change", () => {
    tollsNumberBox.style.display = tollCheck.checked ? "block" : "none";
});

// Agregar Parada Dinámica (Máximo 4 paradas)
btnAddStop.addEventListener("click", () => {
    const currentStops = stopsContainer.querySelectorAll(".stop-input-row").length;
    if (currentStops >= 4) {
        alert("Puedes agregar un máximo de 4 paradas intermedias.");
        return;
    }

    const stopRow = document.createElement("div");
    stopRow.className = "stop-input-row";
    stopRow.innerHTML = `
        <div class="input-icon">
            <i class="fas fa-map-pin"></i>
            <input type="text" class="stop-input" placeholder="Parada ${currentStops + 1} (Ej: Centro Comercial Chipichape)" required>
        </div>
        <button type="button" class="btn-remove-stop" title="Eliminar parada">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    stopsContainer.appendChild(stopRow);

    // Habilitar autocompletado en la nueva parada
    const newInput = stopRow.querySelector(".stop-input");
    if (window.google && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(newInput);
    }

    // Botón eliminar parada
    stopRow.querySelector(".btn-remove-stop").addEventListener("click", () => {
        stopRow.remove();
        updateStopPlaceholders();
    });
});

function updateStopPlaceholders() {
    const stopInputs = stopsContainer.querySelectorAll(".stop-input");
    stopInputs.forEach((input, index) => {
        input.placeholder = `Parada ${index + 1} (Ej: Dirección o lugar)`;
    });
}

// Inicializar Autocomplete inicial
function initMapsAutocomplete() {
    if (window.google && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(originInput);
        new google.maps.places.Autocomplete(destinationInput);
    }
}
setTimeout(initMapsAutocomplete, 1000);

// Calcular tarifa con Google Directions API
calcForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const origin = originInput.value;
    const destination = destinationInput.value;

    if (!origin || !destination) return;

    if (!window.google || !google.maps || !google.maps.DirectionsService) {
        alert("Atención: La API de Google Maps no está disponible. Revisa la clave API en tu proyecto.");
        return;
    }

    // Recolectar paradas intermedias
    const stopInputs = Array.from(stopsContainer.querySelectorAll(".stop-input"))
        .map(input => input.value.trim())
        .filter(val => val.length > 0);

    const waypoints = stopInputs.map(stopAddr => ({
        location: stopAddr,
        stopover: true
    }));

    const directionsService = new google.maps.DirectionsService();

    directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
    }, (result, status) => {
        if (status === "OK") {
            const route = result.routes[0];
            let totalDistanceMeters = 0;
            let totalDrivingSeconds = 0;

            // Sumar distancia y tiempo de todos los tramos (legs)
            route.legs.forEach(leg => {
                totalDistanceMeters += leg.distance.value;
                totalDrivingSeconds += leg.duration.value;
            });

            const distanceKm = totalDistanceMeters / 1000;
            const drivingMin = Math.round(totalDrivingSeconds / 60);

            // 5 min de espera por cada parada
            const totalWaitMin = stopInputs.length * 5;
            const totalDurationMin = drivingMin + totalWaitMin;

            // Fórmula: Tiempo ideal a 36 km/h
            const tiempoIdeal = (distanceKm * 60) / 36;

            let cargoTiempoExtra = 0;
            if ((totalDurationMin - tiempoIdeal) > 0) {
                cargoTiempoExtra = (totalDurationMin - tiempoIdeal) * (35583 / 60);
            }

            const tienePeaje = tollCheck.checked;
            const numPeajes = tienePeaje ? (parseInt(tollsCount.value) || 1) : 0;
            const costoPeajes = tienePeaje ? (13300 * numPeajes) : 0;

            let tarifaTotal = (distanceKm * 2087) + cargoTiempoExtra + costoPeajes;
            tarifaTotal = Math.round(tarifaTotal / 1000) * 1000;

            resDistance.textContent = `${distanceKm.toFixed(1)} km`;
            resTime.textContent = `${totalDurationMin} min (${drivingMin} min viaje + ${totalWaitMin} min esperas)`;
            resPrice.textContent = `$${tarifaTotal.toLocaleString('es-CO')} COP`;
            calcResult.style.display = "block";

            calculatedTripData = {
                origin,
                destination,
                stops: stopInputs,
                distanceKm: distanceKm.toFixed(1),
                drivingMin,
                totalWaitMin,
                totalDurationMin,
                price: `$${tarifaTotal.toLocaleString('es-CO')} COP`
            };
        } else {
            alert("No se pudo calcular la ruta. Verifica que las direcciones sean correctas.");
        }
    });
});

// Enviar detalle completo a WhatsApp
btnBookWhatsapp.addEventListener("click", () => {
    if (!calculatedTripData) return;

    let stopsFormatted = "";
    if (calculatedTripData.stops.length > 0) {
        stopsFormatted = "\n🛑 *Paradas intermedias:* \n" + calculatedTripData.stops.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
    }

    const msg = `Hola AG Executive Driver, me gustaría reservar el siguiente viaje cotizado en la web:\n\n📍 *Origen:* ${calculatedTripData.origin}${stopsFormatted}\n🏁 *Destino Final:* ${calculatedTripData.destination}\n\n📏 *Distancia:* ${calculatedTripData.distanceKm} km\n⏱️ *Tiempo Estimado:* ${calculatedTripData.totalDurationMin} min (${calculatedTripData.drivingMin} min en ruta + ${calculatedTripData.totalWaitMin} min espera)\n💵 *Valor Cotizado:* ${calculatedTripData.price}`;

    const url = `https://wa.me/573176653331?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
});

    // --- MANEJO DE RESEÑAS CON FIREBASE ---
    const starsContainer = document.getElementById("form-stars");
    const starIcons = starsContainer ? starsContainer.querySelectorAll("i") : [];
    let selectedRating = 0;

    starIcons.forEach(star => {
        star.addEventListener("click", () => {
            selectedRating = parseInt(star.getAttribute("data-value"));
            starIcons.forEach(s => {
                const val = parseInt(s.getAttribute("data-value"));
                s.className = (val <= selectedRating) ? "fas fa-star" : "far fa-star";
            });
        });
    });

    const reviewForm = document.getElementById("review-form");
    const reviewsContainer = document.getElementById("reviews-container");

    if (typeof firebase !== "undefined" && firebase.database) {
        const database = firebase.database();
        const reviewsRef = database.ref("reviews");

        // Guardar reseña
        if (reviewForm) {
            reviewForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (selectedRating === 0) {
                    alert("Por favor selecciona una calificación con estrellas.");
                    return;
                }

                const newReview = {
                    name: document.getElementById("reviewer-name").value,
                    text: document.getElementById("reviewer-text").value,
                    rating: selectedRating,
                    timestamp: Date.now()
                };

                reviewsRef.push(newReview).then(() => {
                    reviewForm.reset();
                    selectedRating = 0;
                    starIcons.forEach(s => s.className = "far fa-star");
                });
            });
        }

        // Cargar reseñas en tiempo real
        reviewsRef.on("value", (snapshot) => {
            if (!reviewsContainer) return;
            reviewsContainer.innerHTML = "";
            const data = snapshot.val();
            if (!data) {
                reviewsContainer.innerHTML = '<p class="no-reviews">¡Sé el primero en calificar nuestro servicio!</p>';
                return;
            }

            const reviewsArray = Object.values(data).sort((a,b) => b.timestamp - a.timestamp);

            reviewsArray.forEach(rev => {
                const card = document.createElement("div");
                card.className = "review-card";

                let starsHtml = '<div class="stars">';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += (i <= rev.rating) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
                }
                starsHtml += '</div>';

                card.innerHTML = `
                    ${starsHtml}
                    <p class="review-text">&ldquo;${rev.text}&rdquo;</p>
                    <span class="review-author">- ${rev.name}</span>
                `;
                reviewsContainer.appendChild(card);
            });
        });
    }
});