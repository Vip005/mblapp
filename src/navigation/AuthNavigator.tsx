import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { NameUpdateScreen } from '../screens/onboarding/NameUpdateScreen';
import { PrimaryAddressScreen } from '../screens/onboarding/PrimaryAddressScreen';
import { StoreSelectionScreen } from '../screens/onboarding/StoreSelectionScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="NameUpdate" component={NameUpdateScreen} />
      <Stack.Screen name="PrimaryAddress" component={PrimaryAddressScreen} />
      <Stack.Screen name="StoreSelection" component={StoreSelectionScreen} />
    </Stack.Navigator>
  );
};
