// Dirección de la API FastAPI
const API_URL = "http://localhost:8000";

// Referencias a los elementos del HTML
const formulario = document.getElementById("loan-form");
const tituloLibro = document.getElementById("titulo_libro");
const usuario = document.getElementById("usuario");
const diasPrestamo = document.getElementById("dias_prestamo");
const devuelto = document.getElementById("devuelto");
const estadoTexto = document.getElementById("status-label");
const loanId = document.getElementById("loan-id");
const tituloFormulario = document.getElementById("form-title");
const botonGuardar = document.getElementById("submit-button");
const botonCancelar = document.getElementById("cancel-edit");
const contenedorPrestamos = document.getElementById("loans-grid");
const contadorPrestamos = document.getElementById("loan-count");
const estadisticaTotal = document.getElementById("stat-total");
const estadisticaPendiente = document.getElementById("stat-pending");
const estadisticaDevueltos = document.getElementById("stat-returned");
const buscador = document.getElementById("search-loan");
const cargando = document.getElementById("loading");
const mensajeError = document.getElementById("error-message");
const estadoVacio = document.getElementById("empty-state");
const vistaCompleta = document.body.dataset.view === "all";

// Lista donde guardamos los préstamos recibidos por el GET
let prestamos = [];

// Cambia la palabra Pendiente/Devuelto al mover el interruptor
devuelto?.addEventListener("change", function () {
    if (devuelto.checked) {
        estadoTexto.textContent = "Devuelto";
    } else {
        estadoTexto.textContent = "Pendiente";
    }
});

// Filtra los préstamos mientras escribe el usuario
buscador?.addEventListener("input", mostrarPrestamos);

// -------------------- CREAR O ACTUALIZAR --------------------
formulario?.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Los datos se toman de los campos del formulario
    const datosPrestamo = {
        titulo_libro: tituloLibro.value.trim(),
        usuario: usuario.value.trim(),
        dias_prestamo: Number(diasPrestamo.value),
        devuelto: devuelto.checked
    };

    try {
        let respuesta;

        if (loanId.value === "") {
            // POST: crear un préstamo nuevo
            respuesta = await fetch(API_URL + "/prestamos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datosPrestamo)
            });
        } else {
            // PUT: actualizar un préstamo existente
            respuesta = await fetch(API_URL + "/prestamos/" + loanId.value, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datosPrestamo)
            });
        }

        // Si FastAPI devuelve un error, se muestra en el navegador
        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.detail || "No se pudo guardar el préstamo");
        }

        mostrarNotificacion(loanId.value === "" ? "Préstamo creado correctamente" : "Préstamo actualizado correctamente");

        limpiarFormulario();
        await cargarPrestamos(); // Actualiza la lista sin recargar la página

    } catch (error) {
        mostrarNotificacion(error.message, true);
    }
});

// -------------------- CONSULTAR DATOS (GET) --------------------
async function cargarPrestamos() {
    cargando.classList.remove("hidden");
    mensajeError.classList.add("hidden");

    try {
        // fetch realiza una petición GET a FastAPI
        const respuesta = await fetch(API_URL + "/prestamos");

        if (!respuesta.ok) {
            throw new Error("Error al consultar los préstamos");
        }

        // El JSON recibido se convierte en un arreglo de JavaScript
        prestamos = await respuesta.json();
        mostrarPrestamos();

        const idParaEditar = new URLSearchParams(window.location.search).get("editar");
        if (idParaEditar && formulario) {
            const prestamo = prestamos.find((item) => String(item.id || item._id) === idParaEditar);
            if (prestamo) prepararEdicion(prestamo);
            window.history.replaceState({}, "", window.location.pathname);
        }

    } catch (error) {
        contenedorPrestamos.innerHTML = "";
        contadorPrestamos.textContent = "0";
        estadoVacio.classList.add("hidden");
        mensajeError.classList.remove("hidden");

    } finally {
        cargando.classList.add("hidden");
    }
}

// -------------------- MOSTRAR LOS DATOS EN EL DOM --------------------
function mostrarPrestamos() {
    const textoBusqueda = buscador.value.toLowerCase();

    contadorPrestamos.textContent = vistaCompleta ? prestamos.length : Math.min(prestamos.length, 3);
    if (estadisticaTotal) estadisticaTotal.textContent = prestamos.length;
    if (estadisticaPendiente) estadisticaPendiente.textContent = prestamos.filter((prestamo) => !prestamo.devuelto).length;
    if (estadisticaDevueltos) estadisticaDevueltos.textContent = prestamos.filter((prestamo) => prestamo.devuelto).length;
    contenedorPrestamos.innerHTML = "";

    let cantidadEncontrada = 0;

    for (let i = 0; i < prestamos.length; i++) {
        const prestamo = prestamos[i];

        const coincideTitulo = prestamo.titulo_libro.toLowerCase().includes(textoBusqueda);
        const coincideUsuario = prestamo.usuario.toLowerCase().includes(textoBusqueda);

        if (textoBusqueda === "" || coincideTitulo || coincideUsuario) {
            cantidadEncontrada++;
            if (!vistaCompleta && cantidadEncontrada > 3) continue;

            let claseEstado = "";
            let textoEstado = '<i class="fa-solid fa-clock"></i> Pendiente';

            if (prestamo.devuelto) {
                claseEstado = " returned";
                textoEstado = '<i class="fa-solid fa-circle-check"></i> Devuelto';
            }

            // Se crea una tarjeta por cada préstamo recibido de MongoDB
            const tarjeta = document.createElement("article");
            tarjeta.className = "loan-card" + claseEstado;

            tarjeta.innerHTML = `
                <div class="loan-top">
                    <h3 class="loan-title">${escapeHtml(prestamo.titulo_libro)}</h3>
                    <span class="loan-status${claseEstado}">${textoEstado}</span>
                </div>

                <div class="loan-details">
                    <span>
                        <i class="fa-solid fa-user"></i>
                        ${escapeHtml(prestamo.usuario)}
                    </span>
                    <span>
                        <i class="fa-solid fa-calendar-days"></i>
                        ${prestamo.dias_prestamo} días
                    </span>
                </div>

                <div class="loan-actions">
                    <button class="icon-btn status" type="button" title="Cambiar estado">
                        <i class="fa-solid fa-arrow-right-arrow-left"></i>
                    </button>
                    <button class="icon-btn edit" type="button" title="Editar préstamo">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn delete" type="button" title="Eliminar préstamo">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            const botonEstado = tarjeta.querySelector(".status");
            botonEstado.addEventListener("click", function () {
                cambiarEstado(prestamo);
            });

            const botonEditar = tarjeta.querySelector(".edit");
            botonEditar.addEventListener("click", function () {
                prepararEdicion(prestamo);
            });

            const botonEliminar = tarjeta.querySelector(".delete");
            botonEliminar.addEventListener("click", function () {
                const idPrestamo = prestamo.id || prestamo._id;
                eliminarPrestamo(idPrestamo);
            });

            contenedorPrestamos.appendChild(tarjeta);
        }
    }

    // Estado vacío
    if (cantidadEncontrada === 0) {
        estadoVacio.classList.remove("hidden");

        if (textoBusqueda !== "") {
            estadoVacio.querySelector("h3").textContent = "No encontramos coincidencias";
        } else {
            estadoVacio.querySelector("h3").textContent = "No hay préstamos registrados";
        }
    } else {
        estadoVacio.classList.add("hidden");
    }
}

// -------------------- CAMBIAR ESTADO (PUT) --------------------
async function cambiarEstado(prestamo) {
    const datosActualizados = {
        devuelto: !prestamo.devuelto
    };

    const idPrestamo = prestamo.id || prestamo._id;

    try {
        const respuesta = await fetch(API_URL + "/prestamos/" + idPrestamo, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosActualizados)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar el estado");
        }

        mostrarNotificacion("Estado actualizado correctamente");
        await cargarPrestamos();

    } catch (error) {
        mostrarNotificacion(error.message, true);
    }
}

// -------------------- PREPARAR EDICIÓN --------------------
function prepararEdicion(prestamo) {
    const idPrestamo = prestamo.id || prestamo._id;

    if (!formulario) {
        window.location.href = `index.html?editar=${encodeURIComponent(idPrestamo)}#nuevo-prestamo`;
        return;
    }

    loanId.value = idPrestamo;
    tituloLibro.value = prestamo.titulo_libro;
    usuario.value = prestamo.usuario;
    diasPrestamo.value = prestamo.dias_prestamo;
    devuelto.checked = prestamo.devuelto;

    if (prestamo.devuelto) {
        estadoTexto.textContent = "Devuelto";
    } else {
        estadoTexto.textContent = "Pendiente";
    }

    tituloFormulario.textContent = "Editar préstamo";
    botonGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Guardar cambios</span>';
    botonCancelar.classList.remove("hidden");

    formulario.scrollIntoView({ behavior: "smooth", block: "center" });
}

// -------------------- ELIMINAR (DELETE) --------------------
async function eliminarPrestamo(id) {
    const confirmar = confirm("¿Deseas eliminar este préstamo?");

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(API_URL + "/prestamos/" + id, {
            method: "DELETE"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo eliminar el préstamo");
        }

        mostrarNotificacion("Préstamo eliminado correctamente");
        await cargarPrestamos();

    } catch (error) {
        mostrarNotificacion(error.message, true);
    }
}

// -------------------- RESTABLECER EL FORMULARIO --------------------
botonCancelar?.addEventListener("click", limpiarFormulario);

function limpiarFormulario() {
    formulario.reset();
    loanId.value = "";
    estadoTexto.textContent = "Pendiente";
    tituloFormulario.textContent = "Nuevo préstamo";
    botonGuardar.innerHTML = '<i class="fa-solid fa-plus"></i><span>Crear préstamo</span>';
    botonCancelar.classList.add("hidden");
}

// Convierte texto en seguro para mostrarlo dentro de HTML
function escapeHtml(texto) {
    const elemento = document.createElement("span");
    elemento.textContent = texto;
    return elemento.innerHTML;
}

// Notificación visual sencilla
function mostrarNotificacion(mensaje, esError = false) {
    const notificacion = document.createElement("div");

    if (esError) {
        notificacion.className = "toast error";
    } else {
        notificacion.className = "toast";
    }

    notificacion.innerHTML = `<i class="fa-solid ${esError ? "fa-circle-exclamation" : "fa-circle-check"}"></i> ${escapeHtml(mensaje)}`;
    document.getElementById("toast-container").appendChild(notificacion);

    setTimeout(function () {
        notificacion.remove();
    }, 3000);
}

// Cuando la página termina de cargar, solicita los préstamos
cargarPrestamos();
