# Masi — Guía de Colores y Estilo (Prompt de Diseño)

> **Cómo usar este archivo:** colócalo en la raíz del repositorio. Cualquier persona del equipo, o cualquier asistente de IA (Claude, Copilot, Cursor, etc.), debe leerlo **antes** de crear o modificar interfaz. Todo lo que se construya debe respetar estas reglas.

---

## 1. Prompt maestro (copiar y pegar en la IA)

```text
Eres el diseñador/desarrollador frontend de Masi, una app que conecta a personas
con profesionales verificados para servicios del hogar (electricidad, gasfitería,
cerrajería, carpintería, pintura, instalaciones, reparaciones, limpieza, aire
acondicionado y más). Lema: "Tu hogar en buenas manos".

Sigue SIEMPRE STYLE_GUIDE.md. Reglas clave:
- Estilo: moderno, limpio, cálido y confiable. Mucho espacio en blanco, esquinas
  muy redondeadas, sombras suaves. Nada recargado.
- Colores: azul marino #1E3A8A (confianza), azul #2563EB (acción principal),
  naranja #F59E0B (energía, solo acentos), crema #FEF3C7 (calidez),
  gris azulado claro #E5E7EB (fondos y bordes). Usa SOLO estos tokens.
- Tipografía: Montserrat (Bold para títulos, SemiBold para subtítulos y
  botones, Regular para texto).
- Tono: cercano, claro y tranquilizador. Español neutro, tuteo ("tú").
- Accesibilidad: contraste mínimo WCAG AA. Nunca uses texto naranja pequeño
  sobre blanco ni texto blanco sobre naranja.
- Mobile-first: la app se usa principalmente desde el celular.
Si una decisión de diseño no está cubierta, elige la opción más simple que
transmita confianza, rapidez y cercanía.
```

---

## 2. Esencia de la marca

| Pilar | Qué comunica | Cómo se refleja en la UI |
|---|---|---|
| **Confianza** | Profesionales verificados | Azul marino, insignias de verificación, escudo, reseñas |
| **Rapidez** | Ayuda en minutos | Acento naranja, rayo, flujos cortos, pocos pasos |
| **Cerca de ti** | En tu zona, cuando lo necesites | Crema cálido, ubicación, cercanía en tarjetas |

**Personalidad:** amable, profesional, simple, cercana. Nunca fría, técnica ni intimidante.

**Lema principal:** *Tu hogar en buenas manos.*

---

## 3. Paleta de colores

### 3.1 Colores de marca

| Token | Hex | Significado | Uso principal |
|---|---|---|---|
| `--masi-navy` | `#1E3A8A` | Confianza, seguridad | Títulos, logotipo, textos importantes, fondos de secciones destacadas |
| `--masi-blue` | `#2563EB` | Tecnología, conexión | Botones principales, enlaces, iconos activos, estados seleccionados |
| `--masi-orange` | `#F59E0B` | Energía, soluciones | Acentos, palabra destacada de un titular, subrayados, badges, punto de la "i" |
| `--masi-cream` | `#FEF3C7` | Cercanía, calidez | Fondos suaves, banners cálidos, resaltados |
| `--masi-gray` | `#E5E7EB` | Equilibrio, claridad | Bordes, divisores, fondos de inputs, iconos inactivos |

### 3.2 Neutros de apoyo

| Token | Hex | Uso |
|---|---|---|
| `--masi-white` | `#FFFFFF` | Superficie de tarjetas y pantallas |
| `--masi-bg` | `#F8FAFF` | Fondo general de la app (blanco con un toque azul) |
| `--masi-text` | `#1F2937` | Texto de cuerpo |
| `--masi-text-muted` | `#6B7280` | Texto secundario, descripciones |

### 3.3 Colores semánticos (extensión de la paleta)

Estos no aparecen en el tablero original, pero son necesarios para estados de la interfaz:

| Token | Hex | Uso |
|---|---|---|
| `--masi-success` | `#16A34A` | Confirmaciones, pago exitoso, servicio completado |
| `--masi-error` | `#DC2626` | Errores, transacción fallida |
| `--masi-warning` | `#F59E0B` | Advertencias (reutiliza el naranja de marca) |
| `--masi-info` | `#2563EB` | Mensajes informativos (reutiliza el azul de marca) |

### 3.4 Tintes suaves (fondos de iconos y chips)

Para las tarjetas de categorías se usan fondos muy claros de cada color:

| Token | Hex | Ejemplo |
|---|---|---|
| `--masi-blue-50` | `#EFF4FF` | Fondo de icono azul (gasfitería, instalaciones) |
| `--masi-orange-50` | `#FFF7E6` | Fondo de icono naranja (electricidad, carpintería) |
| `--masi-green-50` | `#E8F7EE` | Fondo de icono verde (cerrajería) |

### 3.5 Reglas de contraste (importante para accesibilidad)

- ✅ Navy `#1E3A8A` sobre blanco: excelente contraste. Úsalo para títulos y cuerpo importante.
- ✅ Azul `#2563EB` sobre blanco: cumple AA. Válido para botones con texto blanco y enlaces.
- ✅ Texto navy sobre naranja `#F59E0B`: correcto. Usa **navy** para el texto de un botón naranja.
- ❌ Texto blanco sobre naranja: **no cumple**. Evitarlo.
- ❌ Texto naranja pequeño sobre blanco o crema: **no cumple**. El naranja va en textos **grandes y en negrita** (titulares) o como decoración, nunca en párrafos.
- El color nunca debe ser el único indicador de estado: acompáñalo de icono o texto.

### 3.6 Proporción de uso (regla 60-30-10)

- **60 %** blanco / fondos claros (`--masi-white`, `--masi-bg`, `--masi-gray`)
- **30 %** azules (`--masi-navy`, `--masi-blue`)
- **10 %** acentos (`--masi-orange`, `--masi-cream`)

El naranja debe sentirse como un destello, no como color dominante.

### 3.7 Degradados permitidos

```css
/* Degradado de marca (logo, íconos de app, héroes) */
--masi-gradient: linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%);

/* Fondo cálido para banners */
--masi-gradient-warm: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%);
```

---

## 4. Tipografía

**Familia única:** [Montserrat](https://fonts.google.com/specimen/Montserrat) (Google Fonts).

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
```

Fallback: `'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

| Rol | Peso | Tamaño móvil / escritorio | Interlineado | Color |
|---|---|---|---|---|
| Display / Hero | Bold 700–800 | 32px / 48px | 1.1 | Navy (con una palabra o frase en naranja) |
| H1 | Bold 700 | 28px / 36px | 1.2 | Navy |
| H2 | Bold 700 | 22px / 28px | 1.25 | Navy |
| H3 | SemiBold 600 | 18px / 20px | 1.3 | Navy |
| Cuerpo | Regular 400 | 16px / 16px | 1.6 | `--masi-text` |
| Texto secundario | Regular 400 | 14px | 1.5 | `--masi-text-muted` |
| Botones y etiquetas | SemiBold 600 | 16px | 1 | Según botón |
| Caption / Etiquetas pequeñas | SemiBold 600 | 12px | 1.4 | `--masi-text-muted` |
| Tagline del logo | Regular, mayúsculas | — | — | Letter-spacing amplio (`0.2em`) |

**Recurso de estilo característico:** en los titulares, la **última frase va en naranja** para destacar la promesa, seguida de una línea corta naranja como subrayado.

> Soluciones para tu hogar,
> **más cerca de ti.** ← naranja
> ▬▬ ← barra naranja corta (48–64 px de ancho, 4 px de alto, redondeada)

---

## 5. Logotipo

- **Concepto:** una casa cuyo techo forma una **"M"**, con una **ventana de 4 cuadros en naranja** y el **punto de la "i" en naranja** en la palabra "Masi".
- **Versión principal (vertical):** icono de casa arriba, "Masi" en navy, punto de la i naranja, tagline en mayúsculas debajo.
- **Versión horizontal:** icono a la izquierda, "Masi" a la derecha, tagline pequeño debajo.
- **Ícono de app:** cuadrado de esquinas redondeadas con degradado azul (`--masi-gradient`), casa-M en blanco y un detalle naranja.
- **Versión monocromática:** todo en navy `#1E3A8A` (o blanco sobre fondos oscuros).

**Reglas:**
- Dejar un espacio libre alrededor del logo igual a la altura de la letra "M".
- No deformar, no rotar, no cambiar los colores ni agregar sombras pesadas.
- Sobre fondos oscuros o azules, usar la versión blanca / monocromática.
- Tamaño mínimo: 24 px de alto para el ícono, 80 px de ancho para la versión horizontal.

---

## 6. Forma, espacio y profundidad

### 6.1 Esquinas (border-radius)

| Elemento | Radio |
|---|---|
| Botones | `9999px` (píldora) |
| Inputs | `12px` |
| Tarjetas | `20px` |
| Tarjetas grandes / banners / modales | `24px` |
| Íconos de categoría (contenedor) | `16px` |
| Ícono de la app | `22%` del lado |

### 6.2 Espaciado (escala base de 4 px)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

- Margen lateral de pantalla en móvil: **16–20 px**.
- Separación entre secciones: **32–48 px**.
- Mucho espacio en blanco: ante la duda, más aire.

### 6.3 Sombras (suaves y difusas, nunca duras)

```css
--shadow-sm: 0 2px 8px rgba(30, 58, 138, 0.06);
--shadow-md: 0 8px 24px rgba(30, 58, 138, 0.10);
--shadow-lg: 0 16px 40px rgba(30, 58, 138, 0.14);
```

Las sombras usan el navy con baja opacidad, no negro.

### 6.4 Bordes

`1px solid #E5E7EB` en tarjetas e inputs. Preferir sombra suave en lugar de bordes gruesos.

---

## 7. Componentes

### Botón primario
- Fondo `--masi-blue`, texto blanco, SemiBold, forma de píldora.
- Alto 48–52 px, padding horizontal 24 px, ancho completo en móvil.
- Puede llevar flecha `→` al final: **"Comenzar →"**.
- Hover: `#1D4ED8`. Active: `scale(0.98)`. Disabled: fondo `--masi-gray`, texto `#9CA3AF`.

### Botón de acento
- Fondo `--masi-orange`, texto **navy** (nunca blanco), píldora.
- Solo para acciones de urgencia o conversión clave (ej. "Solicitar ahora"). Máximo uno por pantalla.

### Botón secundario / enlace
- Sin fondo, texto `--masi-blue` SemiBold (ej. "Iniciar sesión"). Alternativa: borde `1.5px solid #2563EB`.

### Tarjeta de categoría de servicio
- Fondo blanco, radio 20 px, sombra suave.
- Ícono de línea redondeada dentro de un contenedor con tinte suave (`-50`).
- Nombre debajo en 12–14 px, Regular, `--masi-text`.
- Categorías: Electricidad, Gasfitería, Cerrajería, Carpintería, Pintura, Instalaciones, Reparaciones, Limpieza, Aire Acond., Más servicios (`•••`).

### Tarjeta de profesional
- Foto circular, nombre en SemiBold, oficio, calificación, distancia.
- **Insignia "Verificado"** con escudo y check en azul.

### Inputs
- Fondo blanco, borde `#E5E7EB`, radio 12 px, alto 48 px.
- Focus: borde `--masi-blue` + anillo `0 0 0 4px rgba(37, 99, 235, 0.15)`.
- Error: borde `--masi-error` y mensaje debajo con icono.

### Chips y badges
- Píldora, fondo tinte suave, texto del color correspondiente en SemiBold 12–13 px.

### Barra de navegación inferior (móvil)
- Fondo blanco, ícono activo `--masi-blue`, inactivo `#9CA3AF`, etiqueta de 11–12 px.

### Banner de confianza
- Fondo navy `#1E3A8A`, texto blanco, subrayado corto naranja.
- Fila de 3 ítems con icono: **Seguro · Rápido · Cerca de ti**.

---

## 8. Iconografía

- Estilo **línea redondeada** (rounded stroke), trazo de 2 px, esquinas y terminaciones redondeadas.
- Librería recomendada: **Lucide** o **Phosphor** (coinciden con el estilo del tablero).
- Tamaños: 20 px (UI), 24 px (navegación), 32–40 px (categorías).
- Color por defecto: `--masi-blue`; icono de energía/rapidez en naranja; verificación/seguridad en azul.
- Nunca mezclar íconos rellenos con íconos de línea en la misma pantalla.

---

## 9. Fotografía e ilustración

- Fotos **cálidas, luminosas y naturales**: hogares reales, luz suave, plantas, madera, puertas de entrada.
- Profesionales **sonrientes**, con uniforme azul marino con el logo, en pose abierta y amigable.
- Formas orgánicas decorativas de fondo (círculos/blobs) en **crema** y **azul claro**, con baja opacidad.
- Evitar imágenes genéricas de stock frías o corporativas.

---

## 10. Voz y textos (microcopy)

**Tono:** cercano, claro, tranquilizador, sin tecnicismos. Tuteo. Frases cortas.

**Frases oficiales de marca:**
- *Tu hogar en buenas manos.*
- *Soluciones para tu hogar, más cerca de ti.*
- *Hogares más simples, vidas más tranquilas.*
- *Personas que solucionan tu día.*
- *Pequeñas soluciones, grandes momentos.*
- *Masi, siempre contigo en casa.*
- *Profesionales de confianza, cuando los necesitas.*

**Ejemplos de microcopy:**

| Contexto | ✅ Sí | ❌ No |
|---|---|---|
| Botón inicial | "Comenzar" | "Iniciar proceso de registro" |
| Búsqueda | "Encuentra ayuda en minutos" | "Realice su solicitud de servicio" |
| Error | "Algo salió mal. Inténtalo de nuevo." | "Error 500: Excepción no controlada" |
| Éxito | "¡Listo! Tu profesional va en camino." | "Transacción procesada correctamente" |

Si la interfaz muestra pagos o transacciones en Stellar, traducir lo técnico a lenguaje humano ("Pago confirmado", no "Hash de transacción validado"). El detalle técnico (hash, red) va en una sección secundaria "Ver detalles".

---

## 11. Movimiento y animación

- Duración: **150–250 ms**, curva `ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- Transiciones sutiles: fade, slide corto (8–16 px), `scale` leve en botones.
- Estados de carga con **skeletons** en gris `#E5E7EB` en lugar de spinners largos.
- Respetar `prefers-reduced-motion`.

---

## 12. Tokens listos para usar

### CSS

```css
:root {
  /* Marca */
  --masi-navy: #1E3A8A;
  --masi-blue: #2563EB;
  --masi-blue-hover: #1D4ED8;
  --masi-orange: #F59E0B;
  --masi-cream: #FEF3C7;
  --masi-gray: #E5E7EB;

  /* Neutros */
  --masi-white: #FFFFFF;
  --masi-bg: #F8FAFF;
  --masi-text: #1F2937;
  --masi-text-muted: #6B7280;

  /* Semánticos */
  --masi-success: #16A34A;
  --masi-error: #DC2626;
  --masi-warning: #F59E0B;
  --masi-info: #2563EB;

  /* Tintes suaves */
  --masi-blue-50: #EFF4FF;
  --masi-orange-50: #FFF7E6;
  --masi-green-50: #E8F7EE;

  /* Degradados */
  --masi-gradient: linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%);
  --masi-gradient-warm: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%);

  /* Tipografía */
  --font-sans: 'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Radios */
  --radius-input: 12px;
  --radius-card: 20px;
  --radius-lg: 24px;
  --radius-pill: 9999px;

  /* Sombras */
  --shadow-sm: 0 2px 8px rgba(30, 58, 138, 0.06);
  --shadow-md: 0 8px 24px rgba(30, 58, 138, 0.10);
  --shadow-lg: 0 16px 40px rgba(30, 58, 138, 0.14);
}

body {
  font-family: var(--font-sans);
  color: var(--masi-text);
  background: var(--masi-bg);
  line-height: 1.6;
}
```

### Tailwind (`tailwind.config.js`)

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        masi: {
          navy: '#1E3A8A',
          blue: '#2563EB',
          'blue-hover': '#1D4ED8',
          orange: '#F59E0B',
          cream: '#FEF3C7',
          gray: '#E5E7EB',
          bg: '#F8FAFF',
          text: '#1F2937',
          muted: '#6B7280',
          success: '#16A34A',
          error: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        xl2: '24px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(30, 58, 138, 0.10)',
      },
    },
  },
};
```

---

## 13. Checklist antes de cada commit de UI

- [ ] ¿Solo uso colores de esta paleta (o sus tintes)?
- [ ] ¿La fuente es Montserrat con los pesos definidos?
- [ ] ¿El naranja se usa solo como acento y con contraste correcto?
- [ ] ¿Botones en píldora, tarjetas con esquinas redondeadas y sombras suaves?
- [ ] ¿Funciona y se ve bien en móvil (360 px de ancho)?
- [ ] ¿Contraste AA cumplido y estados con icono/texto, no solo color?
- [ ] ¿Los textos suenan cercanos, claros y en español neutro?
- [ ] ¿La pantalla transmite **confianza, rapidez y cercanía**?

---

## 14. Lo que NO se debe hacer

- ❌ Añadir colores fuera de la paleta (rojos, morados, verdes fuertes) fuera de los estados semánticos.
- ❌ Usar otras tipografías o mezclar más de una familia.
- ❌ Poner texto blanco sobre naranja o texto naranja pequeño sobre fondos claros.
- ❌ Esquinas rectas, sombras negras duras o bordes gruesos.
- ❌ Pantallas saturadas de información; priorizar una acción principal por pantalla.
- ❌ Lenguaje técnico o frío hacia la persona usuaria.
- ❌ Modificar, deformar o recolorear el logotipo.
