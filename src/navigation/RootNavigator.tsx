import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { SplashScreen } from '../screens/splash/SplashScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { NameUpdateScreen } from '../screens/onboarding/NameUpdateScreen';
import { PrimaryAddressScreen } from '../screens/onboarding/PrimaryAddressScreen';
import { StoreSelectionScreen } from '../screens/onboarding/StoreSelectionScreen';
import { AuthNavigator } from './AuthNavigator';
import { BottomTabNavigator } from './BottomTabNavigator';
import { ProductListingScreen } from '../screens/product/ProductListingScreen';
import { ProductDetailsScreen } from '../screens/product/ProductDetailsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { WishlistScreen } from '../screens/wishlist/WishlistScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/checkout/OrderSuccessScreen';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { AddressesScreen } from '../screens/profile/AddressesScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { OffersScreen } from '../screens/offers/OffersScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="NameUpdate" component={NameUpdateScreen} />
      <Stack.Screen name="PrimaryAddress" component={PrimaryAddressScreen} />
      <Stack.Screen name="StoreSelection" component={StoreSelectionScreen} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="ProductListing" component={ProductListingScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};
