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

            // --- DENTRO DE LA CALCULADORA EXISTENTE EN script.js ---
// ... después de calcular tarifaTotal y resPrice.textContent ...

// LÍNEA NUEVA PARA CONECTAR LA FACTURA:
displayInvoice(calculatedTripData, tarifaTotal);

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
// --- LÓGICA DE FACTURACIÓN Y PASARELA DE PAGOS ---

// Referencias a la Invoice y Métodos de Pago
const invoiceSection = document.getElementById("invoice-section");
const invConsecutive = document.getElementById("inv-consecutive");
const invDate = document.getElementById("inv-date");
const invOrigin = document.getElementById("inv-origin");
const invStopsContainer = document.getElementById("inv-stops-container");
const invDestination = document.getElementById("inv-destination");
const invDistance = document.getElementById("inv-distance");
const invTime = document.getElementById("inv-time");

const invBasePrice = document.getElementById("inv-base-price");
const invSurcharge = document.getElementById("inv-surcharge");
const invTotalPrice = document.getElementById("inv-total-price");
const surchargeLine = document.getElementById("surcharge-line");

const radioCard = document.getElementById("pay-card");
const radioPse = document.getElementById("pay-pse");
const radioCash = document.getElementById("pay-cash");

const btnPayBold = document.getElementById("btn-pay-bold");
const btnPayPse = document.getElementById("btn-pay-pse");
const btnConfirmWhatsapp = document.getElementById("btn-confirm-whatsapp");

// Generador de Consecutivo de Factura
function getNextInvoiceNumber() {
    let currentNumber = localStorage.getItem("ag_inv_counter") || 1000;
    currentNumber = parseInt(currentNumber) + 1;
    localStorage.setItem("ag_inv_counter", currentNumber);
    return `AG-INV-${currentNumber}`;
}

let activeInvoiceData = null;

// Modificación en el evento Submit de la calculadora cuando la cotización es Exitosa:
// (Agrega estas líneas dentro del callback OK de DirectionsService):
function displayInvoice(tripData, basePriceNumeric) {
    const invoiceNum = getNextInvoiceNumber();
    const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    invConsecutive.textContent = invoiceNum;
    invDate.textContent = today;
    invOrigin.textContent = tripData.origin;
    invDestination.textContent = tripData.destination;
    invDistance.textContent = `${tripData.distanceKm} km`;
    invTime.textContent = `${tripData.totalDurationMin} min (${tripData.drivingMin} min ruta + ${tripData.totalWaitMin} min espera)`;

    // Renderizar paradas en la factura si existen
    invStopsContainer.innerHTML = "";
    if (tripData.stops && tripData.stops.length > 0) {
        tripData.stops.forEach((stop, idx) => {
            const stopDiv = document.createElement("div");
            stopDiv.className = "detail-row";
            stopDiv.innerHTML = `<span><i class="fas fa-map-pin"></i> Parada ${idx + 1}:</span> <strong>${stop}</strong>`;
            invStopsContainer.appendChild(stopDiv);
        });
    }

    activeInvoiceData = {
        invoiceNum,
        date: today,
        tripData,
        basePrice: basePriceNumeric,
        selectedMethod: "cash",
        finalTotal: basePriceNumeric,
        surcharge: 0
    };

    updateInvoiceTotals();
    invoiceSection.style.display = "block";
    invoiceSection.scrollIntoView({ behavior: 'smooth' });
}

// Recalcular Totales según Método de Pago seleccionado (Tarjeta +4% Bold)
function updateInvoiceTotals() {
    if (!activeInvoiceData) return;

    const base = activeInvoiceData.basePrice;

    if (radioCard.checked) {
        // Comisión del 4% para Bold
        const surcharge = Math.round(base * 0.04);
        const total = base + surcharge;

        activeInvoiceData.selectedMethod = "card";
        activeInvoiceData.surcharge = surcharge;
        activeInvoiceData.finalTotal = total;

        surchargeLine.style.display = "flex";
        invSurcharge.textContent = `$${surcharge.toLocaleString('es-CO')} COP`;
        invTotalPrice.textContent = `$${total.toLocaleString('es-CO')} COP`;

        btnPayBold.style.display = "flex";
        btnPayPse.style.display = "none";
        btnConfirmWhatsapp.style.display = "flex"; // También opción de enviar la factura con tarjeta reservada
    } else if (radioPse.checked) {
        activeInvoiceData.selectedMethod = "pse";
        activeInvoiceData.surcharge = 0;
        activeInvoiceData.finalTotal = base;

        surchargeLine.style.display = "none";
        invTotalPrice.textContent = `$${base.toLocaleString('es-CO')} COP`;

        btnPayBold.style.display = "none";
        btnPayPse.style.display = "flex";
        btnConfirmWhatsapp.style.display = "flex";
    } else {
        // Efectivo / Transferencia al finalizar
        activeInvoiceData.selectedMethod = "cash";
        activeInvoiceData.surcharge = 0;
        activeInvoiceData.finalTotal = base;

        surchargeLine.style.display = "none";
        invTotalPrice.textContent = `$${base.toLocaleString('es-CO')} COP`;

        btnPayBold.style.display = "none";
        btnPayPse.style.display = "none";
        btnConfirmWhatsapp.style.display = "flex";
    }

    invBasePrice.textContent = `$${base.toLocaleString('es-CO')} COP`;
}

// Escuchar cambios en los radio buttons de pago
[radioCard, radioPse, radioCash].forEach(radio => {
    radio.addEventListener("change", updateInvoiceTotals);
});

// ACCIÓN 1: Botón Bold (Tarjeta de Crédito en Línea / Datáfono)
btnPayBold.addEventListener("click", () => {
    alert(`Redirigiendo a Pasarela de Pago Bold para el Invoice ${activeInvoiceData.invoiceNum}.\n\nMonto a cobrar: $${activeInvoiceData.finalTotal.toLocaleString('es-CO')} COP (Incluye 4% comisión datafono).`);
    
    // Aquí puedes enlazar tu Link de Pago de Bold o el SDK de Bold Checkout:
    // window.location.href = "https://bold.co/p/tu-link-de-pago";
});

// ACCIÓN 2: Botón PSE (Transferencia Bancaria en Línea)
btnPayPse.addEventListener("click", () => {
    alert(`Redirigiendo a PSE / Portal de Transferencia para el Invoice ${activeInvoiceData.invoiceNum}.\n\nMonto a transferir: $${activeInvoiceData.finalTotal.toLocaleString('es-CO')} COP.`);
    
    // Puedes enlazar tu Link directo de PSE / Nequi / Wompi / Bold PSE:
    // window.location.href = "https://tu-link-pse.com";
});

// ACCIÓN 3: Enviar Factura Detallada a WhatsApp
btnConfirmWhatsapp.addEventListener("click", () => {
    if (!activeInvoiceData) return;

    let methodText = "";
    if (activeInvoiceData.selectedMethod === "card") {
        methodText = "💳 Tarjeta de Crédito / Débito (Bold +4%) - *Para cobrar con Datáfono o Link*";
    } else if (activeInvoiceData.selectedMethod === "pse") {
        methodText = "🏦 Transferencia Bancaria / PSE";
    } else {
        methodText = "💵 Efectivo o Transferencia al finalizar el viaje";
    }

    let stopsFormatted = "";
    if (activeInvoiceData.tripData.stops && activeInvoiceData.tripData.stops.length > 0) {
        stopsFormatted = "\n🛑 *Paradas intermedias:*\n" + activeInvoiceData.tripData.stops.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
    }

    let invoiceMsg = `*AG EXECUTIVE DRIVER - FACTURA / INVOICE*\n` +
        `🧾 *N° Factura:* ${activeInvoiceData.invoiceNum}\n` +
        `📅 *Fecha:* ${activeInvoiceData.date}\n\n` +
        `📍 *Origen:* ${activeInvoiceData.tripData.origin}${stopsFormatted}\n` +
        `🏁 *Destino:* ${activeInvoiceData.tripData.destination}\n\n` +
        `📏 *Distancia:* ${activeInvoiceData.tripData.distanceKm} km\n` +
        `⏱️ *Tiempo Total:* ${activeInvoiceData.tripData.totalDurationMin} min (${activeInvoiceData.tripData.drivingMin} min ruta + ${activeInvoiceData.tripData.totalWaitMin} min espera)\n\n` +
        `💳 *Método de Pago Seleccionado:* ${methodText}\n`;

    if (activeInvoiceData.surcharge > 0) {
        invoiceMsg += `💵 *Valor Base:* $${activeInvoiceData.basePrice.toLocaleString('es-CO')} COP\n` +
                       `⚡ *Comisión Datafono (4%):* $${activeInvoiceData.surcharge.toLocaleString('es-CO')} COP\n`;
    }

    invoiceMsg += `💰 *TOTAL A PAGAR:* $${activeInvoiceData.finalTotal.toLocaleString('es-CO')} COP\n\n` +
                   `Quedo atento a la confirmación de la reserva. ¡Muchas gracias!`;

    const url = `https://wa.me/573176653331?text=${encodeURIComponent(invoiceMsg)}`;
    window.open(url, "_blank");
});