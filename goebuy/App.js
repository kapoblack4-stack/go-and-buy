import React, { useState, useEffect, useRef } from "react";
import { EventProvider } from "react-native-outside-press";
import { View, Text, ActivityIndicator } from "react-native";
import Navigation from "./src/navigation/Navigation";
import * as SplashScreen from 'expo-splash-screen';
import PushNotificationService from './src/services/PushNotificationService';
import { NavigationContainer } from '@react-navigation/native';
import { initializeStatusBar } from './src/utils/statusBar';
import {
  useFonts,
  Poppins_100Thin,
  Poppins_100Thin_Italic,
  Poppins_200ExtraLight,
  Poppins_200ExtraLight_Italic,
  Poppins_300Light,
  Poppins_300Light_Italic,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
  Poppins_600SemiBold,
  Poppins_600SemiBold_Italic,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
  Poppins_800ExtraBold,
  Poppins_800ExtraBold_Italic,
  Poppins_900Black,
  Poppins_900Black_Italic,
} from '@expo-google-fonts/poppins';

SplashScreen.preventAutoHideAsync(); // Prevent the splash screen from hiding too early


export default function App() {
  const navigationRef = useRef();

  console.log('[APP] App component renderizing...');

  let [fontsLoaded] = useFonts({
    Poppins_100Thin,
    Poppins_100Thin_Italic,
    Poppins_200ExtraLight,
    Poppins_200ExtraLight_Italic,
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
    Poppins_600SemiBold,
    Poppins_600SemiBold_Italic,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
    Poppins_800ExtraBold,
    Poppins_800ExtraBold_Italic,
    Poppins_900Black,
    Poppins_900Black_Italic,
  });

  console.log('[APP] Fonts loaded:', fontsLoaded);

  useEffect(() => {
    console.log('[APP] Inicializando aplicação...');
    
    // CORRIGIDO: Inicializar StatusBar globalmente para evitar conflitos de header no Android
    initializeStatusBar();
    console.log('[APP] StatusBar inicializado globalmente');
    
    // Inicializar sistema de push notifications (versão básica)
    const initializePushNotifications = async () => {
      try {
        await PushNotificationService.initialize();
        
        // Configurar callback de navegação
        PushNotificationService.setNavigationCallback((data) => {
          console.log('[APP] Navegação por push notification:', data);
          
          if (navigationRef.current && data.screen) {
            navigationRef.current.navigate(data.screen, data.params || {});
          }
        });
        
        console.log('[APP] Push notifications inicializados');
      } catch (error) {
        console.log('[APP] Erro ao inicializar push notifications:', error);
      }
    };

    // Ocultar splash screen quando as fontes carregarem
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      console.log('[APP] SplashScreen ocultado');
    }

    initializePushNotifications();

    // Cleanup quando app for fechado
    return () => {
      try {
        PushNotificationService.cleanup();
        console.log('[APP] Cleanup realizado');
      } catch (error) {
        console.log('[APP] Erro no cleanup:', error);
      }
    };
  }, [fontsLoaded]); // Adicionar fontsLoaded como dependência

  if (!fontsLoaded) {
    console.log('[APP] Carregando fontes...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#704F38" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#704F38' }}>Carregando GoandBuy...</Text>
      </View>
    );
  } else {
    console.log('[APP] Fontes carregadas, renderizando app...');
    try {
      return (
        <EventProvider>
          <Navigation ref={navigationRef} />
        </EventProvider>
      );
    } catch (error) {
      console.log('[APP] Erro ao renderizar com EventProvider:', error);
      // Fallback sem EventProvider
      return <Navigation ref={navigationRef} />;
    }
  }
}
