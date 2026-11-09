# Música de la historia

Copiá acá **un archivo de audio** (`.mp3`, `.ogg`, `.wav`, `.m4a`, `.aac` o `.flac`) y el reproductor lo detecta solo al compilar o recargar `npm run dev`.

- El reproductor no empieza solo: la persona lo activa con el botón de reproducir.
- Mientras esta carpeta no tenga audio, el reproductor muestra «Música pendiente» y un enlace a YouTube; no hace ningún pedido de red.
- Opcional: `playlist.json` con los datos de la pista:
  `[{ "file": "tema.mp3", "title": "Título", "artist": "Intérprete" }]`
- Si hay varios archivos se usa el primero por orden alfabético.
- Peso recomendado: menos de 5 MB (mp3 a 128 kbps).
- **Derechos de autor:** usá únicamente audio que tengas derecho a reproducir (licencia, autorización del titular o música libre). El proyecto no incluye ni descarga ninguna pista.
