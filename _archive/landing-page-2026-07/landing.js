(function () {
  "use strict";

  var navToggle = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.querySelector("[data-mobile-nav]");

  function closeNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.hidden = isOpen;
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 840) closeNav();
    });
  }

  var needSelect = document.getElementById("primary-need");
  document.querySelectorAll("[data-primary-need]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (needSelect) needSelect.value = link.getAttribute("data-primary-need") || "";
    });
  });

  var form = document.getElementById("booking-form");
  var success = document.getElementById("booking-success");

  if (form && success) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Connect an API or CRM here. Send new FormData(form) to your endpoint,
      // then show this success state only after the server confirms receipt.
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });
  }
})();
