import React, { useEffect, useContext, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { UserContext } from '../App';
import { addMessage, getChat } from '../services/chat-service';

import Message from './Message';

const Chat = () => {
    const navigate = useNavigate();
    const {
        currentSocket: socket,
        loggedInUser,
        setNotification,
    } = useContext(UserContext);
    const { chatId } = useParams();
    const thisUserId = loggedInUser._id;
    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [receivedMessage, setReceivedMessage] = useState(null);
    const endOfFeed = useRef();

    const scrollToBottom = () => {
        endOfFeed.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setNotification(false);
    });

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (receivedMessage) {
            setMessages([...messages, receivedMessage]);
        }
    }, [receivedMessage]);

    useEffect(() => {
        getChat(chatId)
            .then((response) => {
                const chat = response.data;

                if (!chat._id) {
                    throw new Error('Chat was not found');
                }

                if (
                    !chat.participants.some((user) => user._id === thisUserId)
                ) {
                    throw new Error('User is not allowed in this chat');
                }

                const otherParticipant = chat.participants.find(
                    (user) => user._id !== thisUserId
                );

                setOtherUser(otherParticipant);
                setMessages(chat.messages.reverse());
            })
            .catch((error) => {
                console.error(error);
                navigate('/messages');
            });
    }, []);

    useEffect(() => {
        if (!socket) {
            return;
        }

        socket.on('message', (message) => {
            setReceivedMessage(message);
        });

        return () => socket.off('message');
    }, [socket]);

    const handleSendMessage = (event) => {
        event?.preventDefault();

        if (!messageText) {
            return;
        }

        const message = {
            chatId,
            recipientName: otherUser.username,
            recipientId: otherUser._id,
            senderName: loggedInUser.username,
            senderId: thisUserId,
            text: messageText,
            timestamp: Date.now(),
        };

        addMessage(chatId, message)
            .then((response) => {
                const message = response.data;
                socket.emit('message', message);
                setMessages([...messages, message]);
                setMessageText('');
            })
            .catch((error) => console.error(error));
    };

    const feed = messages?.map((message) => {
        return (
            <Message
                key={Math.random().toString(36)}
                message={message}
                own={message?.senderId === thisUserId}
            />
        );
    });

    return (
        <div className='chat col'>
            <div
                className='feed col'
                // style={{ width: 600, height: 600, overflow: 'scroll' }}
            >
                {feed}
                <div ref={endOfFeed}></div>
            </div>
            <form onSubmit={handleSendMessage}>
                <textarea
                    type='text'
                    onChange={(event) => setMessageText(event.target.value)}
                    value={messageText}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            handleSendMessage();
                        }
                    }}
                />
                <button>
                    <i
                        title='Send'
                        className='bi bi-send'
                        role='img'
                        aria-label='Send'
                    ></i>
                </button>
            </form>
        </div>
    );
};

export default Chat;
