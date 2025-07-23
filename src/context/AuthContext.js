// import React, { createContext, useState } from 'react';

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [isAuth, setIsAuth] = useState(false);

//   const toggleAuth = () => {
//     setIsAuth(prevState => !prevState);
//   };

//   return (
//     <AuthContext.Provider value={{ isAuth, toggleAuth }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

import React, {createContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [isAuth, setIsAuth] = useState(false);

  console.log('isAuth : ', isAuth);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuth(!!token);
      console.log('token', token);
    };

    checkAuth();
  }, []);

  const login = async token => {
    await AsyncStorage.setItem('auth_token', token);
    setIsAuth(true);
  };

  const logout2 = async () => {
    await AsyncStorage.removeItem('auth_token');
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{isAuth, login, logout2}}>
      {children}
    </AuthContext.Provider>
  );
};
