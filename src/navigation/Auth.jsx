import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  Login,
  LoginOrSignup,
  Signup,
  OTP,
} from '../Screens/Auth';

const Stack = createStackNavigator();

const Auth = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="LoginOrSignup">
      <Stack.Screen name="LoginOrSignup" component={LoginOrSignup} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="OTP" component={OTP} />
    </Stack.Navigator>
  );
};
export default Auth;
