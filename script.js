// =================================================================
// 1. CONFIGURACIÓN DE FIREBASE Y PASARELAS DE PAGO
// =================================================================
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

const CONFIG_PAGO = {
  boldBaseUrl: "https://bold.co/p/tu-link-de-bold", // Reemplaza con tu link de cobro Bold
  pseUrl: "https://www.pse.com.co",                // Reemplaza con tu enlace PSE
  whatsappNumber: "573176653331",                  // WhatsApp oficial de AG Executive Driver
  porcentajeRecargoBold: 0.04,                      // 4% de comisión
  adminPassword: "Olc.26colec*"                   // Clave del Panel de Administración
};

// Obtener instancia segura de Firebase Realtime Database
function getDB() {
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    return firebase.database();
  }
  return null;
}

// Variables globales de estado
let calculatedTripData = null;
let activeInvoiceData = null;
let selectedStarRating = 5;

// =================================================================
// 2. FUNCIONES GLOBALES (ACCESIBLES DESDE EL HTML)
// =================================================================

/**
 * Actualiza los totales de la factura cuando el usuario cambia el método de pago
 */
window.actualizarResumenPago = function() {
  if (!activeInvoiceData) return;

  const radioCard = document.getElementById("pay-card");
  const radioPse = document.getElementById("pay-pse");
  const surchargeLine = document.getElementById("surcharge-line");
  const invSurcharge = document.getElementById("inv-surcharge");
  const invTotalPrice = document.getElementById("inv-total-price");
  const invBasePrice = document.getElementById("inv-base-price");

  const base = activeInvoiceData.basePrice || 0;

  if (radioCard && radioCard.checked) {
    const recargo = Math.round(base * CONFIG_PAGO.porcentajeRecargoBold);
    const total = base + recargo;

    activeInvoiceData.selectedMethod = "bold";
    activeInvoiceData.surcharge = recargo;
    activeInvoiceData.finalTotal = total;

    if (surchargeLine) surchargeLine.style.display = "flex";
    if (invSurcharge) invSurcharge.textContent = `$${recargo.toLocaleString('es-CO')} COP`;
    if (invTotalPrice) invTotalPrice.textContent = `$${total.toLocaleString('es-CO')} COP`;
  } else if (radioPse && radioPse.checked) {
    activeInvoiceData.selectedMethod = "pse";
    activeInvoiceData.surcharge = 0;
    activeInvoiceData.finalTotal = base;

    if (surchargeLine) surchargeLine.style.display = "none";
    if (invTotalPrice) invTotalPrice.textContent = `$${base.toLocaleString('es-CO')} COP`;
  } else {
    activeInvoiceData.selectedMethod = "efectivo_destino";
    activeInvoiceData.surcharge = 0;
    activeInvoiceData.finalTotal = base;

    if (surchargeLine) surchargeLine.style.display = "none";
    if (invTotalPrice) invTotalPrice.textContent = `$${base.toLocaleString('es-CO')} COP`;
  }

  if (invBasePrice) invBasePrice.textContent = `$${base.toLocaleString('es-CO')} COP`;
};

/**
 * Genera consecutivo en Firebase, guarda el servicio y redirige a WhatsApp
 */
window.procesarReservaYPago = async function(event) {
  if (event) event.preventDefault();

  if (!activeInvoiceData) {
    alert("Por favor calcula la tarifa de tu viaje antes de continuar.");
    return;
  }

  const btn = document.getElementById("btnProcesarReserva");
  const db = getDB();

  let methodText = "";
  let enlacePago = "";

  if (activeInvoiceData.selectedMethod === "bold") {
    methodText = "Tarjeta de Crédito / Débito (Bold +4%)";
    enlacePago = `${CONFIG_PAGO.boldBaseUrl}?amount=${activeInvoiceData.finalTotal}`;
  } else if (activeInvoiceData.selectedMethod === "pse") {
    methodText = "Transferencia Bancaria en Línea (PSE / Nequi)";
    enlacePago = CONFIG_PAGO.pseUrl;
  } else {
    methodText = "Efectivo o Transferencia al finalizar el viaje";
    enlacePago = "Pago en destino";
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando reserva...';
    }

    // 1. Guardar en Firebase Realtime Database
    if (db) {
      await db.ref(`facturas/${activeInvoiceData.invoiceNum}`).set({
        consecutivo: activeInvoiceData.invoiceNum,
        origen: activeInvoiceData.tripData.origin,
        destino: activeInvoiceData.tripData.destination,
        paradas: (activeInvoiceData.tripData.stops || []).join(" | ") || "Sin paradas intermedias",
        distancia: `${activeInvoiceData.tripData.distanceKm} km`,
        tiempo: `${activeInvoiceData.tripData.totalDurationMin} min`,
        tarifaBase: activeInvoiceData.basePrice,
        recargo: activeInvoiceData.surcharge,
        totalPagar: activeInvoiceData.finalTotal,
        metodoPago: methodText,
        enlacePago: enlacePago,
        estadoPago: activeInvoiceData.selectedMethod === "efectivo_destino" ? "Pendiente en Destino" : "Pendiente en Línea",
        fechaCreacion: new Date().toLocaleString('es-CO')
      });
    }

    // 2. Formatear mensaje para WhatsApp
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
      `💳 *Método de Pago:* ${methodText}\n`;

    if (activeInvoiceData.surcharge > 0) {
      invoiceMsg += `💵 *Valor Base:* $${activeInvoiceData.basePrice.toLocaleString('es-CO')} COP\n` +
        `⚡ *Comisión Datafono (4%):* $${activeInvoiceData.surcharge.toLocaleString('es-CO')} COP\n`;
    }

    invoiceMsg += `💰 *TOTAL A PAGAR:* $${activeInvoiceData.finalTotal.toLocaleString('es-CO')} COP\n\n` +
      `Quedo atento a la confirmación de la reserva. ¡Muchas gracias!`;

    // 3. Abrir WhatsApp
    const urlWA = `https://wa.me/${CONFIG_PAGO.whatsappNumber}?text=${encodeURIComponent(invoiceMsg)}`;
    window.open(urlWA, "_blank");

    // 4. Si eligió pasarela en línea, abrir el portal
    if (activeInvoiceData.selectedMethod === "bold" || activeInvoiceData.selectedMethod === "pse") {
      setTimeout(() => {
        window.open(enlacePago, "_blank");
      }, 1500);
    }

  } catch (error) {
    console.error("Error al procesar reserva:", error);
    alert("Hubo un detalle al guardar en la BD, pero serás redirigido a WhatsApp para completar la reserva.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Confirmar Reserva y Agendar por WhatsApp';
    }
  }
};

// --- FUNCIONES DEL PANEL DE ADMINISTRACIÓN ---
window.autenticarAdmin = function() {
  const clave = prompt("Ingresa la contraseña de administración:");
  if (clave === CONFIG_PAGO.adminPassword) {
    const adminSection = document.getElementById("adminPanelSection");
    if (adminSection) {
      adminSection.style.display = "block";
      window.cargarFacturasAdmin();
      adminSection.scrollIntoView({ behavior: 'smooth' });
    }
  } else if (clave !== null) {
    alert("Contraseña incorrecta.");
  }
};

window.cerrarAdmin = function() {
  const adminSection = document.getElementById("adminPanelSection");
  if (adminSection) adminSection.style.display = "none";
};

window.cargarFacturasAdmin = function() {
  const tbody = document.getElementById("listaFacturasBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando registros de Firebase...</td></tr>';

  const db = getDB();
  if (!db) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#ef4444;">Sin conexión a Firebase.</td></tr>';
    return;
  }

  db.ref("facturas").orderByKey().once("value", (snapshot) => {
    tbody.innerHTML = "";
    if (!snapshot.exists()) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay facturas registradas.</td></tr>';
      return;
    }

    snapshot.forEach((child) => {
      const f = child.val();
      let badgeClass = "badge-pendiente";
      if (f.estadoPago === "Completado") badgeClass = "badge-completado";
      if (f.estadoPago === "Cancelado") badgeClass = "badge-cancelado";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${f.consecutivo}</strong></td>
        <td><small>${f.fechaCreacion || '-'}</small></td>
        <td>${f.cliente || 'Cliente Web'}</td>
        <td><small>${f.origen} ➔ ${f.destino}</small></td>
        <td><small>${f.metodoPago}</small></td>
        <td><strong>$${(f.totalPagar || 0).toLocaleString('es-CO')} COP</strong></td>
        <td><span class="badge ${badgeClass}">${f.estadoPago}</span></td>
        <td>
          <select onchange="window.cambiarEstadoFactura('${f.consecutivo}', this.value)" style="padding: 4px; font-size: 0.8rem; border-radius: 4px; background: #000; color: #fff; border: 1px solid #333;">
            <option value="">Estado...</option>
            <option value="Completado">Completado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </td>
      `;
      tbody.prepend(row);
    });
  });
};

window.cambiarEstadoFactura = function(consecutivo, nuevoEstado) {
  if (!nuevoEstado) return;
  const db = getDB();
  if (!db) return;

  db.ref(`facturas/${consecutivo}`).update({ estadoPago: nuevoEstado }, (error) => {
    if (!error) {
      alert(`Factura ${consecutivo} actualizada a: ${nuevoEstado}`);
      window.cargarFacturasAdmin();
    } else {
      alert("Error al actualizar el estado.");
    }
  });
};

window.filtrarTablaAdmin = function() {
  const queryInput = document.getElementById("adminSearchInput");
  if (!queryInput) return;
  const query = queryInput.value.toLowerCase();
  const rows = document.querySelectorAll("#listaFacturasBody tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
};

// =================================================================
// 3. GENERADOR DE CONSECUTIVO ATÓMICO EN FIREBASE
// =================================================================
async function obtenerSiguienteConsecutivo() {
  const db = getDB();
  if (db) {
    try {
      const counterRef = db.ref("configuracion/ultimoConsecutivo");
      const result = await counterRef.transaction((currentValue) => {
        return (currentValue || 1000) + 1;
      });
      return `AG-INV-${result.snapshot.val()}`;
    } catch (e) {
      console.warn("Error en transacción Firebase, usando respaldo local:", e);
    }
  }
  let currentNumber = parseInt(localStorage.getItem("ag_inv_counter") || "1000", 10) + 1;
  localStorage.setItem("ag_inv_counter", currentNumber);
  return `AG-INV-${currentNumber}`;
}

// Desplegar Factura
async function displayInvoice(tripData, basePriceNumeric) {
  const invoiceNum = await obtenerSiguienteConsecutivo();
  const today = new Date().toLocaleDateString('es-CO', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const invConsecutive = document.getElementById("inv-consecutive");
  const invDate = document.getElementById("inv-date");
  const invOrigin = document.getElementById("inv-origin");
  const invDestination = document.getElementById("inv-destination");
  const invDistance = document.getElementById("inv-distance");
  const invTime = document.getElementById("inv-time");
  const invStopsContainer = document.getElementById("inv-stops-container");
  const invoiceSection = document.getElementById("invoice-section");

  if (invConsecutive) invConsecutive.textContent = invoiceNum;
  if (invDate) invDate.textContent = today;
  if (invOrigin) invOrigin.textContent = tripData.origin;
  if (invDestination) invDestination.textContent = tripData.destination;
  if (invDistance) invDistance.textContent = `${tripData.distanceKm} km`;
  if (invTime) invTime.textContent = `${tripData.totalDurationMin} min (${tripData.drivingMin} min ruta + ${tripData.totalWaitMin} min espera)`;

  if (invStopsContainer) {
    invStopsContainer.innerHTML = "";
    if (tripData.stops && tripData.stops.length > 0) {
      tripData.stops.forEach((stop, idx) => {
        const stopDiv = document.createElement("div");
        stopDiv.className = "detail-row";
        stopDiv.innerHTML = `<span><i class="fas fa-map-pin"></i> Parada ${idx + 1}:</span> <strong>${stop}</strong>`;
        invStopsContainer.appendChild(stopDiv);
      });
    }
  }

  activeInvoiceData = {
    invoiceNum,
    date: today,
    tripData,
    basePrice: basePriceNumeric,
    selectedMethod: "efectivo_destino",
    finalTotal: basePriceNumeric,
    surcharge: 0
  };

  window.actualizarResumenPago();

  if (invoiceSection) {
    invoiceSection.style.display = "block";
    invoiceSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// =================================================================
// 4. INICIALIZACIÓN DE ELEMENTOS DOM
// =================================================================
document.addEventListener("DOMContentLoaded", () => {

  // --- CAMBIO DE IDIOMA ---
  const btnEs = document.getElementById("btn-es");
  const btnEn = document.getElementById("btn-en");
  const translateElements = document.querySelectorAll("[data-es]");

  function changeLanguage(lang) {
    translateElements.forEach(elem => {
      elem.textContent = (lang === "es") ? elem.getAttribute("data-es") : elem.getAttribute("data-en");
    });
    if (btnEs) btnEs.classList.toggle("active", lang === "es");
    if (btnEn) btnEn.classList.toggle("active", lang === "en");
  }

  if (btnEs) btnEs.addEventListener("click", () => changeLanguage("es"));
  if (btnEn) btnEn.addEventListener("click", () => changeLanguage("en"));

  // --- COTIZADOR CON PARADAS MÚLTIPLES Y PEAJES ---
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

  if (tollCheck && tollsNumberBox) {
    tollCheck.addEventListener("change", () => {
      tollsNumberBox.style.display = tollCheck.checked ? "block" : "none";
    });
  }

  // Agregar Parada Dinámica
  if (btnAddStop && stopsContainer) {
    btnAddStop.addEventListener("click", () => {
      const currentStops = stopsContainer.querySelectorAll(".stop-input-row").length;
      if (currentStops >= 4) {
        alert("Puedes agregar un máximo de 4 paradas intermedias.");
        return;
      }

      const stopRow = document.createElement("div");
      stopRow.className = "stop-input-row";
      stopRow.style.cssText = "display:flex; gap:10px; align-items:center; margin-top:10px;";
      stopRow.innerHTML = `
        <div class="input-icon" style="flex:1;">
          <i class="fas fa-map-pin"></i>
          <input type="text" class="stop-input" placeholder="Parada ${currentStops + 1} (Ej: Centro Comercial Chipichape)" required>
        </div>
        <button type="button" class="btn-remove-stop" title="Eliminar parada" style="background:#3a1515; color:#ff6b6b; border:1px solid #5a2020; width:45px; height:45px; border-radius:4px; cursor:pointer;">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;

      stopsContainer.appendChild(stopRow);

      const newInput = stopRow.querySelector(".stop-input");
      if (window.google && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(newInput);
      }

      stopRow.querySelector(".btn-remove-stop").addEventListener("click", () => {
        stopRow.remove();
      });
    });
  }

  // Inicializar Google Autocomplete en Inputs Principales
  function initMapsAutocomplete() {
    if (window.google && google.maps && google.maps.places) {
      if (originInput) new google.maps.places.Autocomplete(originInput);
      if (destinationInput) new google.maps.places.Autocomplete(destinationInput);
    }
  }
  setTimeout(initMapsAutocomplete, 800);

  // Calcular tarifa con Google Maps Directions API
  if (calcForm) {
    calcForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const origin = originInput ? originInput.value.trim() : "";
      const destination = destinationInput ? destinationInput.value.trim() : "";

      if (!origin || !destination) {
        alert("Por favor ingresa un origen y un destino.");
        return;
      }

      if (!window.google || !google.maps || !google.maps.DirectionsService) {
        alert("Atención: La API de Google Maps no está cargada. Revisa tu API Key.");
        return;
      }

      const stopInputs = Array.from(stopsContainer ? stopsContainer.querySelectorAll(".stop-input") : [])
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

          route.legs.forEach(leg => {
            totalDistanceMeters += leg.distance.value;
            totalDrivingSeconds += leg.duration.value;
          });

          const distanceKm = totalDistanceMeters / 1000;
          const drivingMin = Math.round(totalDrivingSeconds / 60);
          const totalWaitMin = stopInputs.length * 5;
          const totalDurationMin = drivingMin + totalWaitMin;

          // Fórmula de tarifa
          const tiempoIdeal = (distanceKm * 60) / 36;
          let cargoTiempoExtra = 0;
          if ((totalDurationMin - tiempoIdeal) > 0) {
            cargoTiempoExtra = (totalDurationMin - tiempoIdeal) * (35583 / 60);
          }

          const tienePeaje = tollCheck ? tollCheck.checked : false;
          const numPeajes = tienePeaje ? (parseInt(tollsCount.value) || 1) : 0;
          const costoPeajes = tienePeaje ? (13300 * numPeajes) : 0;

          let tarifaTotal = (distanceKm * 2087) + cargoTiempoExtra + costoPeajes;
          tarifaTotal = Math.max(15000, Math.round(tarifaTotal / 1000) * 1000);

          if (resDistance) resDistance.textContent = `${distanceKm.toFixed(1)} km`;
          if (resTime) resTime.textContent = `${totalDurationMin} min (${drivingMin} min ruta + ${totalWaitMin} min espera)`;
          if (resPrice) resPrice.textContent = `$${tarifaTotal.toLocaleString('es-CO')} COP`;
          if (calcResult) calcResult.style.display = "block";

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

          // Desplegar Factura
          displayInvoice(calculatedTripData, tarifaTotal);

        } else {
          alert("No se pudo calcular la ruta. Revisa las direcciones ingresadas.");
        }
      });
    });
  }

  // --- MANEJO DE RESEÑAS Y ESTRELLAS (FIREBASE) ---
  const starsContainer = document.getElementById("form-stars");
  const starIcons = starsContainer ? starsContainer.querySelectorAll("i") : [];

  starIcons.forEach(star => {
    star.addEventListener("click", () => {
      selectedStarRating = parseInt(star.getAttribute("data-value"));
      starIcons.forEach(s => {
        const val = parseInt(s.getAttribute("data-value"));
        s.className = (val <= selectedStarRating) ? "fas fa-star" : "far fa-star";
      });
    });
  });

  const reviewForm = document.getElementById("review-form");
  const reviewsContainer = document.getElementById("reviews-container");
  const db = getDB();

  if (db) {
    const reviewsRef = db.ref("reviews");

    // Guardar reseña
    if (reviewForm) {
      reviewForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const reviewerName = document.getElementById("reviewer-name")?.value.trim();
        const reviewerText = document.getElementById("reviewer-text")?.value.trim();

        if (!reviewerName || !reviewerText) return;

        reviewsRef.push({
          name: reviewerName,
          text: reviewerText,
          rating: selectedStarRating,
          timestamp: Date.now()
        }).then(() => {
          reviewForm.reset();
          selectedStarRating = 5;
          starIcons.forEach(s => s.className = "fas fa-star");
          alert("¡Muchas gracias por tu opinión!");
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

      const reviewsArray = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);

      reviewsArray.forEach(rev => {
        const card = document.createElement("div");
        card.className = "review-card";

        let starsHtml = '<div class="stars">';
        for (let i = 1; i <= 5; i++) {
          starsHtml += (i <= rev.rating) ? '<i class="fas fa-star"></i> ' : '<i class="far fa-star"></i> ';
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