import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';

function App() {
  const terminalRef = useRef(null);

  useEffect(() => {
    const socket =  io("http://192.168.1.104:3000");


    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0c0c0c',
        foreground: '#00ff00',
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    socket.on('connect', () => {
      term.write('\r\n\x1b[32m[SISTEM] Sunucuya baglanildi! Kali Linux baslatiliyor...\x1b[0m\r\n');
      socket.emit('start-terminal');
    });

    socket.on('terminal-output', (data) => {
      term.write(data);
    });

    term.onData((data) => {
      socket.emit('terminal-input', data);
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      socket.disconnect();
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden'
      }}
    />
  );
}

export default App;