import { useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

const SOCKET_SERVER_URL = 'https://unison-backend-lxmu.onrender.com';

export default function useNotificationSocket() {
  const [newNotification, setNewNotification] = useState(null);
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    let socket;

    const connectSocket = async () => {
      // If token is missing in context, check AsyncStorage just in case
      let token = userToken;
      if (!token) {
          token = await AsyncStorage.getItem('userToken');
      }

      if (!token) return;

      socket = io(SOCKET_SERVER_URL, {
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      socket.on('connect', () => {
        console.log('Notification socket connected');
      });

      socket.on('notification', (data) => {
        setNewNotification(data);
      });

      socket.on('disconnect', () => {
        console.log('Notification socket disconnected');
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userToken]);

  return { newNotification };
}
