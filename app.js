// --- LÓGICA DE DARK MODE (Tema Champions) ---
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
// ----------------------------------------------


const API_URL = 'https://script.google.com/macros/s/AKfycbxJ1v6OSw_FoSP4ENN74UImNwCr7lX9h_VKJTM7jANlvIJ4R93hsK9cZ2hAEDgt9KjKiQ/exec'; // ¡No olvides poner tu URL!

// Referencias a las secciones de la interfaz
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const selectPartido = document.getElementById('partido');
const errorMsg = document.getElementById('loginError');


// Verificar si el usuario ya inició sesión previamente
let usuarioLogueado = localStorage.getItem('prodeUsuario');

if (usuarioLogueado) {
    mostrarApp();
}

// LÓGICA DE LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Verificando...';
    errorMsg.style.display = 'none';

    const user = document.getElementById('loginUsuario').value;
    const pass = document.getElementById('loginPassword').value;

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', usuario: user, password: pass })
        });
        const resultado = await respuesta.json();

        if (resultado.success) {
            usuarioLogueado = user;
            localStorage.setItem('prodeUsuario', user); // Guarda sesión en el navegador
            mostrarApp();
        } else {
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        alert('Error al conectar con el servidor.');
    } finally {
        btn.innerText = 'Entrar';
    }
});

// CERRAR SESIÓN
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('prodeUsuario');
    usuarioLogueado = null;
    loginSection.classList.remove('oculto');
    appSection.classList.add('oculto');
    document.getElementById('loginForm').reset();
});

// MOSTRAR LA APP (Y cargar datos)
function mostrarApp() {
    loginSection.classList.add('oculto');
    appSection.classList.remove('oculto');
    document.getElementById('nombreUsuarioUI').innerText = usuarioLogueado;
    
    cargarPartidosPendientes();
    cargarDatosApp(); // Llamamos a la nueva función aquí
}

// OBTENER PARTIDOS PENDIENTES DEL USUARIO LOGUEADO
async function cargarPartidosPendientes() {
    selectPartido.innerHTML = '<option value="">Cargando partidos...</option>';
    try {
        // En un GET, pasamos los parámetros por la URL
        const urlPeticion = `${API_URL}?action=pendientes&usuario=${encodeURIComponent(usuarioLogueado)}`;
        const respuesta = await fetch(urlPeticion);
        const pendientes = await respuesta.json();

        selectPartido.innerHTML = ''; // Limpiamos opciones
        
        if (pendientes.length === 0) {
            selectPartido.innerHTML = '<option value="">¡Ya completaste todos los partidos!</option>';
            selectPartido.disabled = true;
        } else {
            selectPartido.disabled = false;
            pendientes.forEach(partido => {
                const opcion = document.createElement('option');
                opcion.value = partido;
                opcion.innerText = partido;
                selectPartido.appendChild(opcion);
            });
        }
    } catch (error) {
        selectPartido.innerHTML = '<option value="">Error al cargar partidos</option>';
    }
}

// GUARDAR UN NUEVO PRONÓSTICO
document.getElementById('prodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Guardando...';
    
    const datos = {
        action: 'guardar',
        usuario: usuarioLogueado, // Usamos el usuario que inició sesión
        partido: selectPartido.value,
        golesLocal: document.getElementById('golesLocal').value,
        golesVisitante: document.getElementById('golesVisitante').value
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });
        mostrarAlerta('⚽ ¡Jugada guardada con éxito!', 'success');
        e.target.reset(); // Limpia los goles
        cargarPartidosPendientes(); // Recarga el select para que desaparezca el partido que acaba de cargar
        cargarDatosApp(); // Actualiza la tabla inferior
    } catch (error) {
        mostrarAlerta('Hubo un error al guardar. Intenta de nuevo.', 'error');
    } finally {
        btn.innerText = 'Guardar Pronóstico';
    }
});

// CARGAR RANKING Y MIS PRONÓSTICOS
async function cargarDatosApp() {
    try {
        // Le pasamos el usuario logueado para que Apps Script sepa de quién devolver los detalles
        const urlPeticion = `${API_URL}?action=datosApp&usuario=${encodeURIComponent(usuarioLogueado)}`;
        const respuesta = await fetch(urlPeticion);
        const datos = await respuesta.json();
        
        // 1. Mostrar Ranking General (Solo nombre y puntos totales)
        let htmlRanking = '';
        if (datos.ranking.length > 0) {
            datos.ranking.forEach((item, index) => {
                // Destacar al usuario logueado en la tabla
                const esYo = item.usuario === usuarioLogueado ? "style='font-weight: bold; color: #1a73e8;'" : "";
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

        // 2. Mostrar MIS Pronósticos (Con resultados exactos, colores y fechas)
        let htmlMisPronosticos = '';
        if (datos.misPronosticos.length > 0) {
            datos.misPronosticos.forEach(item => {
                
                let claseColor = '';
                let textoAdicional = ''; 
                
                if (item.jugado) {
                    // Lógica para cuando el partido YA TERMINÓ
                    if (item.puntos === 6) claseColor = 'pts-6';
                    else if (item.puntos === 3) claseColor = 'pts-3';
                    else claseColor = 'pts-0';
                    
                    textoAdicional = `<br><small style="opacity: 0.9;">✅ Resultado Final: <strong>${item.golesLocalReal} - ${item.golesVisitanteReal}</strong></small>`;
                } else {
                    // Lógica para cuando el partido AÚN NO SE JUGÓ
                    let fechaFormateada = 'Fecha a definir';
                    if (item.fecha) {
                        // Convertimos la fecha que viene de Google a un formato amigable (ej: 01/09/2026)
                        const fechaObj = new Date(item.fecha);
                        // Ajuste de zona horaria para evitar que caiga un día antes por la diferencia horaria
                        fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
                        fechaFormateada = fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

    } catch (error) {
        document.getElementById('rankingResultados').innerHTML = '<p>Error al cargar el ranking.</p>';
        document.getElementById('misResultados').innerHTML = '<p>Error al cargar tus pronósticos.</p>';
    }
}

// FUNCIÓN PARA MOSTRAR ALERTAS BONITAS
function mostrarAlerta(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    
    // Seteamos el texto y reiniciamos las clases
    toast.innerText = mensaje;
    toast.className = `toast ${tipo}`; 
    
    // Pequeño truco para que el navegador registre el cambio y anime
    setTimeout(() => {
        toast.classList.add('mostrar');
    }, 10);

    // Ocultar automáticamente después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('mostrar');
    }, 3000);
}