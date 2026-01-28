const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');

const app = express();
const server = http.createServer(app);

// CORS Ayarı: Windows bilgisayarının bağlanmasına izin veriyoruz
const io = new Server(server, {
    cors: {
        origin: "*", // Geliştirme aşamasında herkese izin ver
        methods: ["GET", "POST"]
    }
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

io.on('connection', (socket) => {
    console.log('Windows bilgisayarı bağlandı! Socket ID:', socket.id);
    let container = null;

    socket.on('start-terminal', async () => {
        try {
            console.log("Container oluşturuluyor...");
            // Burada daha önce build ettiğin imaj adını kullanacağız
            container = await docker.createContainer({
                Image: 'kali-linux', 
                Cmd: ['/bin/bash'],
                Tty: true,
                OpenStdin: true,

                NetworkDisabled: true, //interneti kapatık

                HostConfig: {
                    AutoRemove: true // Kapanınca silinsin
                }
            });

            

            const stream = await container.attach({
                stream: true, stdin: true, stdout: true, stderr: true
            });

            await container.start();
            console.log("Container çalıştı!");

            

            // Docker -> React (Çıktı Yolla)
            stream.on('data', (chunk) => {
                socket.emit('terminal-output', chunk.toString('utf8'));
            });

            // React -> Docker (Girdi Al)
            socket.on('terminal-input', (data) => {
                stream.write(data);
            });
            
            // Boyut ayarı (Opsiyonel ama iyi olur)
            socket.on('resize', (size) => {
                container.resize({ h: size.rows, w: size.cols });
            });

        } catch (error) {
            console.error('HATA:', error);
            socket.emit('terminal-output', '\r\n--- HATA: Docker başlatılamadı ---\r\n' + error.message);
        }
    });

    socket.on('disconnect', () => {
        if (container) container.stop().catch(() => {});
        console.log('Bağlantı koptu.');
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Backend Sunucusu çalışıyor!');
});
