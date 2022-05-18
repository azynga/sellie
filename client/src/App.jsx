import { useState, useEffect, createContext } from 'react';
import { Routes, Route, useSearchParams, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import './App.scss';
import { getItems } from './services/item-service';
import { loggedin } from './services/auth-service';
import { saveNotification } from './services/user-service';
import Header from './components/Header';
import Browse from './components/Browse';
import SearchSettings from './components/SearchSettings';
import ItemDetails from './components/ItemDetails';
import Create from './components/Create';
import NoMatch from './components/NoMatch';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import ChatList from './components/ChatList';
import Chat from './components/Chat';
import NavigateToSelectedChat from './components/NavigateToSelectedChat';
import Profile from './components/Profile';
import ProfileNav from './components/ProfileNav';
import AccountSettings from './components/AccountSettings';

export const SearchContext = createContext();
export const UserContext = createContext();

const App = () => {
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [notification, setNotification] = useState(false);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentSocket, setCurrentSocket] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams({
        sort: 'date_desc',
        limit: 10,
        distance: 15,
        long: 13.3888599,
        lat: 52.5170365,
    });

    // useEffect(() => {
    //     console.log(currentSocket);
    // });

    useEffect(() => {
        console.log(loggedInUser);
        if (loggedInUser) {
            saveNotification(loggedInUser._id, notification).then(
                (response) => {
                    console.log('saved? ', response);
                }
            );
        }
    }, [notification]);

    useEffect(() => {
        const socket = io('http://localhost:5005', {
            withCredentials: true,
        });

        socket.on('connect', () => {
            setCurrentSocket(socket);
        });

        socket.on('notify', () => {
            console.log('notification');
            setNotification(true);
        });

        loggedin()
            .then((response) => {
                if (response.data._id) {
                    const user = response.data;
                    setLoggedInUser(user);
                    const { coordinates } = user.location.geometry;
                    setSearchParams({
                        ...Object.fromEntries(searchParams),
                        long: coordinates[0],
                        lat: coordinates[1],
                    });
                    setNotification(user.unreadMessages);
                    socket.emit('join', user._id);
                }
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                setLoadingUser(false);
            });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        setIsLoading(true);
        getItems(searchParams.toString())
            .then((response) => {
                if (response.data.constructor !== Array) {
                    console.error(response);
                    throw new Error(
                        'Received wrong data type from the server. Expected Array, but got ' +
                            response.data.constructor.name
                    );
                }
                setItems(response.data);
            })
            .catch((error) => {
                setItems([]);
                console.error(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [searchParams]);

    return (
        <div className='container'>
            <UserContext.Provider
                value={{
                    loadingUser,
                    loggedInUser,
                    setLoggedInUser,
                    currentSocket,
                    notification,
                    setNotification,
                }}
            >
                <SearchContext.Provider
                    value={{
                        isLoading,
                        setIsLoading,
                        searchParams,
                        setSearchParams,
                    }}
                >
                    <Header />

                    {/* <SideBar /> */}
                    <aside className='sidebar col'>
                        <Routes>
                            <Route
                                path='/browse'
                                element={<SearchSettings />}
                            />
                            <Route path='/items/:itemId' element={<></>} />
                            <Route path='/login' element={<></>} />

                            <Route element={<ProtectedRoute />}>
                                <Route path='/create' element={<></>} />
                                <Route
                                    path='/profile/*'
                                    element={<ProfileNav />}
                                />
                                <Route
                                    path='/messages'
                                    element={<ChatList />}
                                />
                                <Route
                                    path='/messages/:chatId'
                                    element={<ChatList />}
                                />
                            </Route>
                            <Route path='*' element={<></>} />
                        </Routes>
                    </aside>
                    <main className='main-content'>
                        <Routes>
                            <Route
                                path='/'
                                element={
                                    <Navigate to='/browse' replace={true} />
                                }
                            />
                            <Route
                                path='/browse'
                                element={<Browse items={items} />}
                            />
                            <Route
                                path='/items/:itemId'
                                element={<ItemDetails items={items} />}
                            />
                            <Route
                                path='/login'
                                element={
                                    loggedInUser ? (
                                        <Navigate to='/browse' />
                                    ) : (
                                        <LoginPage />
                                    )
                                }
                            />

                            <Route element={<ProtectedRoute />}>
                                <Route path='/create' element={<Create />} />
                                <Route
                                    path='/profile'
                                    element={<Profile user={loggedInUser} />}
                                />
                                <Route
                                    path='/profile/settings'
                                    element={<AccountSettings />}
                                />
                                <Route
                                    path='/messages'
                                    element={<NavigateToSelectedChat />}
                                />
                                <Route
                                    path='/messages/:chatId'
                                    element={<Chat />}
                                />
                            </Route>
                            <Route path='*' element={<NoMatch />} />
                        </Routes>
                    </main>
                </SearchContext.Provider>
            </UserContext.Provider>
        </div>
    );
};

export default App;
