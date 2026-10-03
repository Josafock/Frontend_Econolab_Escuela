# Informe básico: Econolab como PWA

## Objetivo

Convertir el sistema web de laboratorio en una aplicación web progresiva (PWA) instalable en computadora y teléfono, con contenido estático sin conexión, notificaciones y un sensor con utilidad para el trabajo del laboratorio.

## Funciones implementadas

| Requisito | Implementación | Utilidad |
| --- | --- | --- |
| Instalación | Manifest con nombre, iconos de 192 y 512 píxeles, icono adaptable, colores, accesos directos y visualización `standalone`. Botón de instalación cuando el navegador lo permite e instrucciones para iPhone/iPad. | Abrir Econolab desde el escritorio o pantalla de inicio en su propia ventana. |
| Manifest y service worker | `src/app/manifest.ts` produce `/manifest.webmanifest`; `public/sw.js` se registra desde el layout principal. | Define la identidad de la aplicación, administra recursos locales y recibe clics en notificaciones. |
| Contenido offline | Guía de recepción, registro de servicios, captura de resultados, lector de recibos e instalación, junto con sus estilos, JavaScript, logotipo e iconos. También se conservan recursos estáticos de Next.js que se hayan solicitado bajo control del worker. | Consultar instrucciones durante una interrupción de internet, incluso al volver a abrir la aplicación. |
| Notificaciones | Activación voluntaria, aviso de prueba, confirmación de resultado final guardado y recordatorios de entregas próximas o vencidas. | Ayudar al personal a dar seguimiento a entregas y al cierre de resultados. |
| Sensor: cámara | Lector de códigos de barras CODE128 de los recibos existentes, integrado en Servicios, con búsqueda exacta del folio. | Localizar la orden desde el recibo y reducir errores de captura manual. |

## Justificación del sensor

El sistema ya genera recibos con un código de barras que contiene el folio del servicio. La cámara del teléfono permite leer ese código y encontrar la orden correspondiente. La función se integra con la consulta de servicios y respeta la sesión y permisos existentes.

La lectura se realiza en el dispositivo; no se envían imágenes al servidor. La cámara se solicita al pulsar el botón, se puede detener y se libera al cerrar el lector o abandonar la pantalla. Si no hay cámara o se rechaza el permiso, se puede escribir el folio. Las etiquetas de muestras tienen códigos compuestos diferentes: el lector identifica recibos por su folio exacto y no intenta deducir la orden a partir de coincidencias parciales.

## Alcance del modo offline

Después de la primera visita con conexión, el service worker descarga la guía y sus recursos. Si una navegación falla por falta de red o el servidor no responde, se muestra esa guía. Incluye navegación interna y un botón para volver al sistema cuando haya conexión.

La nueva caché del service worker **no almacena expedientes, respuestas API, sesiones, páginas autenticadas, resultados PDF ni operaciones de escritura**. Los módulos que necesitan el servidor siguen requiriendo conexión. No se implementó sincronización clínica nueva ni se convirtió la base de datos en una base offline; los mecanismos de almacenamiento local que ya existían en el proyecto son independientes de este cambio.

El caché tiene versión y elimina únicamente sus versiones anteriores. Las actualizaciones se ofrecen mediante un botón para que el usuario guarde sus cambios antes de recargar. Al modificar los archivos precargados en una entrega futura, también debe cambiarse `CACHE_VERSION` en `public/sw.js`.

## Notificaciones y permisos

Los controles aparecen dentro de **«Instalar Econolab y opciones de la aplicación»**, en las pantallas con sesión. Se puede activar o desactivar la preferencia por usuario y probar un aviso. El permiso del navegador se solicita únicamente mediante una acción del usuario.

Los textos de los avisos evitan nombres de pacientes y valores clínicos. Al pulsarlos se abre la sección correspondiente dentro de Econolab, que conserva su control de acceso.

Son **notificaciones locales mientras la aplicación está abierta**. Los recordatorios se revisan con la aplicación visible y conectada; no se promete ejecución al cerrar la aplicación o cuando el sistema operativo la suspenda. No se agregó un servidor de Web Push. La disponibilidad depende del navegador; en iPhone/iPad se requiere abrir la aplicación instalada y una versión compatible del sistema.

## Ejecutar y presentar

Desde `frontend`, con las variables de entorno existentes configuradas:

```powershell
npm install
npm run build
npm run start -- -p 5173
```

Abrir `http://localhost:5173`. Para consultar servicios reales también debe estar funcionando el backend con su base de datos.

El service worker se habilita automáticamente en producción. Para una prueba deliberada con `npm run dev`, se puede definir `NEXT_PUBLIC_ENABLE_PWA=true` en `.env` y reiniciar; el worker no guarda los recursos de desarrollo de Next.js en ese modo. Es preferible evaluar con el build de producción.

En computadora, `localhost` permite probar las APIs seguras. Para probar desde un teléfono se necesita servir la aplicación mediante **HTTPS con certificado confiable** y una dirección accesible desde ese teléfono. Abrir la IP local de la computadora por HTTP no habilita todas estas funciones. `localhost` en el teléfono se refiere al propio teléfono.

### Guion de demostración

1. Abrir Econolab con conexión, desplegar las opciones de la aplicación y esperar «Guía sin conexión disponible en este dispositivo».
2. Instalar desde el botón o menú del navegador. En iPhone/iPad: Safari → Compartir → Agregar a inicio. Abrir el icono creado.
3. Desactivar la red o marcar **Offline** en DevTools → Network y recargar `/home`. Debe aparecer la guía con logotipo, diseño y secciones navegables. Restaurar la conexión y pulsar «Reintentar abrir Econolab».
4. Con sesión, activar las notificaciones y enviar el aviso de prueba. Para los avisos de operación, finalizar un resultado de prueba o revisar servicios con entregas próximas/vencidas. Evitar modificar registros reales sólo para la demostración.
5. En Servicios, abrir el lector y permitir la cámara. Escanear el código de un recibo emitido por el sistema; revisar el servicio encontrado y abrir su detalle. Repetir rechazando el permiso para mostrar la alternativa manual.
6. En DevTools → Application, revisar **Manifest**, **Service Workers** y **Cache Storage**.

## Validación

Se verificaron el build de producción, TypeScript y ESLint de los archivos modificados. Las pruebas automatizadas cubren el caché y sus exclusiones, permisos y sesiones de notificaciones, resolución exacta de folios y comportamiento en navegador. Para reproducirlas (Node.js 22.18 o posterior):

```powershell
npm run build
npm run test:pwa
npm run test:pwa:browser
```

Las pruebas de navegador utilizan Chrome y un servidor local aislado en el puerto 5183, con sesión ficticia y sin conexión a la base de datos. Para usar Chromium de Playwright, ejecutar `npx playwright install chromium` y definir `PLAYWRIGHT_CHANNEL=chromium`. Se verifica el envío real al API de notificaciones del worker; la prueba de cámara usa un flujo de video simulado para comprobar permisos y liberación del sensor. La instalación desde el sistema operativo, el recorrido con servicios de una base real y el escaneo óptico en un teléfono físico deben verificarse con el guion anterior.

## Archivos principales

- `src/app/manifest.ts`, `src/app/layout.tsx`, `next.config.ts`: identidad y configuración PWA.
- `src/components/pwa/PwaProvider.tsx` y `PwaControls.tsx`: registro, instalación, conectividad y actualizaciones.
- `public/sw.js`, `public/offline.html`, `public/offline.css`, `public/offline.js`: caché y guía sin conexión.
- `public/icons/` y `scripts/generate-pwa-icons.mjs`: iconos derivados del logotipo existente.
- `src/components/pwa/ServiceNotifications.tsx` y `src/lib/pwa/notifications.ts`: controles y avisos.
- `src/components/servicios/ServiceBarcodeScanner.tsx`: cámara y lector de recibos.
- `tests/` y `e2e/`: comprobaciones del worker y pruebas en navegador.

## Referencias técnicas

- [Guía oficial de PWA con Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps).
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API).
- [MDN: acceso a cámara con getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [MDN: evento de instalación](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent).
