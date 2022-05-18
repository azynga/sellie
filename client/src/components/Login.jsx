import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/auth-service';
import { UserContext } from '../App';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const { setLoggedInUser, setNotification } = useContext(UserContext);
    const navigate = useNavigate();

    const handleLogin = (event) => {
        event.preventDefault();
        login(username, password)
            .then((response) => {
                const user = response.data;
                const createFormData = user.storageData?.createFormData;
                const selectedChat = user.storageData?.selectedChat;

                setLoggedInUser(user);
                setNotification(user.unreadMessages);
                localStorage.setItem(
                    'createFormData',
                    JSON.stringify(createFormData)
                );
                selectedChat &&
                    localStorage.setItem(
                        'selectedChat',
                        JSON.stringify(selectedChat)
                    );
                navigate('/');
            })
            .catch((error) => {
                console.log(error);
                setErrorMessage(error.response.data.errorMessage);
            });
    };

    return (
        <div className='auth-form col'>
            <h2>Login</h2>
            <form className='col' onSubmit={handleLogin}>
                <label htmlFor='login-username' className='visually-hidden'>
                    Username
                </label>
                <input
                    type='text'
                    name='username'
                    id='login-username'
                    placeholder='Username'
                    autoComplete='off'
                    autoFocus
                    onChange={(event) => setUsername(event.target.value)}
                />

                <label htmlFor='login-password' className='visually-hidden'>
                    Password
                </label>
                <input
                    type='password'
                    name='password'
                    id='login-password'
                    placeholder='Password'
                    onChange={(event) => setPassword(event.target.value)}
                />
                <button>Log in</button>
            </form>
            {errorMessage ? (
                <div className='error white'>{errorMessage}</div>
            ) : (
                ''
            )}
        </div>
    );
};

export default Login;
