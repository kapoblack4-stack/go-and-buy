import React, { forwardRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import Home from '../screens/Home';
import Home1 from '../screens/Vendedor/Home';
import DetailsCarrinhoScreen from '../screens/DetailsCarrinho';
import OrderScreen from '../screens/OrderScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CarrinhosScreen from '../screens/CarrinhosScreen';
import DetailsCarrinhoScreen1 from '../screens/DetailsCarrinhos1';
import Carrinhos from '../screens/Vendedor/Carrinhos';
import ChatsScreen from '../screens/Vendedor/ChatsScreen'; // Lista de conversas
import ChatScreen from '../screens/ChatScreen'; // Chat individual
import CreateCartScreen from '../screens/Vendedor/CreateCartScreen';
import OrderScreen1 from '../screens/Vendedor/OrdersScreen';
import MyCartsScreen from '../screens/Vendedor/MyCartsScreen';
import MyOrder from '../screens/MyOrder';
import UploadComprovativoScreen from '../screens/UploadComprovativoScreen';
import DetailOrder from '../screens/Vendedor/DetailOrder';
import PdfViewer from '../screens/PdfViewer';
import AtualizarPedidoScreen from '../screens/Vendedor/AtualizarPedidoScreen';
import FeedbackScreen from '../screens/FeedBackScreen'
import FeedbackScreen1 from '../screens/Vendedor/FeedBackScreen';
import VendedorChatScreen from '../screens/VendedorChatScreen';
import CompradorChatScreen from '../screens/CompradorChatScreen';
import CompradorChatsScreen from '../screens/Comprador/ChatsScreen';
import CompradorHome from '../screens/CompradorHome';
import VendedorCartsScreen from '../screens/Vendedor/VendedorCartsScreen';
import MyCartDetailScreen from '../screens/Vendedor/MyCartDetailScreen';
import UserDetailsScreen from '../screens/UserDetailsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CompradorNotificationsScreen from '../screens/CompradorNotificationsScreen';
import EditOrderScreen from '../screens/EditOrderScreen';
import CartDetailsScreen from '../screens/CartDetailsScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
const Stack = createStackNavigator();

const Navigation = forwardRef((props, ref) => {
  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        initialRouteName="LoginScreen"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="MyCartDetailScreen" component={MyCartDetailScreen} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="DetailsCarrinhoScreen" component={DetailsCarrinhoScreen} />
          <Stack.Screen name="CompradorNotificationsScreen" component={CompradorNotificationsScreen} />
        <Stack.Screen name="OrderScreen" component={OrderScreen} />
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="CarrinhosScreen" component={CarrinhosScreen} />
        <Stack.Screen name="Carrinhos" component={Carrinhos} />
        <Stack.Screen name="DetailsCarrinhos1" component={DetailsCarrinhoScreen1} />
        <Stack.Screen name="Home1" component={Home1} />
        <Stack.Screen name="ChatsScreen" component={ChatsScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="MycartsScreen" component={MyCartsScreen} />
        <Stack.Screen name="CreateCartScreen" component={CreateCartScreen} />
        <Stack.Screen name="OrderScreen1" component={OrderScreen1} />
        <Stack.Screen name="UploadComprovativoScreen" component={UploadComprovativoScreen} />
        <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
        <Stack.Screen name="MyOrder" component={MyOrder} />
        <Stack.Screen name="PdfViewer" component={PdfViewer} />
        <Stack.Screen name="DetailOrder" component={DetailOrder} />
        <Stack.Screen name="AtualizarPedidoScreen" component={AtualizarPedidoScreen} />
        <Stack.Screen name="FeedBackScreen" component={FeedbackScreen} />
        <Stack.Screen name="FeedBackScreen1" component={FeedbackScreen1} />
        <Stack.Screen name="VendedorChatScreen" component={VendedorChatScreen} />
        <Stack.Screen name="CompradorChatScreen" component={CompradorChatScreen} />
        <Stack.Screen name="CompradorChatsScreen" component={CompradorChatsScreen} />
        <Stack.Screen name="CompradorHome" component={CompradorHome} />
        <Stack.Screen name="UserDetailsScreen" component={UserDetailsScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="VendedorCartsScreen" component={VendedorCartsScreen} />
        <Stack.Screen name="EditOrderScreen" component={EditOrderScreen} />
        <Stack.Screen name="CartDetailsScreen" component={CartDetailsScreen} />
        <Stack.Screen name="EmailVerificationScreen" component={EmailVerificationScreen} />
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default Navigation;