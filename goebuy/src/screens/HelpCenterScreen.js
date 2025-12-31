import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Linking,
  Alert 
} from "react-native";
import Header from "../components/Header";
import { 
  CaretLeft,
  Question,
  ChatCircle,
  Shield,
  Lightbulb,
  Phone,
  Envelope,
  CaretRight,
  Headphones
} from "phosphor-react-native";
import { useNavigation } from "@react-navigation/native";

const HelpCenterScreen = () => {
  const navigation = useNavigation();
  const [expandedCard, setExpandedCard] = useState(null);

  const handleContactPress = (type) => {
    try {
      switch(type) {
        case 'whatsapp':
          Linking.openURL('whatsapp://send?phone=+244900000000&text=Olá! Preciso de ajuda com o GoandBuy')
            .catch(() => Alert.alert('Erro', 'WhatsApp não está instalado'));
          break;
        case 'email':
          Linking.openURL('mailto:suporte@goandbuy.ao?subject=Suporte GoandBuy')
            .catch(() => Alert.alert('Erro', 'Cliente de email não encontrado'));
          break;
        case 'phone':
          Linking.openURL('tel:+244900000000')
            .catch(() => Alert.alert('Erro', 'Não foi possível fazer a ligação'));
          break;
        default:
          Alert.alert('Em breve', 'Esta funcionalidade estará disponível em breve!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o link');
    }
  };

  const helpCategories = [
    {
      id: 1,
      title: "Dúvidas Frequentes",
      description: "Respostas rápidas para as perguntas mais comuns",
      icon: Question,
      color: "#4CAF50",
      items: [
        "Como criar um pedido?",
        "Como acompanhar meu carrinho?",
        "Formas de pagamento aceitas",
        "Prazos de entrega"
      ]
    },
    {
      id: 2,
      title: "Atendimento ao Cliente",
      description: "Fale conosco através dos nossos canais",
      icon: Headphones,
      color: "#2196F3",
      items: [
        "Chat online disponível",
        "WhatsApp: +244 900 000 000",
        "Email: suporte@goandbuy.ao",
        "Horário: 8h às 18h"
      ]
    },
    {
      id: 3,
      title: "Segurança e Privacidade",
      description: "Saiba como protegemos seus dados",
      icon: Shield,
      color: "#FF9800",
      items: [
        "Política de Privacidade",
        "Termos de Uso",
        "Proteção de Dados",
        "Segurança de Pagamentos"
      ]
    },
    {
      id: 4,
      title: "Sugestões e Feedback",
      description: "Ajude-nos a melhorar a plataforma",
      icon: Lightbulb,
      color: "#9C27B0",
      items: [
        "Enviar sugestão",
        "Reportar problema",
        "Avaliar experiência",
        "Novas funcionalidades"
      ]
    }
  ];

  const contactMethods = [
    {
      type: 'whatsapp',
      title: 'WhatsApp',
      subtitle: '+244 900 000 000',
      icon: ChatCircle,
      color: '#25D366'
    },
    {
      type: 'email',
      title: 'Email',
      subtitle: 'suporte@goandbuy.ao',
      icon: Envelope,
      color: '#EA4335'
    },
    {
      type: 'phone',
      title: 'Telefone',
      subtitle: '+244 900 000 000',
      icon: Phone,
      color: '#1976D2'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <CaretLeft size={24} color="#704F38" weight="bold" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          
          <Text style={styles.mainTitle}>Como podemos ajudar você?</Text>
          <Text style={styles.subtitle}>
            Encontre respostas rápidas ou entre em contato conosco
          </Text>
        </View>

        {/* Quick Contact Section */}
        <View style={styles.quickContactSection}>
          <Text style={styles.sectionTitle}>Contato Rápido</Text>
          <View style={styles.contactMethodsContainer}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactMethodCard, { borderLeftColor: method.color }]}
                onPress={() => handleContactPress(method.type)}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${method.color}15` }]}>
                  <method.icon size={20} color={method.color} weight="fill" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{method.title}</Text>
                  <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
                </View>
                <CaretRight size={16} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categorias de Ajuda</Text>
          {helpCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => setExpandedCard(expandedCard === category.id ? null : category.id)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <category.icon size={24} color={category.color} weight="fill" />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
                <CaretRight 
                  size={20} 
                  color="#666" 
                  style={[
                    styles.expandIcon,
                    expandedCard === category.id && styles.expandIconRotated
                  ]} 
                />
              </View>
              
              {expandedCard === category.id && (
                <View style={styles.categoryContent}>
                  {category.items.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.categoryItem}>
                      <Text style={styles.categoryItemText}>• {item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header Section
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: "#704F38",
    marginLeft: 8,
    fontFamily: "Poppins_500Medium",
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 24,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  // Quick Contact Section
  quickContactSection: {
    marginBottom: 24,
  },
  contactMethodsContainer: {
    paddingHorizontal: 20,
  },
  contactMethodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },

  // Categories Section
  categoriesSection: {
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  categoryContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  categoryItem: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  categoryItemText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444444",
    lineHeight: 20,
  },

  // Emergency Section
  emergencySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emergencyCard: {
    backgroundColor: "#704F38",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emergencyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#704F38",
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

export default HelpCenterScreen;
