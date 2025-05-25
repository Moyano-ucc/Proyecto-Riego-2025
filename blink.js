// Requerimos las librerías necesarias
var five = require("johnny-five");
var http = require("http");
var fs = require("fs");

// Variable global para almacenar el último valor de humedad
var ultimaHumedad = 0;

// Creamos el servidor HTTP
var server = http.createServer(function(req, res) {
  // Cuando accedemos a la ruta principal, enviamos el archivo HTML
  if (req.url === '/') {
    fs.readFile(__dirname + '/inde.html', function(err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error al cargar index.html');
      }
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
  } 
  // Ruta para obtener el valor de humedad actual mediante AJAX
  else if (req.url === '/humedad') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ valor: ultimaHumedad }));
  }
  // Ruta para recibir los datos de la planta
  else if (req.url === '/datos-planta' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      const datosPlanta = JSON.parse(body);  // Almacenar los datos de la planta
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(datosPlanta));  // Devolver los datos recibidos
    });
  }
});

// Iniciamos el servidor en el puerto 4000
server.listen(4000, function() {
  console.log('Servidor escuchando en http://localhost:4000');
});

// Inicializamos la placa Arduino
var circuito = new five.Board();
var bombillo, ledRojo, ledVerde, bomba, celda;

circuito.on("ready", prender);

function prender() {
    var configuracion = {pin: "A0", freq: 50};  // Configuración para el sensor de humedad
    celda = new five.Sensor(configuracion);
    
    // Inicializando los LEDs y la bomba
    bombillo = new five.Led(13);       // LED rojo en pin 13
    ledRojo = new five.Led(13);        // LED rojo en pin 13
    ledVerde = new five.Led(6);        // LED verde en pin 6
    bomba = new five.Led(9);           // Bomba en pin 9 (PWM)
    
    // Configuramos el LCD (usando I2C)
    var lcd = new five.LCD({
        controller: "PCF8574T"  // Pantalla I2C
    });
    lcd.useChar('check');
    
    ondear(lcd);  // Llamamos a la función para iniciar el monitoreo
}

function ondear(lcd) {
    // Leemos el valor del sensor y calculamos la humedad en porcentaje (0-100)
    var luz = celda.value;
    var humedad = map(luz, 1023, 0, 0, 100); // Convertimos el valor del sensor a un rango de 0-100
    
    // Almacenamos el valor en la variable global para que esté disponible para las solicitudes HTTP
    ultimaHumedad = humedad;
    
    console.log("Humedad: " + humedad + "%");
    
    // Mostramos la humedad en el LCD
  

        // ...existing code...
        lcd.clear();
      // Limpiar pantalla antes de mostrar nuevo valor
    lcd.cursor(0, 0).print("HUMEDAD: :check:");
    
    // Mostrar porcentaje y alerta si es necesario
   
        lcd.cursor(1, 0).print(Math.round(humedad) + "%");
    
    // ...existing code...
    // Lógica de control de dispositivos
    if (humedad > 30) {
        ledVerde.on();         // Enciende el LED verde
        ledRojo.off();         // Apaga el LED rojo
        bomba.off();           // Apaga la bomba
    } else {
        ledVerde.off();        // Apaga el LED verde
        ledRojo.on();          // Enciende el LED rojo
        bomba.on();            // Enciende la bomba
    }

    // Llamamos nuevamente a ondear después de 1 segundo
    setTimeout(function() {
        ondear(lcd);
    }, 3000);
}

// Función de mapeo para convertir el valor del sensor en porcentaje
function map(value, in_min, in_max, out_min, out_max) {
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
