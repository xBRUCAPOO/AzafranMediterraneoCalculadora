/* ════════════════════════════════════════════════════════
   script.js — Azafrán Mediterráneo v2.5
   FUENTE ÚNICA DE VERDAD: BULBOS, BULBOS_MIX, PRECIO_MIX, DIVISOR_MIX
   Todos los precios visibles en HTML se renderizan desde acá.
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

/* Precio del MIX que se muestra en tabla de referencia y subtítulo */
const PRECIO_MIX = 12600;

/* Divisor para la fórmula A = monto / DIVISOR_MIX */
const DIVISOR_MIX = 4200;

/* Máximo de dígitos "reales" (sin puntos de miles) */
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
   NAVEGACIÓN
══════════════════════════════════════════════════════ */
function irA(idSeccion) {
  const contenedor = document.getElementById("scrollContainer");
  const destino    = document.getElementById(idSeccion);
  if (!contenedor || !destino) return;
  contenedor.scrollTo({ top: destino.offsetTop, behavior: "smooth" });
}

/* ══════════════════════════════════════════════════════
   RENDER DINÁMICO — TABLA DE PRECIOS DE REFERENCIA (HOME)
   Lee BULBOS + PRECIO_MIX y construye las filas en el DOM.
══════════════════════════════════════════════════════ */

function renderPreciosReferencia() {
  const contenedor = document.getElementById("precioRefFilas");
  if (!contenedor) return;

  /* Combinar BULBOS + fila MIX */
  const todasFilas = [
    ...BULBOS,
    { id: "mix", nombre: "MIX", precio: PRECIO_MIX }
  ];

  /* Precio máximo para calcular ancho de barras */
  const maxPrecio = Math.max(...todasFilas.map(f => f.precio));

  let html = "";
  todasFilas.forEach(fila => {
    const pct   = ((fila.precio / maxPrecio) * 95).toFixed(1); /* máx 95% visual */
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
   RENDER DINÁMICO — TABLA BULBOS→DINERO (Página 4)
   Genera las filas a partir de BULBOS.
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
        />
        <span class="bd-precio">$ ${precioFmt}</span>
        <span class="bd-importe" aria-live="polite">$ 0</span>
      </div>`;
  });

  contenedor.innerHTML = html;

  /* Re-adjuntar listeners luego de renderizar */
  contenedor.querySelectorAll(".bd-input").forEach(inp => {
    inp.addEventListener("keydown", bloquearNoNumerico);
    inp.addEventListener("input", () => {
      aplicarFormatoMiles(inp, MAX_DIGITOS_CANTIDAD);
      calcularBulboDinero(inp);
    });
  });
}

/* ══════════════════════════════════════════════════════
   RENDER DINÁMICO — SUBTÍTULO MIX (Página 3)
   Muestra "MIX = $ X.XXX" leyendo PRECIO_MIX.
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
   INIT — se ejecuta al cargar el DOM
══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

  /* ── 1. Restaurar tema guardado ── */
  const temaGuardado = localStorage.getItem("azafran-tema");
  if (temaGuardado) {
    document.documentElement.setAttribute("data-theme", temaGuardado);
    const icono = document.getElementById("iconoTema");
    if (icono) icono.textContent = temaGuardado === "light" ? "dark_mode" : "light_mode";
  }

  /* ── 2. Renderizar elementos dinámicos desde las constantes ── */
  renderPreciosReferencia();  /* tabla de referencia en HOME */
  renderTablaBulboDinero();   /* filas de la tabla Bulbos→Dinero */
  renderSubtituloMix();       /* "MIX = $ X.XXX" en Dinero→MIX */

  /* ── 3. Listeners para inputs de MONTO ── */
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

  /* ── 4. Interceptor global de PASTE ── */
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

});