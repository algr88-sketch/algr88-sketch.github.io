// =================================================================
// 1. INICIALIZACIÓN SEGURA DE FIREBASE
// =================================================================
var firebaseConfig = {
  apiKey: "AIzaSyBI7hzuEoHTBfvD3qi9pemIsgfv1OwEvpU",
  authDomain: "ag-executive.firebaseapp.com",
  databaseURL: "https://ag-executive-default-rtdb.firebaseio.com",
  projectId: "ag-executive",
  storageBucket: "ag-executive.firebasestorage.app",
  messagingSenderId: "611392539268",
  appId: "1:611392539268:web:2dafae6cd3e01d0f3bd0d1",
  measurementId: "G-V1E4ERNKY6"
};

if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var CONFIG_PAGO = {
  boldBaseUrl: "https://bold.co/p/tu-link-de-bold",
  pseUrl: "https://www.pse.com.co",
  whatsappNumber: "573176653331",
  porcentajeRecargoBold: 0.04,
  adminPassword: "Olc.26colec*"
};

function getDB() {
  try {
    if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length) {
      return firebase.database();
    }
  } catch (e) {
    console.warn("Firebase no disponible:", e);
  }
  return null;
}

var calculatedTripData = null;
var activeInvoiceData = null;
var selectedStarRating = 5;

// =================================================================
// 2. MOTOR UNIVERSAL DE TRADUCCIÓN (TEXTOS, PLACEHOLDERS E ÍCONOS)
// =================================================================
window.changeLanguage = function(lang) {
  var elements = document.querySelectorAll("[data-es]");
  elements.forEach(function(elem) {
    var text = elem.getAttribute("data-" + lang);
    if (!text) return;

    // Traducir Placeholders de Inputs y Textareas
    if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA") {
      elem.placeholder = text;
      return;
    }

    // Preservar Íconos FontAwesome (i tag)
    var icon = elem.querySelector("i");
    var span = elem.querySelector("span");

    if (span) {
      span.textContent = span.getAttribute("data-" + lang) || text;
    } else if (icon) {
      var iconHtml = icon.outerHTML;
      elem.innerHTML = iconHtml + " " + text;
    } else {
      elem.textContent = text;
    }
  });

  var btnEs = document.getElementById("btn-es");
  var btnEn = document.getElementById("btn-en");
  if (btnEs) btnEs.classList.toggle("active", lang === "es");
  if (btnEn) btnEn.classList.toggle("active", lang === "en");
};

// =================================================================
// 3. FACTURACIÓN Y CONTROL DE PAGOS
// =================================================================
window.actualizarResumenPago = function() {
  if (!activeInvoiceData) return;

  var radioCard = document.getElementById("pay-card");
  var radioPse = document.getElementById("pay-pse");
  var surchargeLine = document.getElementById("surcharge-line");
  var invSurcharge = document.getElementById("inv-surcharge");
  var invTotalPrice = document.getElementById("inv-total-price");
  var invBasePrice = document.getElementById("inv-base-price");

  var base = activeInvoiceData.basePrice || 0;

  if (radioCard && radioCard.checked) {
    var recargo = Math.round(base * CONFIG_PAGO.porcentajeRecargoBold);
    var total = base + recargo;

    activeInvoiceData.selectedMethod = "bold";
    activeInvoiceData.surcharge = recargo;
    activeInvoiceData.finalTotal = total;

    if (surchargeLine) surchargeLine.style.display = "flex";
    if (invSurcharge) invSurcharge.textContent = "$" + recargo.toLocaleString('es-CO') + " COP";
    if (invTotalPrice) invTotalPrice.textContent = "$" + total.toLocaleString('es-CO') + " COP";
  } else if (radioPse && radioPse.checked) {
    activeInvoiceData.selectedMethod = "pse";
    activeInvoiceData.surcharge = 0;
    activeInvoiceData.finalTotal = base;

    if (surchargeLine) surchargeLine.style.display = "none";
    if (invTotalPrice) invTotalPrice.textContent = "$" + base.toLocaleString('es-CO') + " COP";
  } else {
    activeInvoiceData.selectedMethod = "efectivo_destino";
    activeInvoiceData.surcharge = 0;
    activeInvoiceData.finalTotal = base;

    if (surchargeLine) surchargeLine.style.display = "none";
    if (invTotalPrice) invTotalPrice.textContent = "$" + base.toLocaleString('es-CO') + " COP";
  }

  if (invBasePrice) invBasePrice.textContent = "$" + base.toLocaleString('es-CO') + " COP";
};

window.procesarReservaYPago = async function(event) {
  if (event) event.preventDefault();

  if (!activeInvoiceData) {
    alert("Por favor calcula la tarifa de tu viaje antes de continuar.");
    return;
  }

  var btn = document.getElementById("btnProcesarReserva");
  var db = getDB();

  var methodText = "";
  var enlacePago = "";

  if (activeInvoiceData.selectedMethod === "bold") {
    methodText = "Tarjeta de Crédito / Débito (Bold +4%)";
    enlacePago = CONFIG_PAGO.boldBaseUrl + "?amount=" + activeInvoiceData.finalTotal;
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

    if (db) {
      await db.ref("facturas/" + activeInvoiceData.invoiceNum).set({
        consecutivo: activeInvoiceData.invoiceNum,
        origen: activeInvoiceData.tripData.origin,
        destino: activeInvoiceData.tripData.destination,
        paradas: (activeInvoiceData.tripData.stops || []).join(" | ") || "Sin paradas intermedias",
        distancia: activeInvoiceData.tripData.distanceKm + " km",
        tiempo: activeInvoiceData.tripData.totalDurationMin + " min",
        tarifaBase: activeInvoiceData.basePrice,
        recargo: activeInvoiceData.surcharge,
        totalPagar: activeInvoiceData.finalTotal,
        metodoPago: methodText,
        enlacePago: enlacePago,
        estadoPago: activeInvoiceData.selectedMethod === "efectivo_destino" ? "Pendiente en Destino" : "Pendiente en Línea",
        fechaCreacion: new Date().toLocaleString('es-CO')
      });
    }

    var stopsFormatted = "";
    if (activeInvoiceData.tripData.stops && activeInvoiceData.tripData.stops.length > 0) {
      stopsFormatted = "\n🛑 *Paradas intermedias:*\n" + activeInvoiceData.tripData.stops.map(function(s, i) { return "  " + (i + 1) + ". " + s; }).join("\n");
    }

    var invoiceMsg = "*AG EXECUTIVE DRIVER - FACTURA / INVOICE*\n" +
      "🧾 *N° Factura:* " + activeInvoiceData.invoiceNum + "\n" +
      "📅 *Fecha:* " + activeInvoiceData.date + "\n\n" +
      "📍 *Origen:* " + activeInvoiceData.tripData.origin + stopsFormatted + "\n" +
      "🏁 *Destino:* " + activeInvoiceData.tripData.destination + "\n\n" +
      "📏 *Distancia:* " + activeInvoiceData.tripData.distanceKm + " km\n" +
      "⏱️ *Tiempo Total:* " + activeInvoiceData.tripData.totalDurationMin + " min (" + activeInvoiceData.tripData.drivingMin + " min ruta + " + activeInvoiceData.tripData.totalWaitMin + " min espera)\n\n" +
      "💳 *Método de Pago:* " + methodText + "\n";

    if (activeInvoiceData.surcharge > 0) {
      invoiceMsg += "💵 *Valor Base:* $" + activeInvoiceData.basePrice.toLocaleString('es-CO') + " COP\n" +
        "⚡ *Comisión Datafono (4%):* $" + activeInvoiceData.surcharge.toLocaleString('es-CO') + " COP\n";
    }

    invoiceMsg += "💰 *TOTAL A PAGAR:* $" + activeInvoiceData.finalTotal.toLocaleString('es-CO') + " COP\n\n" +
      "Quedo atento a la confirmación de la reserva. ¡Muchas gracias!";

    var urlWA = "https://wa.me/" + CONFIG_PAGO.whatsappNumber + "?text=" + encodeURIComponent(invoiceMsg);
    window.open(urlWA, "_blank");

    if (activeInvoiceData.selectedMethod === "bold" || activeInvoiceData.selectedMethod === "pse") {
      setTimeout(function() {
        window.open(enlacePago, "_blank");
      }, 1500);
    }

  } catch (error) {
    console.error("Error al procesar reserva:", error);
    alert("Reserva enviada a WhatsApp.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar Reserva y Agendar por WhatsApp';
    }
  }
};

// =================================================================
// 4. PANEL DE ADMINISTRACIÓN
// =================================================================
window.autenticarAdmin = function() {
  var clave = prompt("Ingresa la contraseña de administración:");
  if (clave === CONFIG_PAGO.adminPassword) {
    var adminSection = document.getElementById("adminPanelSection");
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
  var adminSection = document.getElementById("adminPanelSection");
  if (adminSection) adminSection.style.display = "none";
};

window.cargarFacturasAdmin = function() {
  var tbody = document.getElementById("listaFacturasBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando registros...</td></tr>';

  var db = getDB();
  if (!db) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#ef4444;">Sin conexión a Firebase.</td></tr>';
    return;
  }

  db.ref("facturas").orderByKey().once("value", function(snapshot) {
    tbody.innerHTML = "";
    if (!snapshot.exists()) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay facturas registradas.</td></tr>';
      return;
    }

    snapshot.forEach(function(child) {
      var f = child.val();
      var badgeClass = "badge-pendiente";
      if (f.estadoPago === "Completado") badgeClass = "badge-completado";
      if (f.estadoPago === "Cancelado") badgeClass = "badge-cancelado";

      var row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${f.consecutivo || '-'}</strong></td>
        <td><small>${f.fechaCreacion || '-'}</small></td>
        <td>${f.cliente || 'Cliente Web'}</td>
        <td><small>${f.origen || '-'} ➔ ${f.destino || '-'}</small></td>
        <td><small>${f.metodoPago || '-'}</small></td>
        <td><strong>$${(f.totalPagar || 0).toLocaleString('es-CO')} COP</strong></td>
        <td><span class="badge ${badgeClass}">${f.estadoPago || 'Pendiente'}</span></td>
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
  var db = getDB();
  if (!db) return;

  db.ref("facturas/" + consecutivo).update({ estadoPago: nuevoEstado }, function(error) {
    if (!error) {
      alert("Factura " + consecutivo + " actualizada a: " + nuevoEstado);
      window.cargarFacturasAdmin();
    } else {
      alert("Error al actualizar el estado.");
    }
  });
};

window.filtrarTablaAdmin = function() {
  var queryInput = document.getElementById("adminSearchInput");
  if (!queryInput) return;
  var query = queryInput.value.toLowerCase();
  var rows = document.querySelectorAll("#listaFacturasBody tr");

  rows.forEach(function(row) {
    var text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
};

// =================================================================
// 5. GENERACIÓN DE FACTURAS Y COTIZADOR
// =================================================================
async function obtenerSiguienteConsecutivo() {
  var db = getDB();
  if (db) {
    try {
      var counterRef = db.ref("configuracion/ultimoConsecutivo");
      var result = await counterRef.transaction(function(currentValue) {
        return (currentValue || 1000) + 1;
      });
      if (result && result.snapshot && result.snapshot.val()) {
        return "AG-INV-" + result.snapshot.val();
      }
    } catch (e) {
      console.warn("Usando consecutivo local:", e);
    }
  }
  var currentNumber = parseInt(localStorage.getItem("ag_inv_counter") || "1000", 10) + 1;
  localStorage.setItem("ag_inv_counter", currentNumber);
  return "AG-INV-" + currentNumber;
}

async function displayInvoice(tripData, basePriceNumeric) {
  var invoiceNum = await obtenerSiguienteConsecutivo();
  var today = new Date().toLocaleDateString('es-CO', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  var invConsecutive = document.getElementById("inv-consecutive");
  var invDate = document.getElementById("inv-date");
  var invOrigin = document.getElementById("inv-origin");
  var invDestination = document.getElementById("inv-destination");
  var invDistance = document.getElementById("inv-distance");
  var invTime = document.getElementById("inv-time");
  var invStopsContainer = document.getElementById("inv-stops-container");
  var invoiceSection = document.getElementById("invoice-section");

  if (invConsecutive) invConsecutive.textContent = invoiceNum;
  if (invDate) invDate.textContent = today;
  if (invOrigin) invOrigin.textContent = tripData.origin;
  if (invDestination) invDestination.textContent = tripData.destination;
  if (invDistance) invDistance.textContent = tripData.distanceKm + " km";
  if (invTime) invTime.textContent = tripData.totalDurationMin + " min (" + tripData.drivingMin + " min ruta + " + tripData.totalWaitMin + " min espera)";

  if (invStopsContainer) {
    invStopsContainer.innerHTML = "";
    if (tripData.stops && tripData.stops.length > 0) {
      tripData.stops.forEach(function(stop, idx) {
        var stopDiv = document.createElement("div");
        stopDiv.className = "detail-row";
        stopDiv.innerHTML = '<span><i class="fas fa-map-pin"></i> Parada ' + (idx + 1) + ':</span> <strong>' + stop + '</strong>';
        invStopsContainer.appendChild(stopDiv);
      });
    }
  }

  activeInvoiceData = {
    invoiceNum: invoiceNum,
    date: today,
    tripData: tripData,
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
// 6. INICIALIZADOR DE EVENTOS (DOM)
// =================================================================
document.addEventListener("DOMContentLoaded", function() {

  var originInput = document.getElementById("origin-input");
  var destinationInput = document.getElementById("destination-input");
  var stopsContainer = document.getElementById("stops-container");
  var btnAddStop = document.getElementById("btn-add-stop");

  var tollCheck = document.getElementById("toll-check");
  var tollsNumberBox = document.getElementById("tolls-number-box");
  var tollsCount = document.getElementById("tolls-count");

  var calcForm = document.getElementById("calc-form");
  var calcResult = document.getElementById("calc-result");
  var resTime = document.getElementById("res-time");
  var resDistance = document.getElementById("res-distance");
  var resPrice = document.getElementById("res-price");

  if (tollCheck && tollsNumberBox) {
    tollCheck.addEventListener("change", function() {
      tollsNumberBox.style.display = tollCheck.checked ? "block" : "none";
    });
  }

  // Paradas intermedias
  if (btnAddStop && stopsContainer) {
    btnAddStop.addEventListener("click", function() {
      var currentStops = stopsContainer.querySelectorAll(".stop-input-row").length;
      if (currentStops >= 4) {
        alert("Puedes agregar un máximo de 4 paradas intermedias.");
        return;
      }

      var stopRow = document.createElement("div");
      stopRow.className = "stop-input-row";
      stopRow.style.cssText = "display:flex; gap:10px; align-items:center; margin-top:10px;";
      stopRow.innerHTML = `
        <div class="input-icon" style="flex:1; position:relative;">
          <i class="fas fa-map-pin" style="position:absolute; left:15px; top:15px; color:#cfd4d9;"></i>
          <input type="text" class="stop-input" placeholder="Parada ${currentStops + 1} (Ej: Centro Comercial Chipichape)" required style="width:100%; padding:14px 14px 14px 45px; background:#000; border:1px solid #222; color:#fff; border-radius:4px;">
        </div>
        <button type="button" class="btn-remove-stop" title="Eliminar parada" style="background:#3a1515; color:#ff6b6b; border:1px solid #5a2020; width:45px; height:45px; border-radius:4px; cursor:pointer;">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;

      stopsContainer.appendChild(stopRow);

      var newInput = stopRow.querySelector(".stop-input");
      try {
        if (window.google && google.maps && google.maps.places) {
          new google.maps.places.Autocomplete(newInput);
        }
      } catch (e) {}

      stopRow.querySelector(".btn-remove-stop").addEventListener("click", function() {
        stopRow.remove();
      });
    });
  }

  // Autocomplete de Google Maps
  function initMapsAutocomplete() {
    try {
      if (window.google && google.maps && google.maps.places) {
        if (originInput) new google.maps.places.Autocomplete(originInput);
        if (destinationInput) new google.maps.places.Autocomplete(destinationInput);
      }
    } catch (err) {}
  }
  setTimeout(initMapsAutocomplete, 800);

  // Formulario de Cotización
  if (calcForm) {
    calcForm.addEventListener("submit", function(e) {
      e.preventDefault();

      var origin = originInput ? originInput.value.trim() : "";
      var destination = destinationInput ? destinationInput.value.trim() : "";

      if (!origin || !destination) {
        alert("Por favor ingresa un origen y un destino.");
        return;
      }

      var stopInputs = Array.from(stopsContainer ? stopsContainer.querySelectorAll(".stop-input") : [])
        .map(function(input) { return input.value.trim(); })
        .filter(function(val) { return val.length > 0; });

      var tienePeaje = tollCheck ? tollCheck.checked : false;
      var numPeajes = tienePeaje ? (parseInt(tollsCount.value) || 1) : 0;

      if (window.google && google.maps && google.maps.DirectionsService) {
        var waypoints = stopInputs.map(function(stopAddr) {
          return { location: stopAddr, stopover: true };
        });

        var directionsService = new google.maps.DirectionsService();

        directionsService.route({
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false
        }, function(result, status) {
          if (status === "OK") {
            var route = result.routes[0];
            var totalDistanceMeters = 0;
            var totalDrivingSeconds = 0;

            route.legs.forEach(function(leg) {
              totalDistanceMeters += leg.distance.value;
              totalDrivingSeconds += leg.duration.value;
            });

            var distanceKm = totalDistanceMeters / 1000;
            var drivingMin = Math.round(totalDrivingSeconds / 60);
            var totalWaitMin = stopInputs.length * 5;
            var totalDurationMin = drivingMin + totalWaitMin;

            var tiempoIdeal = (distanceKm * 60) / 36;
            var cargoTiempoExtra = 0;
            if ((totalDurationMin - tiempoIdeal) > 0) {
              cargoTiempoExtra = (totalDurationMin - tiempoIdeal) * (35583 / 60);
            }

            var costoPeajes = tienePeaje ? (13300 * numPeajes) : 0;
            var tarifaTotal = (distanceKm * 2087) + cargoTiempoExtra + costoPeajes;
            tarifaTotal = Math.max(15000, Math.round(tarifaTotal / 1000) * 1000);

            if (resDistance) resDistance.textContent = distanceKm.toFixed(1) + " km";
            if (resTime) resTime.textContent = totalDurationMin + " min (" + drivingMin + " min ruta + " + totalWaitMin + " min espera)";
            if (resPrice) resPrice.textContent = "$" + tarifaTotal.toLocaleString('es-CO') + " COP";
            if (calcResult) calcResult.style.display = "block";

            calculatedTripData = {
              origin: origin,
              destination: destination,
              stops: stopInputs,
              distanceKm: distanceKm.toFixed(1),
              drivingMin: drivingMin,
              totalWaitMin: totalWaitMin,
              totalDurationMin: totalDurationMin,
              price: "$" + tarifaTotal.toLocaleString('es-CO') + " COP"
            };

            displayInvoice(calculatedTripData, tarifaTotal);
          } else {
            procesarCotizacionFallback(origin, destination, stopInputs, tienePeaje, numPeajes);
          }
        });
      } else {
        procesarCotizacionFallback(origin, destination, stopInputs, tienePeaje, numPeajes);
      }
    });
  }

  function procesarCotizacionFallback(origin, destination, stopInputs, tienePeaje, numPeajes) {
    var distanceKm = 12.0;
    var drivingMin = 25;
    var totalWaitMin = stopInputs.length * 5;
    var totalDurationMin = drivingMin + totalWaitMin;

    var costoPeajes = tienePeaje ? (13300 * numPeajes) : 0;
    var tarifaTotal = (distanceKm * 2087) + costoPeajes;
    tarifaTotal = Math.max(15000, Math.round(tarifaTotal / 1000) * 1000);

    if (resDistance) resDistance.textContent = distanceKm.toFixed(1) + " km";
    if (resTime) resTime.textContent = totalDurationMin + " min (" + drivingMin + " min ruta + " + totalWaitMin + " min espera)";
    if (resPrice) resPrice.textContent = "$" + tarifaTotal.toLocaleString('es-CO') + " COP";
    if (calcResult) calcResult.style.display = "block";

    calculatedTripData = {
      origin: origin,
      destination: destination,
      stops: stopInputs,
      distanceKm: distanceKm.toFixed(1),
      drivingMin: drivingMin,
      totalWaitMin: totalWaitMin,
      totalDurationMin: totalDurationMin,
      price: "$" + tarifaTotal.toLocaleString('es-CO') + " COP"
    };

    displayInvoice(calculatedTripData, tarifaTotal);
  }

  // --- RESEÑAS CON FIREBASE ---
  var starsContainer = document.getElementById("form-stars");
  var starIcons = starsContainer ? starsContainer.querySelectorAll("i") : [];

  starIcons.forEach(function(star) {
    star.addEventListener("click", function() {
      selectedStarRating = parseInt(star.getAttribute("data-value"));
      starIcons.forEach(function(s) {
        var val = parseInt(s.getAttribute("data-value"));
        s.className = (val <= selectedStarRating) ? "fas fa-star" : "far fa-star";
      });
    });
  });

  var reviewForm = document.getElementById("review-form");
  var reviewsContainer = document.getElementById("reviews-container");
  var db = getDB();

  if (db) {
    try {
      var reviewsRef = db.ref("reviews");

      if (reviewForm) {
        reviewForm.addEventListener("submit", function(e) {
          e.preventDefault();
          var reviewerName = document.getElementById("reviewer-name") ? document.getElementById("reviewer-name").value.trim() : "";
          var reviewerText = document.getElementById("reviewer-text") ? document.getElementById("reviewer-text").value.trim() : "";

          if (!reviewerName || !reviewerText) return;

          reviewsRef.push({
            name: reviewerName,
            text: reviewerText,
            rating: selectedStarRating,
            timestamp: Date.now()
          }).then(function() {
            reviewForm.reset();
            selectedStarRating = 5;
            starIcons.forEach(function(s) { s.className = "fas fa-star"; });
            alert("¡Muchas gracias por tu opinión!");
          });
        });
      }

      reviewsRef.on("value", function(snapshot) {
        if (!reviewsContainer) return;
        reviewsContainer.innerHTML = "";
        var data = snapshot.val();
        if (!data) {
          reviewsContainer.innerHTML = '<p class="no-reviews">¡Sé el primero en calificar nuestro servicio!</p>';
          return;
        }

        var reviewsArray = Object.values(data).sort(function(a, b) { return b.timestamp - a.timestamp; });

        reviewsArray.forEach(function(rev) {
          var card = document.createElement("div");
          card.className = "review-card";

          var starsHtml = '<div class="stars" style="color:#e6b800; margin-bottom:8px;">';
          for (var i = 1; i <= 5; i++) {
            starsHtml += (i <= rev.rating) ? '<i class="fas fa-star"></i> ' : '<i class="far fa-star"></i> ';
          }
          starsHtml += '</div>';

          card.innerHTML = starsHtml +
            '<p class="review-text" style="font-style:italic; margin-bottom:8px;">&ldquo;' + rev.text + '&rdquo;</p>' +
            '<span class="review-author" style="font-weight:bold; color:#8e9aa8;">- ' + rev.name + '</span>';
          
          reviewsContainer.appendChild(card);
        });
      });
    } catch(errResenas) {
      console.warn("Error cargando reseñas:", errResenas);
    }
  }
});