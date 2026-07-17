# Guía de Estilo de Marca: BarrioRed

BarrioRed es una plataforma digital comunitaria centrada en la conectividad del barrio, el empoderamiento local y la identidad vibrante de las comunidades colombianas.

## Identidad Visual: Neo-Brutalismo Tropical

La marca utiliza una estética **Neo-Brutalista** que combina la crudeza urbana con la energía y el color de los barrios populares.

---

## El Logo

El nombre encierra un juego bilingüe: **RED** es a la vez el color y la palabra
"red" — la **red vecinal**. La marca lo captura con dos elementos:

1. **El isotipo (pin):** un **pin de ubicación** (lo local, el barrio) que lleva la
   sigla **BR** en itálica. El pin = "aquí, en el barrio".
2. **El logotipo (wordmark):** **BARRIO** en tinta y **RED** en rojo.

### Construcción del isotipo

- Silueta: **pin de ubicación** (lágrima) con punta inferior.
- Sigla **BR** en **Outfit Black (900) itálica**, `letter-spacing: -3`, optada al
  centro de la cabeza del pin.
- Borde negro grueso (`stroke-width: 8` en el lienzo `120×150`), `stroke-linejoin: round`.
- Variantes de posición de "BR": `head` (asentada arriba, por defecto) y `center`
  (ópticamente centrada en toda la silueta).

### Lockups

| Lockup | Uso |
|--------|-----|
| **Horizontal** (pin + BARRIORED) | Uso preferente: barra de navegación, encabezados. |
| **Apilado** (pin sobre wordmark) | Espacios cuadrados, splash, redes. |
| **Solo logotipo** (BARRIORED) | Cuando el pin ya está presente en el contexto. |
| **Solo isotipo** (pin) | Ícono de app, favicon, avatar, sticker. |

### Versiones de color (colorways)

| Colorway | Pin | Letra "BR" | Borde | Fondo |
|----------|-----|-----------|-------|-------|
| **Color** (preferente) | Barrio Red | Blanco | Negro | Claro / papel |
| **Tinta** (1 tinta) | Negro | Blanco | Negro | Claro |
| **Invertido** (reverse) | Barrio Red | Blanco | Blanco | Oscuro / tinta |
| **App (Rojo)** | Blanco | Barrio Red | Negro | Barrio Red |

### Espacio de respeto y tamaño mínimo

- **Área de respeto:** margen mínimo igual a la **altura de la "B"** del wordmark en
  todos los lados.
- **Tamaño mínimo del lockup:** ≥ 22px de alto.
- **Favicon / pin solo:** legible de 16–24px.

### Implementación

- Componente único: [`components/layout/logo.tsx`](../../components/layout/logo.tsx)
  exporta `BrandMark` (isotipo), `Wordmark` y `Logo` (lockup).
- El rojo del logo usa el token de tema `--primary` para mantener consistencia con
  toda la UI.
- Favicon: [`app/icon.svg`](../../app/icon.svg) · asset reutilizable: `public/icon.svg`.
- Íconos PWA / app: `public/icons/icon-192.png`, `public/icons/icon-512.png`
  (maskable), `app/apple-icon.png`. Todos derivan de la misma geometría del pin.

> **Regla:** no recolorear, rotar (salvo stickers a −4°), distorsionar ni añadir
> efectos al pin. El isotipo siempre conserva su borde negro.

---

### 1. Paleta de Colores

Inspirada en las fachadas, el arte callejero y la vitalidad de Colombia.

- **Barrio Red (Primario):** `#E11D48` (un rojo vibrante que simboliza la pasión y la acción).
- **Sun Yellow (Secundario):** `#FBBF24` (refleja calidez, energía y optimismo).
- **Street Blue (Acento):** `#3B82F6` (conecta con lo institucional pero con un toque moderno).
- **Black/White:** Uso riguroso de negro puro (`#000000`) para bordes y sombras, y blanco/fondo neutro para legibilidad.

### 2. Tipografía

- **Títulos (Outfit):** Una fuente con carácter, geométrica y moderna. Siempre en **NEGRITA (Black)**, a menudo en *itálica* para dar sensación de movimiento y urgencia.
- **Cuerpo (Inter):** Una fuente sans-serif altamente legible para toda la información técnica y descriptiva.

### 3. Elementos Brutalistas

La interfaz debe seguir estas reglas visuales:

- **Bordes:** Bordes negros gruesos (2px a 4px) en todos los componentes interactivos.
- **Sombras:** "Sombras duras" (Hard shadows) sin desenfoque. Las sombras deben ser negras y proyectarse en un ángulo de 45 grados (ej: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
- **Esquinas:** Preferencia por esquinas cuadradas (`rounded-none`) para evocar la estructura urbana.
- **Micro-interacciones:** Al pasar el mouse (hover), los elementos suelen "levantarse" (se desplazan negativamente en X/Y y la sombra crece).

---

## Tono de Voz

- **Auténtico:** Hablamos como se habla en el barrio, con respeto pero cercanía.
- **Empoderador:** Resaltamos que la red es de los vecinos y para los vecinos.
- **Impactante:** Usamos un lenguaje directo, en mayúsculas para llamadas a la acción, denotando importancia y orgullo local.

---

## Aplicación de Componentes

### Botones
- **Estilo:** Bordes negros de 2px, sombra dura de 2px.
- **Tipografía:** Uppercase, font-black, tracking-widest.

### Tarjetas
- Fondos blancos con bordes negros de 4px.
- Sombras de 8px a 12px para destacar sobre el fondo.

### Formularios
- Etiquetas en mayúsculas y negrita.
- Inputs con bordes negros y sombras que se intensifican al enfocar (focus).

---

*BarrioRed © 2026 - Hecho para el barrio, por el barrio.*
