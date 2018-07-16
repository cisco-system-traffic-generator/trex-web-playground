const express = require('express');
const http = require('http');
const fs = require('fs');
const pty = require('node-pty');
const tmp = require('tmp');
const path = require('path');

const Docker = require('dockerode');
const docker = new Docker();

require('log-timestamp');

// Setup the express app
const app = express();
// Static file serving
app.use('/', express.static('client'));

// Creating an HTTP server
const server = http.createServer(app).listen(7171);

const io = require('socket.io')(server);

console.log('Starting HTTP server...');

// When a new socket connects
io.on('connection', function(socket) {

    socket.shortid = socket.id.substr(0, 8);

    console.log(`Got new connection from ${socket.request.connection.remoteAddress} @ ID: ${socket.shortid}\n`);

    // generate a container
    docker.createContainer({
        Image: 'trexcisco/trex-dev:2.36',
        Cmd: ['/bin/bash', '-c', '/etc/startup.sh'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: true,
        Tty: true,
        Volumes: {'/shared':{}},
        Binds: [`${path.resolve('shared')}:/shared`],
        //VolumeDriver : 'shared:/shared',
        CapAdd: ['ALL'],
    }, function (err, container) {

        if (err) {
            console.log(err);
            process.exit('assert');
        }

        socket.container = container;

        console.log(`[${socket.shortid}] created container with ID: ${container.id}`);

        socket.container.start(function(err, container) {

            // Create terminal for console
            socket.term = pty.spawn('docker', ['exec', '-it', socket.container.id, '/etc/startup.sh'], {
                name: 'xterm-color',
                cols: 120,
                rows: 40,
                cwd: process.env.HOME,
                env: process.env,
            });

            // Create terminal for code
            // socket.code = pty.spawn('docker', ['exec', '-it', socket.container.id, 'bash', '-c', 'stty -echo;/etc/stl.sh'], {
            socket.code = pty.spawn('docker', ['exec', '-it', socket.container.id, '/etc/scripts/code.sh'], {
                name: 'xterm-color',
                cols: 120,
                rows: 40,
            });

            socket.tcpdump = pty.spawn('docker', ['exec', '-it', socket.container.id, 'bash', '-c', '/etc/tcpdump -i veth0'], {
                name: 'xterm-color',
                cols: 120,
                rows: 40,
            });

            let tcp_dump_buffer = Buffer.from('');

            // Listen on the terminal for output and send it to the client
            socket.tcpdump.on('data', function(data) {
                if (tcp_dump_buffer.length < 1024) {
                    tcp_dump_buffer += data;
                }
            });

            function publishTCPDump() {
                if (tcp_dump_buffer.length > 0) {
                    socket.emit('tcpdump-output', tcp_dump_buffer);
                    tcp_dump_buffer = Buffer.from('');
                }
                setTimeout(publishTCPDump, 500);
            }

            setTimeout(publishTCPDump, 500);

            // Listen on the terminal for output and send it to the client
            socket.term.on('data', function(data) {
                //console.log('got output: ' + data);
                socket.emit('console-output', data);
            });

            socket.on('console-input', function(data) {
                //console.log('got input: ' + data);
                socket.term.write(data);
            });

            // Listen on the terminal for output and send it to the client
            socket.code.on('data', function(data) {
                //console.log('got output: ' + data);
                socket.emit('code-run-output', data);
            });

            socket.on('code-run-input', function(code) {
                if (code == 'ESC') {
                    socket.code.write(String.fromCharCode(3));
                    return;
                }

                // generate a temporary file
                const tmpobj = tmp.fileSync({ mode: 0644, postfix: '.py', dir: 'shared' });
                fs.writeFileSync(tmpobj.name, code);
                socket.code.write(`python /${tmpobj.name}\n`);
                return;
            });
            // When socket disconnects, destroy the terminal
            socket.on('disconnect', function() {

                console.log(`[${socket.shortid}] disconnecting...`);

                if (socket.container) {
                    console.log(`[${socket.shortid}] removing container: ${socket.container.id}`);
                    socket.container.remove({ force: true });
                    socket.container = null;
                }

                if (socket.trem) {
                    socket.term.destroy();
                    socket.term = null;
                }

                if (socket.code) {
                    socket.code.destroy();
                    socket.code = null;
                }
            });

        });

    });
});


process.on('SIGINT', function () {

    console.log('\n*** shutting down IO...\n');
    server.close();
    io.close();

    process.exit();
});

