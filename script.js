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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

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

    // --- GOOGLE MAPS AUTOCOMPLETE & CALCULADORA ---
    const originInput = document.getElementById("origin-input");
    const destinationInput = document.getElementById("destination-input");
    const tollCheck = document.getElementById("toll-check");
    const tollsNumberBox = document.getElementById("tolls-number-box");
    const tollsCount = document.getElementById("tolls-count");

    // Activar autocompletado si Google Maps está cargado
    if (window.google && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(originInput);
        new google.maps.places.Autocomplete(destinationInput);
    }

    tollCheck.addEventListener("change", () => {
        tollsNumberBox.style.display = tollCheck.checked ? "block" : "none";
    });

    const calcForm = document.getElementById("calc-form");
    const calcResult = document.getElementById("calc-result");
    const resTime = document.getElementById("res-time");
    const resDistance = document.getElementById("res-distance");
    const resPrice = document.getElementById("res-price");
    const btnBookWhatsapp = document.getElementById("btn-book-whatsapp");

    let calculatedTripData = null;

    calcForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const origin = originInput.value;
        const destination = destinationInput.value;

        if (!origin || !destination) return;

        // Servicio de Matriz de Distancia de Google Maps
        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [origin],
            destinations: [destination],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
        }, (response, status) => {
            if (status === "OK") {
                const result = response.rows[0].elements[0];
                if (result.status === "OK") {
                    const distanceKm = result.distance.value / 1000; // de metros a Km
                    const durationMin = Math.round(result.duration.value / 60); // de segs a Min

                    // --- FÓRMULA DE TARIFA ---
                    // Tiempo Ideal por viaje = (Distancia total * 60) / 50 (estimando 50 km/h)
                    const tiempoIdeal = (distanceKm * 60) / 50;
                    
                    let cargoTiempoExtra = 0;
                    if ((durationMin - tiempoIdeal) > 0) {
                        cargoTiempoExtra = (durationMin - tiempoIdeal) * (35583 / 60);
                    }

                    const tienePeaje = tollCheck.checked;
                    const numPeajes = tienePeaje ? parseInt(tollsCount.value) || 1 : 0;
                    const costoPeajes = tienePeaje ? (13300 * numPeajes) : 0;

                    // Tarifa Sugerida = (Km * 2087) + tiempoExtra + peajes
                    let tarifaTotal = (distanceKm * 2087) + cargoTiempoExtra + costoPeajes;
                    tarifaTotal = Math.round(tarifaTotal / 1000) * 1000; // Redondeo limpio a miles

                    // Mostrar en pantalla
                    resDistance.textContent = `${distanceKm.toFixed(1)} km`;
                    resTime.textContent = `${durationMin} min`;
                    resPrice.textContent = `$${tarifaTotal.toLocaleString('es-CO')} COP`;
                    calcResult.style.display = "block";

                    calculatedTripData = {
                        origin,
                        destination,
                        distanceKm: distanceKm.toFixed(1),
                        durationMin,
                        price: `$${tarifaTotal.toLocaleString('es-CO')} COP`
                    };
                } else {
                    alert("No se pudo calcular la ruta entre estos dos puntos. Intenta especificar ciudad y dirección.");
                }
            } else {
                alert("Error al conectar con el servicio de Google Maps.");
            }
        });
    });

    // Enviar cotización exacta a WhatsApp
    btnBookWhatsapp.addEventListener("click", () => {
        if (!calculatedTripData) return;
        const msg = `Hola AG Executive Driver, me gustaría reservar el siguiente viaje cotizado en la web:\n\n📍 Origen: ${calculatedTripData.origin}\n🏁 Destino: ${calculatedTripData.destination}\n📏 Distancia: ${calculatedTripData.distanceKm} km\n⏱️ Tiempo: ${calculatedTripData.durationMin} min\n💵 Valor Cotizado: ${calculatedTripData.price}`;
        const url = `https://wa.me/573176653331?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
    });


    // --- MANEJO DE RESEÑAS CON FIREBASE (Persistencia Real) ---
    const starsContainer = document.getElementById("form-stars");
    const starIcons = starsContainer.querySelectorAll("i");
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
    const reviewsRef = database.ref("reviews");

    // Guardar en Firebase
    reviewForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (selectedRating === 0) {
            alert("Por favor selecciona una calificación de 1 a 5 estrellas.");
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

    // Leer en tiempo real desde Firebase para TODOS los usuarios
    reviewsRef.on("value", (snapshot) => {
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
});