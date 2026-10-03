(() => {
  const status = document.getElementById("connection-status");
  if (!status) return;

  function updateConnectionStatus() {
    const online = navigator.onLine;
    status.dataset.online = String(online);
    status.textContent = online
      ? "El dispositivo detecta una red. Puedes reintentar abrir Econolab; si el servidor aún no responde, esta guía seguirá disponible."
      : "El dispositivo está sin conexión. Puedes seguir leyendo esta guía y reintentar cuando recuperes internet.";
  }

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  updateConnectionStatus();
  // Retry is a normal document navigation. Never reload automatically: preserve reading position.
})();
