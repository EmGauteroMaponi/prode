// ==========================================
// 1. CONFIGURACIÓN Y TEMA
// ==========================================
// ¡IMPORTANTE! Reemplazá esto por tu NUEVA URL de implementación si creaste una.
const API_URL = 'https://script.google.com/macros/s/AKfycbzMPcGN3rTC7FzxhlsiSxZtIrKpCBfRDbs_yPng2PebtWEQxRft0unbMdLrP_VM7vhM/exec';

const temaActual = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', temaActual);
actualizarBotonesTema(temaActual);

function toggleTheme() {
    let tema = document.documentElement.getAttribute('data-theme');
    let nuevoTema = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevoTema);
    localStorage.setItem('theme', nuevoTema);
    actualizarBotonesTema(nuevoTema);
}

function actualizarBotonesTema(tema) {
    const texto = tema === 'dark' ? '☀️ Light' : '🌙 Dark';
    document.getElementById('btn-theme-login').innerText = texto;
    document.getElementById('btn-theme-app').innerText = texto;
}

document.getElementById('btn-theme-login').addEventListener('click', toggleTheme);
document.getElementById('btn-theme-app').addEventListener('click', toggleTheme);


// ==========================================
// 2. ESTADO GLOBAL Y ARRANQUE
// ==========================================
let usuarioLogueado = localStorage.getItem('prodeUsuario');
let borradorJugadas = [];
let pendientesGlobal = [];

window.addEventListener('DOMContentLoaded', async () => {
    if (usuarioLogueado) {
        document.getElementById('nombreUsuarioUI').innerText = usuarioLogueado.toUpperCase();
        document.getElementById('login-section').classList.add('oculto');
        await inicializarApp();
    }
});

async function inicializarApp() {
    mostrarLoader();
    try {
        await cargarDatosApp();
        document.getElementById('login-section').classList.add('oculto');
        document.getElementById('app-section').classList.remove('oculto');
    } catch (error) {
        console.error("Error cargando datos:", error);
        mostrarAlerta('Error al cargar la información del torneo.', 'error');
    } finally {
        ocultarLoader();
    }
}


// ==========================================
// 3. NÚCLEO DE DATOS Y RENDERIZADO
// ==========================================
async function cargarDatosApp() {
    const urlPeticion = `${API_URL}?action=datosApp&usuario=${encodeURIComponent(usuarioLogueado)}`;
    const respuesta = await fetch(urlPeticion);
    const datos = await respuesta.json();

    renderPartidosPendientes(datos.pendientes);
    renderPronosticosEspeciales(datos.especiales);
    renderRanking(datos.ranking);
    renderMisPronosticos(datos.misPronosticos);
}

// Función auxiliar para dejar la fecha linda (¡Ahora con horarios!)
function formatearFecha(fechaStr, horarioStr) {
    if (!fechaStr) return 'Sin fecha definida';
    const fechaObj = new Date(fechaStr);
    fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
    
    let textoFecha = fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (horarioStr) {
        textoFecha += ` - ${horarioStr}hs`;
    }
    return textoFecha;
}

// Renderizar Pendientes (y cargar Filtro)
function renderPartidosPendientes(pendientes) {
    const cardCarga = document.getElementById('card-carga-pronosticos');

    pendientesGlobal = pendientes.map(p => ({
        partido: p.partido,
        fechaFormateada: formatearFecha(p.fecha, p.horario)
    }));

    if (pendientesGlobal.length === 0) {
        cardCarga.classList.add('oculto');
    } else {
        cardCarga.classList.remove('oculto');
        pintarFiltroFechas();
    }
}

function pintarFiltroFechas() {
    const selectFecha = document.getElementById('filtroFecha');
    const fechaActualSeleccionada = selectFecha.value; 

    const fechasUnicas = [...new Set(pendientesGlobal.map(p => p.fechaFormateada))];
    selectFecha.innerHTML = '<option value="">Todas las fechas...</option>';
    
    fechasUnicas.forEach(fecha => {
        const selected = (fecha === fechaActualSeleccionada) ? 'selected' : '';
        selectFecha.innerHTML += `<option value="${fecha}" ${selected}>${fecha}</option>`;
    });

    pintarSelectPartidos(); 
}

function pintarSelectPartidos() {
    const selectFecha = document.getElementById('filtroFecha');
    const selectPartido = document.getElementById('partido');
    const fechaFiltrada = selectFecha.value;

    selectPartido.innerHTML = '<option value="">Selecciona un partido...</option>';

    const partidosAMostrar = fechaFiltrada 
        ? pendientesGlobal.filter(p => p.fechaFormateada === fechaFiltrada) 
        : pendientesGlobal;

    if (partidosAMostrar.length === 0) {
        selectPartido.innerHTML = '<option value="">No hay partidos para esta fecha</option>';
        selectPartido.disabled = true;
    } else {
        selectPartido.disabled = false;
        partidosAMostrar.forEach(p => {
            selectPartido.innerHTML += `<option value="${p.partido}">${p.partido}</option>`;
        });
    }
}

document.getElementById('filtroFecha').addEventListener('change', pintarSelectPartidos);

function renderPronosticosEspeciales(esp) {
    const llenarSelect = (idSelect, lista, valorGuardado, estaHabilitado) => {
        const select = document.getElementById(idSelect);
        select.innerHTML = '<option value="">Selecciona un equipo...</option>';
        lista.forEach(equipo => {
            const selected = equipo === valorGuardado ? 'selected' : '';
            select.innerHTML += `<option value="${equipo}" ${selected}>${equipo}</option>`;
        });
        select.disabled = !estaHabilitado;
    };

    llenarSelect('selCampeon', esp.listas.campeon, esp.misSelecciones.campeon, esp.habilitado.campeon);
    llenarSelect('selSorpresa', esp.listas.sorpresa, esp.misSelecciones.sorpresa, esp.habilitado.sorpresa);
    llenarSelect('selDecepcion', esp.listas.decepcion, esp.misSelecciones.decepcion, esp.habilitado.decepcion);

    const formBtn = document.getElementById('btn-guardar-especiales');
    const msgCerrado = document.getElementById('msg-especiales-cerrado');

    if (!esp.habilitado.campeon && !esp.habilitado.sorpresa && !esp.habilitado.decepcion) {
        formBtn.classList.add('oculto');
        msgCerrado.innerText = '⚠️ Todas las predicciones especiales están cerradas.';
        msgCerrado.classList.remove('oculto');
    } else if (!esp.habilitado.campeon || !esp.habilitado.sorpresa || !esp.habilitado.decepcion) {
        formBtn.classList.remove('oculto');
        msgCerrado.innerText = '⚠️ Algunas categorías ya cerraron y no pueden modificarse.';
        msgCerrado.classList.remove('oculto');
    } else {
        formBtn.classList.remove('oculto');
        msgCerrado.classList.add('oculto');
    }
}

function renderRanking(ranking) {
    let htmlRanking = '';
    if (ranking.length > 0) {
        ranking.forEach((item, index) => {
            const esYo = item.usuario === usuarioLogueado ? "style='font-weight: bold; color: var(--primary-color);'" : "";
            htmlRanking += `
                <div class="pronostico-item" ${esYo}>
                    ${index + 1}° - ${item.usuario}: ${item.puntosTotales} pts
                </div>
            `;
        });
    } else {
        htmlRanking = '<p>Aún no hay puntos.</p>';
    }
    document.getElementById('rankingResultados').innerHTML = htmlRanking;
}

function renderMisPronosticos(misPronosticos) {
    let htmlMisPronosticos = '';
    if (misPronosticos.length > 0) {
        misPronosticos.forEach(item => {
            let claseColor = '';
            let textoAdicional = ''; 
            
            if (item.jugado) {
                if (item.puntos === 6) claseColor = 'pts-6';
                else if (item.puntos === 3) claseColor = 'pts-3';
                else claseColor = 'pts-0';
                
                textoAdicional = `<br><small style="opacity: 0.9;">✅ Resultado Final: <strong>${item.golesLocalReal} - ${item.golesVisitanteReal}</strong></small>`;
            } else {
                let fechaFormateada = 'Fecha a definir';
                if (item.fecha) {
                    const fechaObj = new Date(item.fecha);
                    fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
                    fechaFormateada = fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    if (item.horario) {
                        fechaFormateada += ` a las ${item.horario}hs`;
                    }
                }
                textoAdicional = `<br><small style="opacity: 0.9;">⏳ Se juega el: <strong>${fechaFormateada}</strong></small>`;
            }

            htmlMisPronosticos += `
                <div class="pronostico-item ${claseColor}">
                    <strong>${item.partido}</strong> <br>
                    Mi apuesta: ${item.golesLocal} - ${item.golesVisitante} 
                    ${item.jugado ? `(Sumé: <strong>${item.puntos} pts</strong>)` : '<em style="opacity:0.7;">(Pendiente)</em>'}
                    ${textoAdicional}
                </div>
            `;
        });
    } else {
        htmlMisPronosticos = '<p>Aún no cargaste ningún pronóstico.</p>';
    }
    document.getElementById('misResultados').innerHTML = htmlMisPronosticos;
}


// ==========================================
// 4. EVENTOS Y LÓGICA DE INTERFAZ
// ==========================================

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const errorMsg = document.getElementById('loginError');
    btn.innerText = 'Verificando...';
    errorMsg.style.display = 'none';

    const user = document.getElementById('loginUsuario').value;
    const passPlana = document.getElementById('loginPassword').value;
    const passOfuscada = btoa(passPlana); 

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', usuario: user, password: passOfuscada })
        });
        const resultado = await respuesta.json();

        if (resultado.success) {
            usuarioLogueado = user;
            
            if (passOfuscada === 'MTIzNDU2') {
                document.getElementById('modal-password').classList.remove('oculto');
            } else {
                localStorage.setItem('prodeUsuario', user); 
                document.getElementById('nombreUsuarioUI').innerText = usuarioLogueado.toUpperCase();
                await inicializarApp();
            }
        } else {
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        mostrarAlerta('Error al conectar con el servidor.', 'error');
    } finally {
        btn.innerText = 'Entrar a la Cancha';
    }
});

// Cambiar Contraseña Obligatoria
document.getElementById('formCambioPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Guardando...';
    btn.disabled = true;

    const nuevaPassPlana = document.getElementById('nuevaPassword').value;
    const nuevaPassOfuscada = btoa(nuevaPassPlana); 

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'cambiarPassword', usuario: usuarioLogueado, nuevaPassword: nuevaPassOfuscada })
        });

        document.getElementById('modal-password').classList.add('oculto');
        localStorage.setItem('prodeUsuario', usuarioLogueado);
        document.getElementById('nombreUsuarioUI').innerText = usuarioLogueado.toUpperCase();
        
        await inicializarApp();
        mostrarAlerta('Contraseña actualizada con éxito', 'success');
        
    } catch (error) {
        mostrarAlerta('Error al cambiar la contraseña.', 'error');
        btn.innerText = 'Guardar y Entrar';
        btn.disabled = false;
    }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('prodeUsuario');
    usuarioLogueado = null;
    document.getElementById('app-section').classList.add('oculto');
    document.getElementById('login-section').classList.remove('oculto');
    document.getElementById('loginForm').reset();
});

// Agregar al Borrador
document.getElementById('prodeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const selectFecha = document.getElementById('filtroFecha');
    const fechaElegida = selectFecha.value; 
    const partidoSeleccionado = document.getElementById('partido').value;
    
    if (!partidoSeleccionado) {
        mostrarAlerta('Por favor, selecciona un partido válido.', 'error');
        return;
    }

    const partidoObj = pendientesGlobal.find(p => p.partido === partidoSeleccionado);
    
    borradorJugadas.push({
        partido: partidoSeleccionado,
        golesLocal: document.getElementById('golesLocal').value,
        golesVisitante: document.getElementById('golesVisitante').value,
        fechaFormateada: partidoObj.fechaFormateada 
    });
    
    pendientesGlobal = pendientesGlobal.filter(p => p.partido !== partidoSeleccionado);
    
    e.target.reset();
    selectFecha.value = fechaElegida;
    
    actualizarBorradorUI();
    
    if (pendientesGlobal.length === 0) {
        document.getElementById('card-carga-pronosticos').classList.add('oculto');
    } else {
        pintarFiltroFechas(); 
    }
    
    mostrarAlerta('Agregado al borrador', 'success');
});

// UI del Borrador
function actualizarBorradorUI() {
    const draftSection = document.getElementById('draft-section');
    const draftList = document.getElementById('draft-list');
    
    if (borradorJugadas.length === 0) {
        draftSection.classList.add('oculto');
        return;
    }
    
    draftSection.classList.remove('oculto');
    draftList.innerHTML = borradorJugadas.map((jugada, index) => `
        <div class="pronostico-item" style="display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${jugada.partido}</strong> <br> ${jugada.golesLocal} - ${jugada.golesVisitante}</span>
            <button type="button" onclick="eliminarDelBorrador(${index})" style="width:auto; padding:6px 12px; background:var(--color-danger); color:white; border-radius:4px; font-size:12px;">X</button>
        </div>
    `).join('');
}

// Eliminar del Borrador
window.eliminarDelBorrador = function(index) {
    const jugadaEliminada = borradorJugadas[index];
    
    pendientesGlobal.push({
        partido: jugadaEliminada.partido,
        fechaFormateada: jugadaEliminada.fechaFormateada
    });
    
    borradorJugadas.splice(index, 1);
    
    actualizarBorradorUI();
    document.getElementById('card-carga-pronosticos').classList.remove('oculto');
    pintarFiltroFechas(); 
};

// Confirmar Borrador
document.getElementById('btn-confirm-draft').addEventListener('click', async () => {
    const btn = document.getElementById('btn-confirm-draft');
    btn.innerText = 'Enviando Jugadas...';
    btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'guardar', usuario: usuarioLogueado, predicciones: borradorJugadas })
        });
        
        mostrarAlerta('⚽ ¡Todas las jugadas guardadas con éxito!', 'success');
        borradorJugadas = []; 
        actualizarBorradorUI();
        
        await cargarDatosApp(); 
    } catch (error) {
        mostrarAlerta('Hubo un error al enviar el borrador. Intenta de nuevo.', 'error');
    } finally {
        btn.innerText = 'Confirmar y Enviar Todo';
        btn.disabled = false;
    }
});

// Guardar Especiales
document.getElementById('formEspeciales').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-especiales');
    btn.innerText = 'Guardando...';
    btn.disabled = true;
    
    const datosEspeciales = {
        action: 'guardarEspeciales',
        usuario: usuarioLogueado,
        campeon: document.getElementById('selCampeon').value,
        sorpresa: document.getElementById('selSorpresa').value,
        decepcion: document.getElementById('selDecepcion').value
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datosEspeciales)
        });
        mostrarAlerta('🔮 ¡Predicciones del torneo guardadas!', 'success');
    } catch (error) {
        mostrarAlerta('Hubo un error al guardar las predicciones.', 'error');
    } finally {
        btn.innerText = 'Guardar Predicciones';
        btn.disabled = false;
    }
});


// ==========================================
// 5. UTILIDADES VISUALES (Loaders y Toasts)
// ==========================================
function mostrarLoader() { document.getElementById('global-loader').classList.remove('oculto'); }
function ocultarLoader() { document.getElementById('global-loader').classList.add('oculto'); }

function mostrarAlerta(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = mensaje;
    toast.className = `toast ${tipo}`; 
    setTimeout(() => toast.classList.add('mostrar'), 10);
    setTimeout(() => toast.classList.remove('mostrar'), 3000);
}