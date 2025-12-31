import { Platform, StatusBar } from 'react-native';

/**
 * Utilitários para SafeAreaView e StatusBar
 * Corrige o problema do header que sobe no Android durante navegação
 */

// Configuração segura do StatusBar para Android
export const configureStatusBar = (backgroundColor = '#F8F9FA', barStyle = 'dark-content') => {
  if (Platform.OS === 'android') {
    StatusBar.setBarStyle(barStyle, true);
    StatusBar.setBackgroundColor(backgroundColor, true);
    // CORRIGIDO: Manter translucent como false para evitar conflitos com headers
    StatusBar.setTranslucent(false);
    StatusBar.setHidden(false);
  }
};

// Configuração de SafeAreaView consistente
export const getSafeAreaStyle = (backgroundColor = '#F8F9FA') => ({
  flex: 1,
  backgroundColor,
  // Não usar padding manual - deixar SafeAreaView handle isso
  // CORRIGIDO: Garantir que não há conflitos de posicionamento
  paddingTop: 0,
});

// Configuração de header consistente para evitar problemas de posicionamento
export const getHeaderContainerStyle = (backgroundColor = '#FFFFFF') => ({
  backgroundColor,
  // CORRIGIDO: Evitar padding dinâmico que pode causar problemas no Android
  paddingTop: 0,
  paddingBottom: 0,
});

// Hook personalizado para configurar StatusBar ao entrar na tela
export const useStatusBarConfig = (backgroundColor = '#F8F9FA', barStyle = 'dark-content') => {
  return () => {
    configureStatusBar(backgroundColor, barStyle);
  };
};

// Configuração global inicial do StatusBar para o app
export const initializeStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setBackgroundColor('#F8F9FA', true);
    StatusBar.setTranslucent(false);
    StatusBar.setHidden(false);
  }
};