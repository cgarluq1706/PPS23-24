//Código de implementación de footer en cada página
document.addEventListener("DOMContentLoaded", () => {
    const footerHTML = `
      <section data-bs-version="5.1" class="footer3 cid-u6ZF78TESB" once="footers" id="footer-6-u6ZF78TESB">
        <div class="container">
          <div class="row">
            <div class="row-links">
              <ul class="header-menu">
                <li class="header-menu-item mbr-fonts-style display-5">
                  <a href="/dashboard" class="text-white">Inicio</a>
                </li>
                <li class="header-menu-item mbr-fonts-style display-5">
                  <a href="/acerca" class="text-white">Acerca</a>
                </li>
                <li class="header-menu-item mbr-fonts-style display-5">
                  <a href="/contacto" class="text-white">Contacto</a>
                </li>
                <li class="header-menu-item mbr-fonts-style display-5">
                  <a href="/terminos" class="text-white">Términos</a>
                </li>
              </ul>
            </div>
            <div class="col-12 mt-4">
              <p class="mbr-fonts-style copyright display-7">
                © 2024 socialTernero. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </section>
    `;
  
    document.body.insertAdjacentHTML("beforeend", footerHTML);//Beforeend pondrá el código al final del body
  });
  