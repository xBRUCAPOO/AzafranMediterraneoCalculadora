/* ════════════════════════════════════════════════════════
   script.js — Azafrán Mediterráneo v2.5
   ────────────────────────────────────────────────────────
   CORRECCIONES iOS + Cloudflare Workers aplicadas:

   ─ H) irA() usa scrollIntoView como fallback
         En Safari iOS, scrollContainer.scrollTo({ behavior:'smooth' })
         a veces falla si el layout no terminó de pintarse.
         Se agrega un try/catch: si scrollTo falla, se usa
         scrollIntoView que Safari sí soporta correctamente.

   ─ I) DOMContentLoaded envuelto en requestAnimationFrame
         En Safari iOS el evento DOMContentLoaded puede dispararse
         antes de que el layout esté calculado (especialmente con dvh).
         El rAF garantiza que el DOM esté pintado antes de adjuntar
         listeners y calcular offsets de scroll.

   ─ J) NUEVO — Doble rAF para Safari iOS 16+
         Safari iOS 16+ a veces necesita dos frames para que
         dvh y el layout queden estabilizados. Se anida un
         segundo requestAnimationFrame dentro del primero.

   ─ K) NUEVO — Configuración de Cloudflare Worker
         El problema de "URL no reconocida como link" en iPhone
         se resuelve principalmente en el Worker, NO en el JS.
         
         En tu Worker de Cloudflare, los headers HTTP deben ser:
         
         export default {
           async fetch(request, env) {
             const response = await env.ASSETS.fetch(request);
             const newHeaders = new Headers(response.headers);
             newHeaders.set('Content-Security-Policy', 'upgrade-insecure-requests');
             newHeaders.set('X-Content-Type-Options', 'nosniff');
             newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
             newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
             return new Response(response.body, {
               status: response.status,
               statusText: response.statusText,
               headers: newHeaders,
             });
           }
         }

         O en wrangler.toml:
         [[headers]]
         for = "/*"
           [headers.values]
           Content-Security-Policy = "upgrade-insecure-requests"
           X-Content-Type-Options = "nosniff"

════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────
   ★ DATOS MAESTROS — editá solo acá para actualizar TODO
────────────────────────────────────────────────────── */
const BULBOS = [
  { id: "cormillos", nombre: "Cormillos", precio: 1020  },
  { id: "n1",        nombre: "Calibre 1", precio: 2390  },
  { id: "n2",        nombre: "Calibre 2", precio: 3910  },
  { id: "n3",        nombre: "Calibre 3", precio: 6300  },
  { id: "n4",        nombre: "Calibre 4", precio: 11760 },
];

const BULBOS_MIX = [
  { id: "n1", nombre: "Calibre 1", precio: 2390 },
  { id: "n2", nombre: "Calibre 2", precio: 3910 },
  { id: "n3", nombre: "Calibre 3", precio: 6300 },
];

const PRECIO_MIX  = 12600;
const DIVISOR_MIX = 4200;

const MAX_DIGITOS_MONTO    = 10;
const MAX_DIGITOS_CANTIDAD = 5;

/* ══════════════════════════════════════════════════════
   UTILIDADES DE FORMATO
══════════════════════════════════════════════════════ */

function ars(n) {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

function formatearMiles(n) {
  if (!n && n !== 0) return "";
  return Math.round(n).toLocaleString("es-AR");
}

function rawValue(input) {
  const limpio = input.value.replace(/\./g, "");
  return parseInt(limpio, 10) || 0;
}

/* ══════════════════════════════════════════════════════
   FORMATEO EN TIEMPO REAL — INPUTS
══════════════════════════════════════════════════════ */

function aplicarFormatoMiles(el, maxDigitos) {
  const posAntes   = el.selectionStart;
  const valorAntes = el.value;

  const soloDigitos      = valorAntes.replace(/\D/g, "");
  const digitosTruncados = soloDigitos.slice(0, maxDigitos);

  const valorFormateado = digitosTruncados
    ? formatearMiles(parseInt(digitosTruncados, 10))
    : "";

  if (el.value !== valorFormateado) {
    const digitosAntesCursor = valorAntes
      .slice(0, posAntes)
      .replace(/\D/g, "")
      .length;

    el.value = valorFormateado;

    let contDigitos = 0;
    let nuevaPos    = 0;
    for (let i = 0; i < valorFormateado.length; i++) {
      if (/\d/.test(valorFormateado[i])) contDigitos++;
      if (contDigitos === digitosAntesCursor) { nuevaPos = i + 1; break; }
    }
    if (contDigitos < digitosAntesCursor) nuevaPos = valorFormateado.length;

    try { el.setSelectionRange(nuevaPos, nuevaPos); } catch(_) {}
  }

  if (el.id === "inputDinero" || el.id === "inputDineroMix") {
    const cantDigitos = digitosTruncados.length;
    const hintId = el.id === "inputDinero" ? "dbCharHint" : "dmCharHint";
    const hint   = document.getElementById(hintId);
    if (hint) {
      const restantes = maxDigitos - cantDigitos;
      hint.textContent = restantes > 0
        ? `máx. ${maxDigitos} dígitos · ${restantes} restante${restantes !== 1 ? "s" : ""}`
        : "✕ Límite alcanzado";
      hint.classList.toggle("limite", restantes === 0);
    }
  }
}

/* ══════════════════════════════════════════════════════
   BLOQUEO DE TECLAS NO NUMÉRICAS
══════════════════════════════════════════════════════ */

function bloquearNoNumerico(event) {
  const teclasBloqueadas = ["e", "E", "+", "-", ".", ","];
  const esControl        = event.ctrlKey || event.metaKey;
  const teclasPermitidas = [
    "Backspace","Delete","Tab","Enter",
    "ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"
  ];
  if (esControl) return;
  if (teclasPermitidas.includes(event.key)) return;
  if (teclasBloqueadas.includes(event.key)) { event.preventDefault(); return; }
  if (!/^\d$/.test(event.key)) event.preventDefault();
}

/* ══════════════════════════════════════════════════════
   TEMA: oscuro / claro
══════════════════════════════════════════════════════ */
function toggleTema() {
  const html   = document.documentElement;
  const icono  = document.getElementById("iconoTema");
  const esDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", esDark ? "light" : "dark");
  icono.textContent = esDark ? "dark_mode" : "light_mode";
  localStorage.setItem("azafran-tema", esDark ? "light" : "dark");
}

/* ══════════════════════════════════════════════════════
   NAVEGACIÓN — FIX H + J
   scrollTo con doble fallback para Safari iOS.
   
   1° intento: scrollTo con behavior smooth (Chrome/FF/Edge)
   2° intento: scrollIntoView (Safari iOS, siempre funciona)
   
   FIX J: El timeout de 50ms da tiempo al layout de dvh
   para estabilizarse en Safari iOS 16+ antes de calcular
   el offsetTop. Sin esto, offsetTop puede ser 0.
══════════════════════════════════════════════════════ */
function irA(idSeccion) {
  const contenedor = document.getElementById("scrollContainer");
  const destino    = document.getElementById(idSeccion);
  if (!contenedor || !destino) return;

  /* FIX J — pequeño delay para que el layout dvh esté listo */
  setTimeout(function() {
    try {
      const top = destino.offsetTop;
      contenedor.scrollTo({ top: top, behavior: "smooth" });
    } catch (e) {
      /* Fallback FIX H: scrollIntoView siempre funciona en Safari iOS */
      destino.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 50);
}

/* ══════════════════════════════════════════════════════
   RENDER — TABLA DE PRECIOS DE REFERENCIA (HOME)
══════════════════════════════════════════════════════ */
function renderPreciosReferencia() {
  const contenedor = document.getElementById("precioRefFilas");
  if (!contenedor) return;

  const todasFilas = [
    ...BULBOS,
    { id: "mix", nombre: "MIX", precio: PRECIO_MIX }
  ];
  const maxPrecio = Math.max(...todasFilas.map(f => f.precio));

  let html = "";
  todasFilas.forEach(fila => {
    const pct   = ((fila.precio / maxPrecio) * 95).toFixed(1);
    const label = fila.precio.toLocaleString("es-AR");
    html += `
      <div class="precio-ref-item">
        <span class="pref-nombre">${fila.nombre}</span>
        <div class="pref-barra-wrap">
          <div class="pref-barra" style="width:${pct}%"></div>
        </div>
        <span class="pref-val">$ ${label}</span>
      </div>`;
  });
  contenedor.innerHTML = html;
}

/* ══════════════════════════════════════════════════════
   RENDER — TABLA BULBOS → DINERO (Página 4)
══════════════════════════════════════════════════════ */
function renderTablaBulboDinero() {
  const contenedor = document.getElementById("bdFilasContenedor");
  if (!contenedor) return;

  let html = "";
  BULBOS.forEach(bulbo => {
    const precioFmt = bulbo.precio.toLocaleString("es-AR");
    html += `
      <div class="bd-fila" data-precio="${bulbo.precio}">
        <span class="bd-nombre">${bulbo.nombre}</span>
        <input
          class="bd-input"
          type="text"
          inputmode="numeric"
          placeholder="0"
          maxlength="6"
          aria-label="Cantidad de ${bulbo.nombre}"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <span class="bd-precio">$ ${precioFmt}</span>
        <span class="bd-importe" aria-live="polite">$ 0</span>
      </div>`;
  });
  contenedor.innerHTML = html;

  contenedor.querySelectorAll(".bd-input").forEach(inp => {
    inp.addEventListener("keydown", bloquearNoNumerico);
    inp.addEventListener("input", () => {
      aplicarFormatoMiles(inp, MAX_DIGITOS_CANTIDAD);
      calcularBulboDinero(inp);
    });
  });
}

/* ══════════════════════════════════════════════════════
   RENDER — SUBTÍTULO MIX (Página 3)
══════════════════════════════════════════════════════ */
function renderSubtituloMix() {
  const el = document.getElementById("precioMixSubtitulo");
  if (el) el.textContent = `MIX = $ ${PRECIO_MIX.toLocaleString("es-AR")}`;
}

/* ══════════════════════════════════════════════════════
   MODO: BULBOS → DINERO
══════════════════════════════════════════════════════ */
function calcularBulboDinero(inputEl) {
  const fila    = inputEl.closest(".bd-fila");
  const precio  = parseInt(fila.dataset.precio, 10);
  const cant    = rawValue(inputEl);
  const importe = precio * cant;

  const spanImporte = fila.querySelector(".bd-importe");
  spanImporte.textContent = "$ " + importe.toLocaleString("es-AR");
  spanImporte.classList.remove("flash");
  void spanImporte.offsetWidth;
  spanImporte.classList.add("flash");

  actualizarTotalBD();
}

function actualizarTotalBD() {
  let total = 0;
  document.querySelectorAll(".bd-fila").forEach(fila => {
    const precio = parseInt(fila.dataset.precio, 10);
    const input  = fila.querySelector(".bd-input");
    const cant   = rawValue(input);
    total += precio * cant;
  });
  document.getElementById("bdTotalValor").textContent =
    "$ " + total.toLocaleString("es-AR");
}

function limpiarBulboDinero() {
  document.querySelectorAll(".bd-input").forEach(inp => { inp.value = ""; });
  document.querySelectorAll(".bd-importe").forEach(sp  => { sp.textContent = "$ 0"; });
  document.getElementById("bdTotalValor").textContent = "$ 0";
}

/* ══════════════════════════════════════════════════════
   MODO: DINERO → BULBOS
══════════════════════════════════════════════════════ */
function mejorCombinacion(presupuesto) {
  const excluidos  = ["Cormillos", "Calibre 4"];
  const permitidos = BULBOS
    .filter(b => !excluidos.includes(b.nombre))
    .sort((a, b) => b.precio - a.precio);

  let restante    = presupuesto;
  const resultado = [];

  for (const bulbo of permitidos) {
    if (restante <= 0) break;
    const cantidad = Math.floor(restante / bulbo.precio);
    if (cantidad > 0) {
      resultado.push({ ...bulbo, cantidad, subtotal: cantidad * bulbo.precio });
      restante -= cantidad * bulbo.precio;
    }
  }
  return { filas: resultado, vuelto: restante };
}

function calcularDineroBulbo() {
  const monto          = rawValue(document.getElementById("inputDinero"));
  const panelVacio     = document.getElementById("dbVacio");
  const panelResultado = document.getElementById("dbResultadoPanel");
  const mixFilas       = document.getElementById("dbMixFilas");
  const totalRow       = document.getElementById("dbTotalRow");

  if (monto <= 0) {
    panelVacio.style.display = "flex";
    panelResultado.classList.remove("visible");
    return;
  }

  const excluidos = ["Cormillos", "Calibre 4"];
  const minPrecio = Math.min(
    ...BULBOS.filter(b => !excluidos.includes(b.nombre)).map(b => b.precio)
  );

  if (monto < minPrecio) {
    panelVacio.style.display = "none";
    panelResultado.classList.add("visible");
    mixFilas.innerHTML = `
      <div class="db-insuficiente">
        <p>Con ${ars(monto)} no alcanza para ningún bulbo.<br>
        <small style="font-size:0.7rem;opacity:0.65;font-family:'Exo 2',sans-serif">
          El más económico (Calibre 1) cuesta ${ars(minPrecio)}.
        </small></p>
      </div>`;
    totalRow.innerHTML = "";
    return;
  }

  const { filas, vuelto } = mejorCombinacion(monto);
  const totalGastado = monto - vuelto;
  const totalBulbos  = filas.reduce((s, f) => s + f.cantidad, 0);

  panelVacio.style.display = "none";
  panelResultado.classList.add("visible");

  let html = "";
  filas.forEach(f => {
    html += `
      <div class="db-mix-fila">
        <span class="db-mix-nombre">${f.nombre}</span>
        <span class="db-mix-qty">${f.cantidad}</span>
        <span class="db-mix-subtotal">${ars(f.subtotal)}</span>
      </div>`;
  });
  mixFilas.innerHTML = html;

  totalRow.innerHTML = `
    <div class="db-total-izq">
      <span class="db-total-label">TOTAL · ${totalBulbos} bulbo${totalBulbos !== 1 ? "s" : ""}</span>
      <span class="db-total-num">${ars(totalGastado)}</span>
    </div>
    <div class="db-vuelto-wrap">
      <div class="db-vuelto-label">Vuelto</div>
      <div class="db-vuelto-val">${ars(vuelto)}</div>
    </div>`;
}

function limpiarDineroBulbo() {
  const inp = document.getElementById("inputDinero");
  if (inp) inp.value = "";
  const hint = document.getElementById("dbCharHint");
  if (hint) { hint.textContent = `máx. ${MAX_DIGITOS_MONTO} dígitos`; hint.classList.remove("limite"); }
  calcularDineroBulbo();
}

/* ══════════════════════════════════════════════════════
   MODO: DINERO → MIX
══════════════════════════════════════════════════════ */
function calcularDineroMix() {
  const monto          = rawValue(document.getElementById("inputDineroMix"));
  const panelVacio     = document.getElementById("dmVacio");
  const panelResultado = document.getElementById("dmResultadoPanel");
  const mixFilas       = document.getElementById("dmMixFilas");
  const totalRow       = document.getElementById("dmTotalRow");
  const formulaChip    = document.getElementById("dmFormulaChip");

  if (monto <= 0) {
    panelVacio.style.display = "flex";
    panelResultado.classList.remove("visible");
    return;
  }

  const A = monto / DIVISOR_MIX;
  const B = Math.floor(A / 3);

  const costoTotal = BULBOS_MIX.reduce((sum, b) => sum + B * b.precio, 0);
  const vuelto     = monto - costoTotal;

  if (B === 0) {
    panelVacio.style.display = "none";
    panelResultado.classList.add("visible");
    const minNecesario = BULBOS_MIX.reduce((sum, b) => sum + b.precio, 0);
    mixFilas.innerHTML = `
      <div class="db-insuficiente">
        <p>Con ${ars(monto)} no alcanza para el mix mínimo.<br>
        <small style="font-size:0.7rem;opacity:0.65;font-family:'Exo 2',sans-serif">
          Se necesitan al menos ${ars(minNecesario)} para obtener 1 bulbo de cada calibre.
        </small></p>
      </div>`;
    totalRow.innerHTML = "";
    formulaChip.innerHTML = "";
    return;
  }

  panelVacio.style.display = "none";
  panelResultado.classList.add("visible");

  formulaChip.innerHTML = `
    <span>A = ${formatearMiles(monto)} / ${DIVISOR_MIX} = <strong>${A.toFixed(2)}</strong></span>
    <span class="dm-sep">·</span>
    <span>B = floor(A / 3) = <strong>${B}</strong> bulbos por calibre</span>
  `;

  let html = "";
  BULBOS_MIX.forEach(b => {
    const subtotal = B * b.precio;
    html += `
      <div class="db-mix-fila">
        <span class="db-mix-nombre">${b.nombre}</span>
        <span class="db-mix-qty">${B}</span>
        <span class="db-mix-subtotal">${ars(subtotal)}</span>
      </div>`;
  });
  mixFilas.innerHTML = html;

  const totalBulbos = B * BULBOS_MIX.length;
  totalRow.innerHTML = `
    <div class="db-total-izq">
      <span class="db-total-label">TOTAL · ${totalBulbos} bulbo${totalBulbos !== 1 ? "s" : ""}</span>
      <span class="db-total-num">${ars(costoTotal)}</span>
    </div>
    <div class="db-vuelto-wrap">
      <div class="db-vuelto-label">Vuelto</div>
      <div class="db-vuelto-val">${ars(vuelto)}</div>
    </div>`;
}

function limpiarDineroMix() {
  const inp = document.getElementById("inputDineroMix");
  if (inp) inp.value = "";
  const hint = document.getElementById("dmCharHint");
  if (hint) { hint.textContent = `máx. ${MAX_DIGITOS_MONTO} dígitos`; hint.classList.remove("limite"); }
  calcularDineroMix();
}

/* ══════════════════════════════════════════════════════
   INIT — FIX I + J: doble requestAnimationFrame para Safari iOS
   
   FIX I: DOMContentLoaded + rAF garantiza que el DOM
   esté pintado antes de adjuntar listeners.
   
   FIX J: El segundo rAF anidado es necesario en Safari
   iOS 16+ donde dvh puede tardar dos frames en
   estabilizarse. Sin esto, offsetTop de las secciones
   puede calcularse como 0 y el scroll no funciona.
══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {     /* FIX I — primer frame */
    requestAnimationFrame(() => {   /* FIX J — segundo frame para dvh en Safari iOS 16+ */

      /* 1. Restaurar tema guardado */
      const temaGuardado = localStorage.getItem("azafran-tema");
      if (temaGuardado) {
        document.documentElement.setAttribute("data-theme", temaGuardado);
        const icono = document.getElementById("iconoTema");
        if (icono) icono.textContent = temaGuardado === "light" ? "dark_mode" : "light_mode";
      }

      /* 2. Renderizar elementos dinámicos */
      renderPreciosReferencia();
      renderTablaBulboDinero();
      renderSubtituloMix();

      /* 3. Listeners inputs de monto */
      const inputDinero = document.getElementById("inputDinero");
      if (inputDinero) {
        inputDinero.addEventListener("keydown", bloquearNoNumerico);
        inputDinero.addEventListener("input", () => {
          aplicarFormatoMiles(inputDinero, MAX_DIGITOS_MONTO);
          calcularDineroBulbo();
        });
      }

      const inputDineroMix = document.getElementById("inputDineroMix");
      if (inputDineroMix) {
        inputDineroMix.addEventListener("keydown", bloquearNoNumerico);
        inputDineroMix.addEventListener("input", () => {
          aplicarFormatoMiles(inputDineroMix, MAX_DIGITOS_MONTO);
          calcularDineroMix();
        });
      }

      /* 4. Interceptor global de PASTE */
      document.addEventListener("paste", (e) => {
        const target = e.target;
        if (!target.matches(".bd-input, #inputDinero, #inputDineroMix")) return;
        e.preventDefault();

        const texto       = (e.clipboardData || window.clipboardData).getData("text");
        const soloDigitos = texto.replace(/\D/g, "");

        let maxDigitos = MAX_DIGITOS_CANTIDAD;
        if (target.id === "inputDinero" || target.id === "inputDineroMix") maxDigitos = MAX_DIGITOS_MONTO;

        const actual   = target.value.replace(/\D/g, "");
        const combined = (actual + soloDigitos).slice(0, maxDigitos);
        target.value   = combined;

        target.dispatchEvent(new Event("input", { bubbles: true }));
      });

    }); /* fin segundo requestAnimationFrame — FIX J */
  });   /* fin primer requestAnimationFrame — FIX I */
});