// App.js

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3000');

const App = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const endOfMessagesRef = useRef(null);

    useEffect(() => {
        socket.on('message', (data) => {
            setMessages([...messages, data]);
            scrollToBottom();
        });

        return () => {
            socket.off('message');
        };
    }, [messages]);

    const login = async () => {
        try {
            const response = await axios.post('/api/login', { username, password });
            localStorage.setItem('token', response.data.token);
            setLoggedIn(true);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await axios.get('/api/messages');
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const sendMessage = async () => {
        try {
            socket.emit('message', { user: 'user', message });

            setMessages([...messages, { user: 'user', message }]);
            setMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const scrollToBottom = () => {
        endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="container">
            {loggedIn ? (
                <div>
                    <header>
                        <h1>Professional Chatbot</h1>
                    </header>
                    <div className="conversation">
                        {messages.map((item, index) => (
                            <div key={index} className={`message ${item.user}`}>
                                <strong>{item.user === 'user' ? 'You' : 'Bot'}:</strong> {item.message}
                            </div>
                        ))}
                        <div ref={endOfMessagesRef}></div>
                    </div>
                    <div className="input-area">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here..."
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            ) : (
                <div className="login-form">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                    />
                    <button onClick={login}>Login</button>
                </div>
            )}
        </div>
    );
};

export default App;
