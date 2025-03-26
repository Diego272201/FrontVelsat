import * as signalR from "@microsoft/signalr";

const username = "movilbus"; // Cambia esto por el usuario real

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7223/serviciosHub", { 
        accessTokenFactory: () => "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiJtb3ZpbGJ1cyIsIm5iZiI6MTc0MjU3NTA0NCwiZXhwIjoxNzQyNTg5NDQ0LCJpYXQiOjE3NDI1NzUwNDR9.atqsbe3KWBpbG8Ka8VMg9i9zYN84xX37b5pdt1L01_o" // Solo si usas JWT
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect()
    .build();

// Escuchar la actualización de servicios en tiempo real
connection.on("ActualizarServicios", (servicios) => {
    console.log("Servicios actualizados:", servicios);
});

// Escuchar datos en tiempo real
connection.on("ActualizarDatos", (datos) => {
    console.log("Datos en tiempo real:", datos);
});

// Conectar al servidor
async function startConnection() {
    try {
        await connection.start();
        console.log("Conectado a SignalR");

        // Unirse al grupo del usuario
        await connection.invoke("UnirGrupo", username);
        console.log(`Usuario ${username} unido al grupo`);
    } catch (err) {
        console.error("Error en la conexión:", err);
        setTimeout(startConnection, 5000); // Reintento en 5 segundos
    }
}

// Iniciar la conexión
startConnection();
