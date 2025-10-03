const moment = require("moment");
const express = require("express");
const app = express();
const port = 4000;

const http = require('http').Server(app);
const cors = require('cors');


const socket_all_clients = require('socket.io')(http, {
  cors: {
    // origin: "http://localhost:3000"
    origin: ["https://pulsar-consultorios.netlify.app", "https://pulsarpep.com"]
  }
});

app.use(cors());

let arrayusers = [];
socket_all_clients.on('connection', (socket) => {

  let codigo = null;
  // indicando a conexão do participante ao server.
  console.log(`⚡: ${socket.id} CONECTADO`);

  /*
  recebendo dados do peer-medico e eliminando eventuais usuários conectados com o código de atendimento
  não eliminados da array (pool de usuários) anteriormente (isso pode acontecer quando o socket é desconectado ao fechar
  a guia da aplicação).
  */
  socket.on('upload dados peer-medico', (result) => {
    console.log('DADOS DO PEER-MÉDICO RECEBIDO');
    codigo = result.codigo;
    let newarrayusers = []
    arrayusers.filter(users => users.codigo != result.codigo).map(item => newarrayusers.push(item));
    arrayusers = newarrayusers;
    arrayusers.push(result);
    console.log(codigo);
  });

  // recebendo dados do peer-paciente.
  socket.on('upload dados peer-paciente', (result) => {
    console.log('DADOS DO PEER-PACIENTE RECEBIDO');
    arrayusers.push(result);
    console.log('DISPAROU ETAPA 02: download dados peer-paciente');
    arrayusers.filter(user => user.codigo == result.codigo && user.tipo == 'paciente').map(item => {
      socket_all_clients.emit('dados peer-paciente', item.data);
    })
  });

  /*
    devolvendo dados do peer-médico para os usuários conectados ao server.
    necessário filtrar a array de usuários para o código certo (chave do par médico x paciente conectado).
  */
  socket.on('download dados peer-medico', (codigo) => {
    console.log('DISPAROU ETAPA 01: download dados peer-medico');
    arrayusers.filter(user => user.codigo == codigo && user.tipo == 'medico').slice(0, 1).map(item => {
      socket_all_clients.emit('dados peer-medico', item.data);
    })
  });

  socket.on('download dados peer-paciente', (codigo) => {
    console.log('DISPAROU ETAPA 02: download dados peer-paciente');
    arrayusers.filter(user => user.codigo == codigo && user.tipo == 'paciente').map(item => {
      socket_all_clients.emit('dados peer-paciente', { data: item.data, mensagem: 'signal do peer-paciente devolvido ao peer-médico.' });
    })
  })

  // escutando a desconexão do usuário.
  socket.on('disconnect', () => {
    console.log(socket.id + '🔥: DESCONECTADO');
  });

  // desconectando e eliminando o usuário da array de conexões.
  socket.on('desconectar', (codigo) => {
    console.log('SOLICITADA A DESCONEXÃO');
    console.log('CODIGO A DESCONECTAR: ' + codigo);
    console.log('SOCKET ID A DESCONECTAR: ' + socket.id);
    console.log('USUÁRIO A DESCONECTAR: ' + arrayusers.filter(user => user.id == socket.id).map(user => user.tipo));
    let newarrayusers = []
    arrayusers.filter(user => user.id != socket.id).map(item => newarrayusers.push(item));
    arrayusers = newarrayusers;
    console.log('USUÁRIOS CONECTADOS: ' + arrayusers.length);
  });

});

app.get("/", (request, response) => {
  response.json({
    message: 'SOCKET SERVER INICIALIZADO.'
  });
});

http.listen(port, () => {
  console.log("SERVER SOCKET RODANDO NA PORTA " + port);
});