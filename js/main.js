(() => {
  document.querySelectorAll("[data-pixel-event]").forEach((el) => {
    el.addEventListener("click", () => {
      const eventName = el.getAttribute("data-pixel-event");
      if (eventName && typeof window.fbq === "function") {
        window.fbq("track", eventName);
      }
    });
  });
})();
