import React, { useState, useEffect, useCallback } from "react";
import {
    SafeAreaView,
    StyleSheet,
    View,
    Text,
    SectionList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { 
    BellSimple, 
    Package, 
    CreditCard, 
    CheckCircle, 
    ChatCircle, 
    Star,
    ShoppingCart,
    ArrowClockwise,
    TestTube
} from "phosphor-react-native";
import { BASE_URL } from "../../config";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { useNavigation } from "@react-navigation/native";

const CompradorNotificationsScreen = () => {
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 📱 Buscar notificações do backend
    const fetchNotifications = useCallback(async () => {
        try {
            console.log('[COMPRADOR-NOTIFICATIONS] 🔍 Buscando notificações...');
            
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/api/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[COMPRADOR-NOTIFICATIONS] ✅ Notificações recebidas:', data.length);
            
            // Filtrar apenas notificações relevantes para compradores (excluindo mensagens)
            const buyerNotifications = data.filter(notification => {
                const buyerRelevantTypes = [
                    'pedido', 'comprovativo', 'status', 
                    'feedback', 'carrinho', 'token_refresh', 'teste', 'rating'
                ];
                return buyerRelevantTypes.includes(notification.type);
            });

            setNotifications(buyerNotifications);
            
        } catch (error) {
            console.error('[COMPRADOR-NOTIFICATIONS] ❌ Erro ao buscar notificações:', error);
            Alert.alert('Erro', 'Não foi possível carregar as notificações. Tente novamente.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // 🔄 Refresh das notificações
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    // 🎯 Marcar notificação como lida
    const markAsRead = async (notificationId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/api/notifications/mark-read/${notificationId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            setNotifications(prev => 
                prev.map(notification => 
                    notification._id === notificationId 
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('[COMPRADOR-NOTIFICATIONS] ❌ Erro ao marcar como lida:', error);
        }
    };

    // ✅ Marcar todas como lidas
    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, isRead: true }))
            );
            
            Alert.alert('✅ Sucesso', 'Todas as notificações foram marcadas como lidas!');
        } catch (error) {
            console.error('[COMPRADOR-NOTIFICATIONS] ❌ Erro ao marcar todas como lidas:', error);
            Alert.alert('Erro', 'Não foi possível marcar todas como lidas.');
        }
    };

    // � Buscar dados do carrinho para navegação
    const fetchCartData = async (cartId) => {
        try {
            console.log('[COMPRADOR-NOTIFICATIONS] 🔍 Buscando dados do carrinho:', cartId);
            const token = await AsyncStorage.getItem('userToken');
            
            const response = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const cartData = await response.json();
            console.log('[COMPRADOR-NOTIFICATIONS] ✅ Dados do carrinho obtidos:', cartData);
            return cartData;
        } catch (error) {
            console.error('[COMPRADOR-NOTIFICATIONS] ❌ Erro ao buscar dados do carrinho:', error);
            return null;
        }
    };

    // �📱 Configuração de ícones e cores por tipo
    const getNotificationConfig = (type) => {
        const configs = {
            pedido: { 
                icon: Package, 
                color: '#2E7D32', 
                bgColor: '#E8F5E8',
                label: 'Pedido'
            },
            comprovativo: { 
                icon: CreditCard, 
                color: '#1976D2', 
                bgColor: '#E3F2FD',
                label: 'Comprovativo'
            },
            status: { 
                icon: CheckCircle, 
                color: '#388E3C', 
                bgColor: '#E8F5E8',
                label: 'Status'
            },
            message: { 
                icon: ChatCircle, 
                color: '#7B1FA2', 
                bgColor: '#F3E5F5',
                label: 'Mensagem'
            },
            feedback: { 
                icon: Star, 
                color: '#F57C00', 
                bgColor: '#FFF3E0',
                label: 'Avaliação'
            },
            carrinho: { 
                icon: ShoppingCart, 
                color: '#5D4037', 
                bgColor: '#EFEBE9',
                label: 'Carrinho'
            },
            token_refresh: { 
                icon: ArrowClockwise, 
                color: '#00796B', 
                bgColor: '#E0F2F1',
                label: 'Sistema'
            },
            teste: { 
                icon: TestTube, 
                color: '#303F9F', 
                bgColor: '#E8EAF6',
                label: 'Teste'
            },
            rating: { 
                icon: Star, 
                color: '#FF6F00', 
                bgColor: '#FFF8E1',
                label: 'Classificação'
            }
        };

        return configs[type] || { 
            icon: BellSimple, 
            color: '#704F38', 
            bgColor: '#F5F5F5',
            label: 'Notificação'
        };
    };

    // 🎯 Lidar com clique na notificação
    const handleNotificationPress = async (notification) => {
        try {
            // Marcar como lida se não foi lida
            if (!notification.isRead) {
                await markAsRead(notification._id);
            }

            // Navegação otimizada baseada no tipo e contexto
            const { type, data } = notification;
            console.log('[COMPRADOR-NOTIFICATIONS] 🎯 Navegando para:', type, data);

            switch (type) {
                case 'pedido':
                    // 🏠 Para pedidos → OrderScreen (visão geral de todos os pedidos)
                    if (data?.cartId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] 📦 Navegando para OrderScreen (pedido específico)');
                        navigation.navigate('OrderScreen', { cartId: data.cartId, forceRefresh: true });
                    } else if (data?.orderId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] 📦 Navegando para OrderScreen (por orderId)');
                        navigation.navigate('OrderScreen', { orderId: data.orderId, forceRefresh: true });
                    } else {
                        console.log('[COMPRADOR-NOTIFICATIONS] 📦 Navegando para OrderScreen (pedidos gerais)');
                        navigation.navigate('OrderScreen', { forceRefresh: true });
                    }
                    break;

                case 'status':
                    // 📋 Para status → OrderScreen (detalhes específicos) ou OrderScreen (geral)
                    if (data?.orderId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] ✅ Navegando para OrderScreen (pedido específico)');
                        navigation.navigate('OrderScreen', { orderId: data.orderId, forceRefresh: true });
                    } else if (data?.cartId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] ✅ Navegando para OrderScreen (por cartId)');
                        navigation.navigate('OrderScreen', { cartId: data.cartId, forceRefresh: true });
                    } else {
                        console.log('[COMPRADOR-NOTIFICATIONS] ✅ Navegando para OrderScreen (pedidos gerais)');
                        navigation.navigate('OrderScreen', { forceRefresh: true });
                    }
                    break;

                case 'comprovativo':
                    // 💳 Para comprovativo → DetailsCarrinho (status) ou UploadComprovativo (upload)
                    if (data?.cartId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] 💳 Navegando para DetailsCarrinho (status pagamento)');
                        const cartData = await fetchCartData(data.cartId);
                        if (cartData) {
                            navigation.navigate('OrderScreen', { orderId: data.orderId, forceRefresh: true });
                        } else {
                            // Fallback se não conseguir buscar os dados
                            navigation.navigate('OrderScreen', { orderId: data.orderId, forceRefresh: true });
                        }
                    } else {
                        console.log('[COMPRADOR-NOTIFICATIONS] 💳 Navegando para UploadComprovativo (upload)');
                        navigation.navigate('UploadComprovativoScreen');
                    }
                    break;

                case 'message':
                    // 💬 Para message → CompradorChatScreen (comunicação direta)
                    if (data?.cartId || data?.sellerId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] 💬 Navegando para CompradorChatScreen (chat direto)');
                        navigation.navigate('CompradorChatScreen', { 
                            cartId: data.cartId,
                            sellerId: data.sellerId 
                        });
                    }
                    break;

                case 'feedback':
                case 'rating':
                    // ⭐ Para avaliações → MyOrder (visualizar avaliação recebida)
                    if (data?.cartId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] ⭐ Navegando para MyOrder (visualizar avaliação)');
                        const cartData = await fetchCartData(data.cartId);
                        if (cartData) {
                            navigation.navigate('MyOrder', { cart: cartData });
                        } else {
                            // Fallback se não conseguir buscar os dados
                            navigation.navigate('OrderScreen', { orderId: data.orderId, forceRefresh: true });
                        }
                    } else {
                        console.log('[COMPRADOR-NOTIFICATIONS] ⭐ Navegando para OrderScreen (fallback)');
                        navigation.navigate('OrderScreen', { forceRefresh: true });
                    }
                    break;

                case 'carrinho':
                    // 🛒 Para carrinho → DetailsCarrinho (específico) ou AllCarrinhos (exploração)
                    if (data?.cartId) {
                        console.log('[COMPRADOR-NOTIFICATIONS] 🛒 Navegando para DetailsCarrinho (carrinho específico)');
                        const cartData = await fetchCartData(data.cartId);
                        if (cartData) {
                            navigation.navigate('DetailsCarrinhos1', { item: cartData });
                        } else {
                            // Fallback se não conseguir buscar os dados
                            navigation.navigate('DetailsCarrinhos1', { cartId: data.cartId });
                        }
                    } else {
                        console.log('[COMPRADOR-NOTIFICATIONS] 🛒 Navegando para AllCarrinhos (exploração)');
                        navigation.navigate('AllCarrinhosScreen');
                    }
                    break;

                case 'token_refresh':
                case 'teste':
                    // 🔧 Notificações do sistema - apenas alert informativo
                    console.log('[COMPRADOR-NOTIFICATIONS] 🔧 Notificação do sistema - exibindo alert');
                    Alert.alert(
                        notification.title,
                        notification.message,
                        [{ text: 'OK' }]
                    );
                    break;

                default:
                    console.log('[COMPRADOR-NOTIFICATIONS] ⚠️ Tipo de notificação não reconhecido:', type);
                    Alert.alert(
                        'Notificação',
                        'Este tipo de notificação ainda não tem uma ação específica.',
                        [{ text: 'OK' }]
                    );
            }

        } catch (error) {
            console.error('[COMPRADOR-NOTIFICATIONS] ❌ Erro ao processar notificação:', error);
            Alert.alert('Erro', 'Não foi possível abrir a notificação.');
        }
    };

    // 📅 Formatar data
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hoje';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ontem';
        } else {
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    };

    // 📋 Agrupar notificações por data
    const groupedNotifications = notifications.reduce((acc, notification) => {
        const date = formatDate(notification.createdAt);
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(notification);
        return acc;
    }, {});

    const sections = Object.keys(groupedNotifications).map(date => ({
        title: date,
        data: groupedNotifications[date],
    }));

    // 📋 Renderizar cabeçalho de seção
    const renderSectionHeader = ({ section: { title } }) => {
        const sectionData = groupedNotifications[title] || [];
        const unreadInSection = sectionData.filter(item => !item.isRead).length;
        
        return (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
                {unreadInSection > 0 && (
                    <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{unreadInSection}</Text>
                    </View>
                )}
            </View>
        );
    };

    // 🔔 Renderizar ícone da notificação
    const renderIcon = (type, isRead) => {
        const config = getNotificationConfig(type);
        const IconComponent = config.icon;
        
        return (
            <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                <IconComponent 
                    size={24} 
                    color={config.color} 
                    weight={isRead ? "regular" : "fill"}
                />
            </View>
        );
    };

    // 📱 Renderizar item de notificação
    const renderItem = ({ item }) => {
        const config = getNotificationConfig(item.type);
        
        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    item.isRead ? styles.read : styles.unread
                ]}
                onPress={() => handleNotificationPress(item)}
            >
                {/* Ícone da notificação */}
                {renderIcon(item.type, item.isRead)}

                {/* Conteúdo da notificação */}
                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text style={[
                            styles.notificationTitle,
                            !item.isRead && styles.unreadTitle
                        ]}>
                            {item.title}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
                            <Text style={styles.typeBadgeText}>{config.label}</Text>
                        </View>
                    </View>
                    
                    <Text style={[
                        styles.notificationDescription,
                        !item.isRead && styles.unreadDescription
                    ]} numberOfLines={2}>
                        {item.message}
                    </Text>
                    
                    <Text style={styles.notificationTime}>
                        {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>

                {/* Indicador de não lida */}
                {!item.isRead && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
        );
    };

    // 📊 Estatísticas das notificações
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalCount = notifications.length;

    // 🎨 Renderizar header de ações
    const renderActionsHeader = () => (
        <View style={styles.actionsHeader}>
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    {unreadCount} não lidas • {totalCount} total
                </Text>
            </View>
            
            <View style={styles.actionsContainer}>
                {unreadCount > 0 && (
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={markAllAsRead}
                    >
                        <CheckCircle size={20} color="#2E7D32" />
                        <Text style={[styles.actionButtonText, styles.markReadText]}>
                            Marcar Todas
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // 🎯 Estado vazio
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <BellSimple size={80} color="#CCCCCC" />
            <Text style={styles.emptyStateTitle}>Nenhuma Notificação</Text>
            <Text style={styles.emptyStateText}>
                Você não tem notificações no momento.{'\n'}
                Quando houver atualizações dos seus pedidos, elas aparecerão aqui.
            </Text>
        </View>
    );

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Header page="💬 Notificações " />
            
            {/* Header de ações */}
            {renderActionsHeader()}
            
            {/* Lista de notificações */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#704F38" />
                    <Text style={styles.loadingText}>Carregando notificações...</Text>
                </View>
            ) : notifications.length === 0 ? (
                renderEmptyState()
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => item._id || `item-${index}`}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#704F38']}
                            tintColor="#704F38"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
            
           
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: "#FFF" 
    },
    
    // 📊 Header de ações
    actionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    statsContainer: {
        flex: 1,
    },
    statsText: {
        fontSize: 14,
        color: '#6C757D',
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DEE2E6',
        gap: 4,
    },
    actionButtonText: {
        fontSize: 12,
        color: '#704F38',
        fontWeight: '500',
    },
    markReadText: {
        color: '#2E7D32',
    },

    // 📋 Lista
    listContainer: { 
        paddingBottom: 100,
        flexGrow: 1,
    },
    
    // 📅 Cabeçalho de seção
    sectionHeader: { 
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    sectionHeaderText: { 
        fontWeight: '600',
        color: '#495057',
        fontSize: 16,
    },
    sectionBadge: {
        backgroundColor: '#704F38',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    sectionBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    
    // 🔔 Item de notificação
    notificationItem: { 
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F4',
        backgroundColor: '#FFF',
        position: 'relative',
    },
    
    // 🎨 Ícone
    iconContainer: { 
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    
    // 📝 Conteúdo
    notificationContent: { 
        flex: 1,
        gap: 4,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    notificationTitle: { 
        fontSize: 16,
        color: '#495057',
        fontWeight: '500',
        flex: 1,
        lineHeight: 20,
    },
    unreadTitle: {
        fontWeight: '600',
        color: '#212529',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    typeBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    notificationDescription: { 
        fontSize: 14,
        color: '#6C757D',
        lineHeight: 18,
        marginTop: 2,
    },
    unreadDescription: {
        color: '#495057',
    },
    notificationTime: {
        fontSize: 12,
        color: '#ADB5BD',
        marginTop: 4,
        fontWeight: '500',
    },
    
    // 🔴 Indicador de não lida
    unreadIndicator: {
        position: 'absolute',
        right: 16,
        top: 16,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC3545',
    },
    
    // 🎯 Estados
    read: { 
        backgroundColor: '#FDFDFD',
        opacity: 0.9,
    },
    unread: { 
        backgroundColor: '#FFF',
        borderLeftWidth: 4,
        borderLeftColor: '#704F38',
    },
    
    // 📱 Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6C757D',
        fontWeight: '500',
    },
    
    // 🚫 Estado vazio
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#495057',
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6C757D',
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default CompradorNotificationsScreen;