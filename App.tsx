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
import { navigationRef } from './src/navigation/navigationRef';
import { AppErrorBoundary } from './src/components/common/AppErrorBoundary';

function AppContent() {
  const { isDark } = React.useContext(ThemeContext);

  return (
    <AppErrorBoundary>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AppErrorBoundary>
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
