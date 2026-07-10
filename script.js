document.addEventListener("DOMContentLoaded", () => {
    const btnEs = document.getElementById("btn-es");
    const btnEn = document.getElementById("btn-en");
    const translateElements = document.querySelectorAll("[data-es]");

    const whatsappHero = document.getElementById("whatsapp-hero");
    const whatsappFooter = document.getElementById("whatsapp-footer");

    let currentLang = "es";

    // --- LÓGICA DE IDIOMAS (CON TU NÚMERO ACTUALIZADO) ---
    function changeLanguage(lang) {
        currentLang = lang;
        translateElements.forEach(elem => {
            if (lang === "es") {
                elem.textContent = elem.getAttribute("data-es");
            } else {
                elem.textContent = elem.getAttribute("data-en");
            }
        });

        if (lang === "es") {
            btnEs.classList.add("active");
            btnEn.classList.remove("active");
            whatsappHero.href = "https://wa.me/573176653331?text=Hola,%20me%20gustaría%20cotizar%20un%20servicio%20con%20AG%20Executive%20Driver.";
            whatsappFooter.href = "https://wa.me/573176653331?text=Hola,%20quiero%20programar%20un%20viaje%20con%20AG%20Executive%20Driver.";
        } else {
            btnEn.classList.add("active");
            btnEs.classList.remove("active");
            whatsappHero.href = "https://wa.me/573176653331?text=Hello,%20I%20would%20like%20to%20request%20a%20quote%20for%20AG%20Executive%20Driver%20services.";
            whatsappFooter.href = "https://wa.me/573176653331?text=Hello,%20I%20want%20to%20schedule%20a%20ride%20with%20AG%20Executive%20Driver.";
        }
    }

    btnEs.addEventListener("click", () => changeLanguage("es"));
    btnEn.addEventListener("click", () => changeLanguage("en"));


    // --- LÓGICA DEL FORMULARIO DE CALIFICACIÓN INTERACTIVO ---
    const starsContainer = document.getElementById("form-stars");
    const starIcons = starsContainer.querySelectorAll("i");
    let selectedRating = 0;

    // Manejo del hover y clic en las estrellas del formulario
    starIcons.forEach(star => {
        star.addEventListener("click", () => {
            selectedRating = parseInt(star.getAttribute("data-value"));
            updateStarsDisplay(selectedRating);
        });
    });

    function updateStarsDisplay(rating) {
        starIcons.forEach(star => {
            const val = parseInt(star.getAttribute("data-value"));
            if (val <= rating) {
                star.className = "fas fa-star"; // Estrella llena
            } else {
                star.className = "far fa-star"; // Estrella vacía
            }
        });
    }

    const reviewForm = document.getElementById("review-form");
    const reviewsContainer = document.getElementById("reviews-container");
    const noReviewsMsg = document.getElementById("no-reviews-msg");

    reviewForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (selectedRating === 0) {
            alert(currentLang === "es" ? "Por favor, selecciona una calificación con estrellas." : "Please select a star rating.");
            return;
        }

        const nameInput = document.getElementById("reviewer-name").value;
        const textInput = document.getElementById("reviewer-text").value;

        // Ocultar mensaje de "no hay reseñas"
        if (noReviewsMsg) {
            noReviewsMsg.style.display = "none";
        }

        // Crear dinámicamente la nueva tarjeta de reseña
        const reviewCard = document.createElement("div");
        reviewCard.className = "review-card";

        // Construir bloque de estrellas amarillas
        let starsHtml = '<div class="stars">';
        for (let i = 1; i <= 5; i++) {
            if (i <= selectedRating) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }
        starsHtml += '</div>';

        // Estructura de la reseña
        reviewCard.innerHTML = `
            ${starsHtml}
            <p class="review-text">&ldquo;${textInput}&rdquo;</p>
            <span class="review-author">- ${nameInput}</span>
        `;

        // Añadir la nueva reseña arriba de las demás
        reviewsContainer.insertBefore(reviewCard, reviewsContainer.firstChild);

        // Resetear el formulario de forma limpia
        reviewForm.reset();
        selectedRating = 0;
        updateStarsDisplay(0);
    });
});