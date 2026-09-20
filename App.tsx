import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { AddressProvider } from './src/context/AddressContext';
import { StoreProvider } from './src/context/StoreContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { CartProvider } from './src/context/CartContext';
import { OrderProvider } from './src/context/OrderContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AddressProvider>
            <StoreProvider>
              <NotificationProvider>
                <WishlistProvider>
                  <CartProvider>
                    <OrderProvider>
                      <AppContent />
                    </OrderProvider>
                  </CartProvider>
                </WishlistProvider>
              </NotificationProvider>
            </StoreProvider>
          </AddressProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
