import React, { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../../config";
import io from 'socket.io-client';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
    SafeAreaView,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SectionList,
} from "react-native";
import { 
    BellSimple, 
    ShoppingBag, 
    Receipt, 
    Info, 
    ChatCircle, 
    Star, 
    ShoppingCart, 
    ArrowsClockwise, 
    FlaskEmpty 
} from "phosphor-react-native";
import Header from '../components/Header';

const SOCKET_URL = BASE_URL; // Usa a BASE_URL do config

const NotificationsScreen = () => {
    console.log('[SOCKET][FRONT] NotificationsScreen montado!');

    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    // Sistema de mapeamento de tipos de notificação
    const getNotificationConfig = (type) => {
        const configs = {
            'pedido': {
                icon: 'ShoppingBag',
                color: '#2563EB', // Azul
                bgColor: '#EFF6FF',
                title: 'Novo Pedido',
                action: 'Visualizar pedido'
            },
            'comprovativo': {
                icon: 'Receipt',
                color: '#059669', // Verde
                bgColor: '#ECFDF5',
                title: 'Comprovativo',
                action: 'Ver comprovativo'
            },
            'status': {
                icon: 'Info',
                color: '#EA580C', // Laranja
                bgColor: '#FFF7ED',
                title: 'Status Atualizado',
                action: 'Ver atualização'
            },
            'message': {
                icon: 'ChatCircle',
                color: '#7C3AED', // Roxo
                bgColor: '#F3E8FF',
                title: 'Nova Mensagem',
                action: 'Abrir chat'
            },
            'feedback': {
                icon: 'Star',
                color: '#DC2626', // Vermelho
                bgColor: '#FEF2F2',
                title: 'Feedback',
                action: 'Ver detalhes'
            },
            'carrinho': {
                icon: 'ShoppingCart',
                color: '#0891B2', // Ciano
                bgColor: '#F0F9FF',
                title: 'Carrinho',
                action: 'Ver carrinho'
            },
            'token_refresh': {
                icon: 'ArrowsClockwise',
                color: '#6B7280', // Cinza
                bgColor: '#F9FAFB',
                title: 'Sistema',
                action: 'Atualização'
            },
            'teste': {
                icon: 'FlaskEmpty',
                color: '#8B5CF6', // Roxo claro
                bgColor: '#FAF5FF',
                title: 'Teste',
                action: 'Testar'
            },
            'rating': {
                icon: 'Star',
                color: '#F59E0B', // Dourado
                bgColor: '#FFFBEB',
                title: 'Nova Avaliação',
                action: 'Ver detalhes'
            }
        };
        
        return configs[type] || {
            icon: 'BellSimple',
            color: '#704F38', // Cor padrão do app
            bgColor: '#F5F5F5',
            title: 'Notificação',
            action: 'Ver detalhes'
        };
    };

    // Função para navegar baseada no tipo de notificação
    const handleNotificationPress = async (notification) => {
        try {
            console.log('[NOTIFICATION-NAV] Processando notificação:', {
                id: notification.id,
                title: notification.title,
                type: notification.type,
                data: notification.data
            });

            // Marcar como lida primeiro
            await markAsRead(notification.id);

            // Navegar baseado no tipo de notificação
            const notificationType = notification.type;
            const notificationData = notification.data || {};

            switch (notificationType) {
                case 'pedido':
                    // Novo pedido - vendedor navega para gerenciar pedidos
                    console.log('[NOTIFICATION-NAV] Navegando para pedido:', notificationData);
                    if (notificationData.cartId) {
                        await navigateToCart(notificationData.cartId, 'OrderScreen1');
                    } else if (notificationData.orderId) {
                        navigation.navigate('DetailOrder', { orderId: notificationData.orderId });
                    } else {
                        navigation.navigate('OrderScreen1');
                    }
                    break;
                    
                case 'comprovativo':
                    // Comprovativo enviado - vendedor vê detalhes do pedido
                    console.log('[NOTIFICATION-NAV] Navegando para comprovativo:', notificationData);
                    if (notificationData.orderId) {
                        navigation.navigate('DetailOrder', { orderId: notificationData.orderId });
                    } else if (notificationData.cartId) {
                        await navigateToCart(notificationData.cartId, 'OrderScreen1');
                    } else {
                        navigation.navigate('OrderScreen1');
                    }
                    break;
                    
                case 'status':
                    // Status atualizado - comprador vê seus pedidos
                    console.log('[NOTIFICATION-NAV] Navegando para status:', notificationData);
                    if (notificationData.cartId) {
                        await navigateToCart(notificationData.cartId, 'MyOrder');
                    } else {
                        navigation.navigate('MyOrder');
                    }
                    break;
                    
                case 'message':
                    // Nova mensagem - abrir chat
                    console.log('[NOTIFICATION-NAV] Navegando para mensagem:', notificationData);
                    try {
                        if (notificationData.conversationId) {
                            navigation.navigate('CompradorChatScreen', {
                                conversationId: notificationData.conversationId,
                                otherUserId: notificationData.senderId,
                                otherUserName: notificationData.senderName || 'Usuário'
                            });
                        } else {
                            // Navegar para lista de chats se não tiver conversa específica
                            navigation.navigate('CompradorChatScreen');
                        }
                    } catch (navError) {
                        console.error('[NOTIFICATION-NAV] Erro na navegação para CompradorChatScreen:', navError);
                        navigation.navigate('Home');
                    }
                    break;
                    
                case 'feedback':
                    // Feedback - navegar para MyCartDetailScreen para ver detalhes do carrinho finalizado
                    console.log('[NOTIFICATION-NAV] Navegando para feedback:', notificationData);
                    if (notificationData.cartId) {
                        // Para notificações de feedback, sempre navegar para MyCartDetailScreen
                        await navigateToCart(notificationData.cartId, 'MyCartDetailScreen');
                    } else {
                        // Fallback para tela de feedback genérica
                        navigation.navigate('FeedBackScreen');
                    }
                    break;
                    
                case 'carrinho':
                    // Carrinho - navegar para detalhes do carrinho
                    console.log('[NOTIFICATION-NAV] Navegando para carrinho:', notificationData);
                    if (notificationData.cartId) {
                        await navigateToCart(notificationData.cartId);
                    } else {
                        navigation.navigate('CarrinhosScreen');
                    }
                    break;
                    
                case 'token_refresh':
                    // Token refresh - não navegar, apenas informativo
                    console.log('[NOTIFICATION-NAV] Notificação de sistema - token refresh');
                    break;
                    
                case 'teste':
                    // Teste - comportamento padrão
                    console.log('[NOTIFICATION-NAV] Notificação de teste');
                    break;
                    
                case 'rating':
                    // Nova avaliação recebida - navegar para MyCartDetailScreen
                    console.log('[NOTIFICATION-NAV] Navegando para avaliação:', notificationData);
                    if (notificationData.cartId) {
                        await navigateToCart(notificationData.cartId, 'MyCartDetailScreen');
                    } else {
                        // Fallback para lista de carrinhos
                        navigation.navigate('MycartsScreen');
                    }
                    break;
                    
                default:
                    console.log('[NOTIFICATION-NAV] Tipo não reconhecido:', notificationType);
                    try {
                        // Para notificações sem tipo específico, tentar interpretar pelo conteúdo
                        await handleGenericNotification(notification);
                    } catch (genericError) {
                        console.error('[NOTIFICATION-NAV] Erro na navegação genérica:', genericError);
                        navigation.navigate('Home');
                    }
                    break;
            }
        } catch (error) {
            console.error('[NOTIFICATION-NAV] Erro ao processar notificação:', error);
        }
    };

    // Função para navegar para carrinho com dados atualizados
    const navigateToCart = async (cartId, preferredScreen = null) => {
        try {                                                                                                                                                                                                                                                                                                                                                                
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('[NOTIFICATION-NAV] Token não encontrado');
                return;
            }

            console.log('[NOTIFICATION-NAV] Buscando dados do carrinho:', cartId);
            
            const response = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const cart = await response.json();
                console.log('[NOTIFICATION-NAV] Dados do carrinho obtidos:', {
                    cartName: cart.cartName,
                    isOpen: cart.isOpen,
                    isClosed: cart.isClosed,
                    preferredScreen
                });
                
                // Usar tela preferida se especificada, caso contrário usar lógica baseada no status
                if (preferredScreen) {
                    console.log('[NOTIFICATION-NAV] Navegando para tela preferida:', preferredScreen, 'com cart:', cart._id);
                    try {
                        navigation.navigate(preferredScreen, { cart, cartId });
                    } catch (navError) {
                        console.error('[NOTIFICATION-NAV] Erro na navegação para', preferredScreen, ':', navError);
                        // Fallback para Home em caso de erro
                        navigation.navigate('Home');
                    }
                } else {
                    // Navegar para a tela apropriada baseado no status do carrinho
                    if (cart.isClosed) {
                        // Carrinho fechado - navegar para detalhes finais
                        console.log('[NOTIFICATION-NAV] Navegando para carrinho fechado');
                        navigation.navigate('MyCartDetailScreen', { cart });
                    } else {
                        // Carrinho ativo - navegar para gerenciamento
                        console.log('[NOTIFICATION-NAV] Navegando para carrinho ativo');
                        navigation.navigate('OrderScreen1', { cart });
                    }
                }
            } else {
                console.log('[NOTIFICATION-NAV] Erro ao buscar carrinho:', response.status);
                // Navegar para tela de fallback se especificada
                if (preferredScreen) {
                    navigation.navigate(preferredScreen);
                }
            }
        } catch (error) {
            console.error('[NOTIFICATION-NAV] Erro ao navegar para carrinho:', error);
            // Navegar para tela de fallback se especificada
            if (preferredScreen) {
                navigation.navigate(preferredScreen);
            }
        }
    };

    // Função para lidar com notificações genéricas ou sem tipo
    const handleGenericNotification = async (notification) => {
        try {
            console.log('[NOTIFICATION-NAV] Processando notificação genérica:', notification.title);
            
            // Tentar extrair informações do título e descrição
            const title = (notification.title || '').toLowerCase();
            const description = (notification.description || '').toLowerCase();
            const fullText = `${title} ${description}`;
            
            // Mapear palavras-chave para telas específicas
            if (fullText.includes('pedido') || fullText.includes('order') || fullText.includes('compra')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de pedido');
                navigation.navigate('MyOrder');
            } else if (fullText.includes('comprovativo') || fullText.includes('pagamento') || fullText.includes('payment')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de pagamento');
                navigation.navigate('MyOrder');
            } else if (fullText.includes('carrinho') || fullText.includes('cart')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de carrinho');
                navigation.navigate('CarrinhosScreen');
            } else if (fullText.includes('mensagem') || fullText.includes('chat') || fullText.includes('message') || fullText.includes('conversa')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de mensagem');
                navigation.navigate('CompradorChatScreen');
            } else if (fullText.includes('feedback') || fullText.includes('avaliação') || fullText.includes('rating') || fullText.includes('finalizado') || fullText.includes('estrelas') || fullText.includes('parabéns')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de feedback/avaliação');
                // Para feedback/avaliação/finalização, navegar para MyCartDetailScreen se possível
                if (notification.data && notification.data.cartId) {
                    await navigateToCart(notification.data.cartId, 'MyCartDetailScreen');
                } else {
                    navigation.navigate('FeedBackScreen');
                }
            } else if (fullText.includes('status') || fullText.includes('atualização') || fullText.includes('update')) {
                console.log('[NOTIFICATION-NAV] Detectado como notificação de status');
                navigation.navigate('MyOrder');
            } else {
                console.log('[NOTIFICATION-NAV] Tipo não identificado, navegando para Home');
                navigation.navigate('Home');
            }
        } catch (error) {
            console.error('[NOTIFICATION-NAV] Erro ao processar notificação genérica:', error);
            // Em caso de erro, navegar para Home como fallback
            navigation.navigate('Home');
        }
    };
    const markAsRead = async (notificationId) => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            
            console.log('[NOTIFICATION] Marcando notificação como lida:', notificationId);
            
            const response = await fetch(`${BASE_URL}/api/notifications/mark-read/${notificationId}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('[NOTIFICATION] Notificação marcada como lida:', notificationId);
                
                // Atualizar o estado local
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, read: true, isRead: true }
                        : notif
                ));
            } else {
                console.error('[NOTIFICATION] Erro ao marcar como lida:', response.status);
            }
        } catch (error) {
            console.error('[NOTIFICATION] Erro ao marcar como lida:', error);
        }
    };

    // Função para marcar todas as notificações como lidas
    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            
            console.log('[NOTIFICATION] Marcando todas como lidas');
            
            const response = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('[NOTIFICATION] Resultado:', result);
                
                // Atualizar o estado local
                setNotifications(prev => prev.map(notif => ({ 
                    ...notif, 
                    read: true, 
                    isRead: true 
                })));
                
                console.log('[NOTIFICATION] Todas as notificações marcadas como lidas');
            } else {
                console.error('[NOTIFICATION] Erro ao marcar todas como lidas:', response.status);
            }
        } catch (error) {
            console.error('[NOTIFICATION] Erro ao marcar todas como lidas:', error);
        }
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                const userId = await AsyncStorage.getItem("userId");
                const userType = await AsyncStorage.getItem("userType");
                
                console.log('[NOTIFICATION] Tipo de usuário:', userType);
                
                if (!token || !userId) return;
                
                const res = await fetch(`${BASE_URL}/api/notifications`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await res.json();
                console.log('[NOTIFICATION] Notificações carregadas:', data.length);
                
                // Filtrar mensagens de chat (não devem aparecer aqui)
                const filteredData = data.filter(n => n.type !== 'message');
                console.log('[NOTIFICATION] Notificações filtradas (sem mensagens):', filteredData.length);
                
                // Adiciona campo 'date' formatado para agrupamento
                const nots = filteredData.map(n => ({
                    ...n,
                    id: n._id,
                    date: formatDate(n.createdAt),
                    read: n.isRead,
                    description: n.message
                }));
                setNotifications(nots);
            } catch (e) {
                console.error('[NOTIFICATION] Erro ao buscar notificações:', e);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    useEffect(() => {
        // Buscar userId do AsyncStorage
        AsyncStorage.getItem('userId').then(id => {
            setUserId(id);
            console.log('[SOCKET][FRONT] userId do AsyncStorage:', id);
            // Conectar ao socket usando lógica igual ao chat
            socketRef.current = io(BASE_URL.replace('/api', ''), {
                transports: ['websocket'],
                query: { userId: id },
            });
            socketRef.current.on('connect', () => {
                console.log('[SOCKET][FRONT] Conectado! Socket ID:', socketRef.current.id);
                console.log('[SOCKET][FRONT] Query enviada:', socketRef.current.io.opts.query);
            });
            // Entrar na sala do usuário
            socketRef.current.emit('join', id);
            console.log('[SOCKET][FRONT] Emitindo join para sala/userId:', id);
            // Ouvir evento de notificação
            socketRef.current.on('notification', (notif) => {
                console.log('[SOCKET][FRONT] Notificação recebida:', notif);
                
                // Ignorar mensagens de chat (não devem aparecer aqui)
                if (notif.type === 'message') {
                    console.log('[SOCKET][FRONT] Ignorando notificação de mensagem');
                    return;
                }
                
                // Log extra para debug: mostrar estado anterior
                console.log('[SOCKET][FRONT] Estado anterior das notificações:', notifications);
                // Formatar notificação recebida para garantir compatibilidade
                const formatted = {
                    ...notif,
                    id: notif._id,
                    date: formatDate(notif.createdAt),
                    read: notif.isRead,
                    description: notif.message
                };
                setNotifications(prev => {
                    console.log('[SOCKET][FRONT] Atualizando notificações. Novo:', formatted);
                    return [formatted, ...prev];
                });
            });
        });
        // Cleanup
        return () => {
            if (socketRef.current) {
                console.log('[SOCKET][FRONT] Desconectando socket...');
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Função para formatar a data (ex: HOJE, ONTEM, dd/MM/yyyy)
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return "HOJE";
        if (d.toDateString() === yesterday.toDateString()) return "ONTEM";
        return d.toLocaleDateString();
    }

    // Group notifications by date
    const groupedNotifications = notifications.reduce((acc, notification) => {
        const { date } = notification;
        acc[date] = acc[date] || [];
        acc[date].push(notification);
        return acc;
    }, {});

    // Convert grouped notifications into section list data
    const sections = Object.keys(groupedNotifications).map(date => ({
        title: date,
        data: groupedNotifications[date],
    }));

    // Função para obter estatísticas dos tipos de notificação
    const getNotificationStats = () => {
        const stats = {};
        notifications.forEach(notification => {
            const type = notification.type || 'outros';
            if (!stats[type]) {
                stats[type] = { total: 0, unread: 0 };
            }
            stats[type].total++;
            if (!notification.read) {
                stats[type].unread++;
            }
        });
        return stats;
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );

    // Componente para renderizar ícone baseado no tipo
    const renderIcon = (type, size = 32) => {
        const config = getNotificationConfig(type);
        const iconProps = {
            size,
            color: config.color,
            weight: 'regular'
        };

        switch (config.icon) {
            case 'ShoppingBag':
                return <ShoppingBag {...iconProps} />;
            case 'Receipt':
                return <Receipt {...iconProps} />;
            case 'Info':
                return <Info {...iconProps} />;
            case 'ChatCircle':
                return <ChatCircle {...iconProps} />;
            case 'Star':
                return <Star {...iconProps} />;
            case 'ShoppingCart':
                return <ShoppingCart {...iconProps} />;
            case 'ArrowsClockwise':
                return <ArrowsClockwise {...iconProps} />;
            case 'FlaskEmpty':
                return <FlaskEmpty {...iconProps} />;
            default:
                return <BellSimple {...iconProps} />;
        }
    };

    const renderItem = ({ item }) => {
        if (!item || !item.id) {
            console.warn('[NOTIFICATION] Item inválido:', item);
            return null;
        }
        
        const config = getNotificationConfig(item.type);
        
        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem, 
                    item.read ? styles.read : styles.unread,
                    !item.read && { borderLeftColor: config.color }
                ]}
                onPress={() => {
                    handleNotificationPress(item);
                }}
            >
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: config.bgColor }
                ]}>
                    {renderIcon(item.type, 32)}
                </View>
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationDescription}>{item.description}</Text>
                    {item.type && (
                        <Text style={[styles.notificationAction, { color: config.color }]}>
                            {config.action}
                        </Text>
                    )}
                </View>
                {!item.read && (
                    <View style={[styles.unreadIndicator, { backgroundColor: config.color }]} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Header page="Notificações" />
            {loading ? (
                <Text style={{ textAlign: 'center', marginTop: 30 }}>Carregando...</Text>
            ) : (
                <>
                    {notifications.length > 0 && notifications.some(n => !n.read) && (
                        <View style={styles.markAllContainer}>
                            <TouchableOpacity 
                                style={styles.markAllButton} 
                                onPress={markAllAsRead}
                            >
                                <Text style={styles.markAllButtonText}>Marcar todas como lidas</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <SectionList
                        sections={sections}
                        keyExtractor={(item, index) => item.id || `item-${index}`}
                        renderItem={renderItem}
                        renderSectionHeader={renderSectionHeader}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30 }}>Nenhuma notificação encontrada.</Text>}
                        onError={(error) => {
                            console.error('[NOTIFICATION] Erro no SectionList:', error);
                        }}
                    />
                </>
            )}
        </SafeAreaView>
    );


};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFF", // ou a cor de
    },
    scrollViewStyle: {
        flex: 1,
    },
    container: {
        marginHorizontal: 13,
        backgroundColor: "#FFF",
    },
    center: {
        justifyContent: "center",
        alignContent: "center",
        alignItems: "center",
    },
    sectionHeader: {
        marginBottom: 10,
        marginTop: 10,
        marginLeft: 10,

    },
    sectionHeaderText: {

        fontFamily: 'Poppins_400Regular',
        fontSize: 18,
        color: '#704F38',

    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: "space-between",
        alignContent: "center",
        alignItems: "center",
        width: '100%',
    },
    headerText: {
        fontSize: 24,
        fontWeight: "300",
        margin: 16,
        fontFamily: 'Poppins_400Regular',
        width: '80%',
    },
    itemContainer: {
        flexDirection: "row",
        padding: 16,
        alignItems: "center",
        borderBottomColor: '#DEDEDE',
        borderBottomWidth: 1,
    },
    listContainer: {
    },
    notificationItem: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#e8e8e8',
        padding: 10,
        width: '100%',
    },
    read: {
        backgroundColor: '#f8f9fa',
        opacity: 0.8,
    },
    unread: {
        backgroundColor: '#ffffff',
        borderLeftWidth: 4,
        borderLeftColor: '#704F38',
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        position: 'absolute',
        top: 15,
        right: 15,
    },
    markAllContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
        backgroundColor: '#f8f9fa',
    },
    markAllButton: {
        backgroundColor: '#704F38',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    markAllButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Poppins_500Medium',
    },
    iconContainer: {
        borderRadius: 12,
        width: 50,
        height: 50,
        alignItems: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
        justifyContent: 'center',
    },
    notificationTitle: {
        fontFamily: 'Poppins_400Regular',

    },
    notificationDescription: {
        fontFamily: 'Poppins_400Regular',
        color: '#a9a9a9',
        fontSize: 13,
        marginTop: 2,
    },
    notificationAction: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    closeButton: {
        // styles for close button in modal
    },
    modalView: {
        // styles for modal view
    },
    modalText: {
        // styles for modal text
    },
    // Add any additional styles you need
});

export default NotificationsScreen;
