# Informe básico: Econolab como PWA

Actualización del 13 de octubre de 2026: sitio público con cuatro páginas offline y QR para estudios.

La entrada principal (`/`) y la apertura de la PWA muestran primero el sitio público. La cabecera de las cuatro páginas tiene accesos separados a **Iniciar sesión** y **Registrarse**, también en teléfono. La entrada anterior `/home`, sin una sesión válida, vuelve al inicio público; con sesión mantiene el panel operativo. Al cerrar sesión se vuelve al sitio público. Tanto el login como el registro permiten regresar al inicio.

## Objetivo

Convertir el sistema web de laboratorio en una aplicación web progresiva (PWA) instalable en computadora y teléfono, con contenido estático sin conexión, notificaciones y un sensor con utilidad para el trabajo del laboratorio.

## Funciones implementadas

| Requisito | Implementación | Utilidad |
| --- | --- | --- |
| Instalación | Manifest con nombre, iconos de 192 y 512 píxeles, icono adaptable, colores, accesos directos y visualización `standalone`. Botón de instalación cuando el navegador lo permite e instrucciones para iPhone/iPad. | Abrir Econolab desde el escritorio o pantalla de inicio en su propia ventana. |
| Manifest y service worker | `src/app/manifest.ts` produce `/manifest.webmanifest`; `public/sw.js` se registra desde el layout principal. | Define la identidad de la aplicación, administra recursos locales y recibe clics en notificaciones. |
| Parte pública y contenido offline | Inicio (`/`), Nosotros (`/nosotros`), Servicios (`/servicios-laboratorio`) y Contacto (`/contacto`), con sus estilos, scripts, fuentes, logotipo e iconos. | Conocer el laboratorio y consultar información de contacto, incluso sin internet. |
| Notificaciones | Activación voluntaria, aviso de prueba, confirmación de resultado final guardado y recordatorios de entregas próximas o vencidas. | Ayudar al personal a dar seguimiento a entregas y al cierre de resultados. |
| Sensor: cámara | Lector de QR de estudios en Estudios, además del lector de recibos CODE128 en Servicios. | Identificar un estudio o servicio sin escribir a mano su referencia. |
| QR de estudios | Opción «Ver QR» en el catálogo y detalle, con descarga de una imagen PNG por estudio o paquete. | Preparar etiquetas y abrir el registro correcto al escanearlas. |

## Justificación del sensor

Cada estudio y paquete tiene un QR generado a partir de su identificador estable con el formato `econolab:study:ID`. Está disponible en Estudios → Acciones → Ver QR y en el detalle del registro. Se puede descargar como PNG para imprimirlo o usarlo desde otro dispositivo; también funciona para los registros existentes, sin modificar la base de datos.

En Estudios → Escanear QR, la cámara reconoce el código, consulta el registro mediante la API autenticada y abre su detalle. Si el estudio fue eliminado, el QR no es válido o falla la consulta, se muestra un mensaje y no se abre otro registro. Los enlaces externos se rechazan. El QR conserva su asociación aunque cambie el nombre o la clave del estudio.

Los PDF de resultados también imprimen códigos reales: el documento individual incluye el QR del estudio, y el consolidado imprime un QR junto a cada estudio y un QR del servicio completo al final (`econolab:service:ID`). Los de estudios se leen en Estudios → Escanear QR; el del servicio se lee desde el lector de recibos de Servicios, que admite CODE128 y QR. La generación ya no depende de `LAB_QR_URL`. El texto se imprime debajo del código para no taparlo. Estos códigos sirven para consultar los registros con sesión; no constituyen una firma digital ni una validación pública del documento.

Para ver la corrección se debe utilizar la versión actualizada del backend y generar nuevamente el PDF: una descarga anterior conserva su contenido original. La implementación está en `backend/src/results/results.service.ts` y `backend/src/common/utils/pwa-qr.util.ts`.

El sistema también conserva el lector de recibos: utiliza el código CODE128 con el folio del servicio para localizar una orden. Ambos lectores respetan la sesión y los permisos existentes.

La corrección de PDF se validó generando tres documentos con datos ficticios (individual, consolidado continuo y separado por estudio), renderizando sus siete QR y decodificando los siete con el lector real. Pasaron cuatro pruebas de PDF en el backend, 44 pruebas unitarias del frontend y diez pruebas de cámara/QR en navegador con tamaños de computadora y teléfono.

La lectura se realiza en el dispositivo; no se envían imágenes al servidor. La cámara se solicita al pulsar el botón, se puede detener y se libera al cerrar el lector o abandonar la pantalla. Si no hay cámara o se rechaza el permiso, se puede escribir el folio. Las etiquetas de muestras tienen códigos compuestos diferentes: el lector identifica recibos por su folio exacto y no intenta deducir la orden a partir de coincidencias parciales.

## Alcance del modo offline

Después de la primera visita con conexión, el service worker descarga las cuatro páginas públicas y todas sus dependencias estáticas. Se precargan también las páginas que el usuario todavía no abrió, para que toda la navegación pública funcione desde la primera desconexión.

La navegación usa la red primero; si falla, recupera la misma página pública desde la caché. Al abrir una sección interna sin conexión, vuelve al inicio público. Los enlaces públicos hacen una navegación completa para que no dependan de peticiones RSC de Next.js. La pantalla de guía anterior fue retirada; `/offline.html` redirige a `/` para conservar enlaces antiguos.

La nueva caché del service worker **no almacena expedientes, respuestas API, sesiones, páginas autenticadas, resultados PDF ni operaciones de escritura**. Los módulos que necesitan el servidor siguen requiriendo conexión. No se implementó sincronización clínica nueva ni se convirtió la base de datos en una base offline; los mecanismos de almacenamiento local que ya existían en el proyecto son independientes de este cambio.

El caché usa la versión `v3-public-entry` y elimina únicamente sus versiones anteriores, incluida la caché de la guía. Si falla la descarga inicial de una página o sus recursos, la instalación nueva no sustituye al worker anterior. Las actualizaciones se ofrecen mediante un botón para que el usuario guarde sus cambios antes de recargar. Al modificar los archivos precargados en una entrega futura, también debe cambiarse `CACHE_VERSION` en `public/sw.js`.

La página de Contacto utiliza las ubicaciones y teléfonos que ya aparecen en los valores de identidad del laboratorio de `backend/src/common/utils/pdf-branding.util.ts`. No se añadieron horarios ni certificaciones sin datos del proyecto.

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

1. Abrir `/` con conexión, desplegar las opciones de la aplicación y esperar «Páginas públicas disponibles sin conexión en este dispositivo». Si ya estaba instalada la versión anterior, pulsar «Actualizar aplicación» y esperar la recarga.
2. Instalar desde el botón o menú del navegador. En iPhone/iPad: Safari → Compartir → Agregar a inicio. Abrir el icono creado.
3. Desactivar la red o marcar **Offline** en DevTools → Network y recargar `/`. Recorrer Inicio, Nosotros, Servicios y Contacto desde el menú; deben conservar contenido, estilos y logotipo. Abrir `/home` sin conexión debe volver al inicio público. Restaurar la conexión y pulsar «Iniciar sesión» o «Registrarse» desde la cabecera.
4. Con sesión, activar las notificaciones y enviar el aviso de prueba. Para los avisos de operación, finalizar un resultado de prueba o revisar servicios con entregas próximas/vencidas. Evitar modificar registros reales sólo para la demostración.
5. En Estudios, abrir Acciones → Ver QR o el botón Ver QR del detalle y descargar la etiqueta. En otro dispositivo o con la etiqueta impresa, abrir Estudios → Escanear QR, activar la cámara y leerla. Debe abrir el mismo estudio. El lector de recibos sigue disponible en Servicios; rechazar el permiso conserva la alternativa manual.
6. En DevTools → Application, revisar **Manifest**, **Service Workers** y **Cache Storage**.

## Validación

Se verificaron el build de producción, TypeScript y ESLint de los archivos modificados. Pasaron 41 pruebas unitarias y los 22 escenarios de navegador en tamaños de computadora y teléfono. Se comprueban la entrada pública, los enlaces de login/registro, la apertura de `/home` con y sin sesión, el cierre de sesión, las cuatro páginas offline con recursos completos, la privacidad del caché, las notificaciones, los permisos de cámara y la lectura del QR generado hasta abrir el estudio correcto. Para reproducirlas (Node.js 22.18 o posterior):

```powershell
npm run build
npm run test:pwa
npm run test:pwa:browser
```

Las pruebas de navegador utilizan Chrome y un servidor local aislado en el puerto 5183, con sesión ficticia y una API de lectura con registros de prueba en el puerto 5184, sin conexión a la base de datos. Para usar Chromium de Playwright, ejecutar `npx playwright install chromium` y definir `PLAYWRIGHT_CHANNEL=chromium`. Se verifica el envío real al API de notificaciones del worker. El lector QR utiliza el decoder real sobre un video simulado del PNG generado por la aplicación. La instalación desde el sistema operativo, el recorrido con registros de una base real y el escaneo óptico en un teléfono físico deben verificarse con el guion anterior.

## Archivos principales

- `src/app/manifest.ts`, `src/app/layout.tsx`, `next.config.ts`: identidad y configuración PWA.
- `src/components/pwa/PwaProvider.tsx` y `PwaControls.tsx`: registro, instalación, conectividad y actualizaciones.
- `public/sw.js`: precarga de páginas públicas y dependencias, fallback y actualizaciones.
- `src/app/page.tsx`, `src/app/nosotros/page.tsx`, `src/app/servicios-laboratorio/page.tsx`, `src/app/contacto/page.tsx`, `src/components/public/`: sitio público responsive.
- `public/icons/` y `scripts/generate-pwa-icons.mjs`: iconos derivados del logotipo existente.
- `src/components/pwa/ServiceNotifications.tsx` y `src/lib/pwa/notifications.ts`: controles y avisos.
- `src/components/servicios/ServiceBarcodeScanner.tsx`: cámara con lectura de recibos o QR de estudios según la sección.
- `src/components/estudios/StudyQrModal.tsx`, `StudyQrButton.tsx`, `src/lib/studies/study-qr.ts`: generación, descarga y resolución de QR.
- `tests/` y `e2e/`: comprobaciones del worker y pruebas en navegador.

## Referencias técnicas

- [Guía oficial de PWA con Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps).
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API).
- [MDN: acceso a cámara con getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [MDN: evento de instalación](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent).
