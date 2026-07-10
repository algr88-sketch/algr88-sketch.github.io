document.addEventListener("DOMContentLoaded", () => {
    const btnEs = document.getElementById("btn-es");
    const btnEn = document.getElementById("btn-en");
    
    // Captura todos los elementos que contengan textos traducibles
    const translateElements = document.querySelectorAll("[data-es]");

    // Enlaces dinámicos de WhatsApp para cambiar el mensaje según idioma
    const whatsappHero = document.getElementById("whatsapp-hero");
    const whatsappFooter = document.getElementById("whatsapp-footer");

    function changeLanguage(lang) {
        translateElements.forEach(elem => {
            if (lang === "es") {
                elem.textContent = elem.getAttribute("data-es");
            } else {
                elem.textContent = elem.getAttribute("data-en");
            }
        });

        // Modifica los mensajes predeterminados de WhatsApp según el idioma seleccionado
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

    // Escuchadores de eventos para los botones del encabezado
    btnEs.addEventListener("click", () => changeLanguage("es"));
    btnEn.addEventListener("click", () => changeLanguage("en"));
});