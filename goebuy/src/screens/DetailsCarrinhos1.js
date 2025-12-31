import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { PlusCircle, X, Star } from "phosphor-react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../components/Header";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../../config";
const DetailsCarrinhoScreen1 = ({ route }) => {
  const { item: initialItem, cartId, allowEdit = false } = route.params;
  const [item, setItem] = useState(initialItem);
  const [loadingCart, setLoadingCart] = useState(!initialItem && cartId);
  const navigation = useNavigation();
  const [imagensSelecionadas, setImagensSelecionadas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [estimativa, setEstimativa] = useState(0);
  const [preco, setPreco] = useState("");
  const [link, setLink] = useState("");
  const [descricao, setDescricao] = useState("");
  const [itemEditando, setItemEditando] = useState(null);
  const [quantidade, setQuantidade] = useState("1");
  const [loading, setLoading] = useState(false);
  
  // Estados para verificação de pedidos ativos
  const [pedidoAtivo, setPedidoAtivo] = useState(null);
  const [verificandoPedido, setVerificandoPedido] = useState(true);
  const [podeEnviarPedido, setPodeEnviarPedido] = useState(true);
  const [podeAdicionarItens, setPodeAdicionarItens] = useState(true);
  const [entregaSolicitada, setEntregaSolicitada] = useState(false);
  
  // Estado para bloqueio permanente após cancelamento
  const [carrinhoBloquado, setCarrinhoBloquado] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState('');
  
  // Estado para modo de edição
  const [modoEdicao, setModoEdicao] = useState(allowEdit);

  // Estados para modal customizado
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  // Estados para toast customizado
  const [toast, setToast] = useState({
    visible: false,
    type: 'success', // 'success', 'error', 'warning', 'info'
    message: '',
  });

  // Funções para modal customizado
  const showCustomAlert = (type, title, message, onConfirm = null, onCancel = null) => {
    setCustomAlert({
      visible: true,
      type,
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const hideCustomAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

  const handleConfirm = () => {
    if (customAlert.onConfirm) {
      customAlert.onConfirm();
    }
    hideCustomAlert();
  };

  const handleCancel = () => {
    if (customAlert.onCancel) {
      customAlert.onCancel();
    }
    hideCustomAlert();
  };

  // Buscar dados do carrinho se apenas cartId foi fornecido
  useEffect(() => {
    const fetchCartData = async () => {
      if (!item && cartId) {
        try {
          setLoadingCart(true);
          console.log('[DETAILS-CARRINHO] 🔍 Buscando dados do carrinho:', cartId);
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
          console.log('[DETAILS-CARRINHO] ✅ Dados do carrinho obtidos:', cartData);
          setItem(cartData);
        } catch (error) {
          console.error('[DETAILS-CARRINHO] ❌ Erro ao buscar dados do carrinho:', error);
          showCustomAlert(
            'error',
            'Erro de Carregamento',
            'Não foi possível carregar os dados do carrinho.',
            () => navigation.goBack()
          );
        } finally {
          setLoadingCart(false);
        }
      }
    };
    
    fetchCartData();
  }, [cartId, item]);

  useEffect(() => {
    console.log("Item recebido:", item);
    // Primeiro buscar dados atualizados do carrinho, depois verificar pedidos
    if (item) {
      buscarDadosAtualizados();
    }
  }, [item]);

  // Recalcular estimativa quando entrega for solicitada/cancelada
  useEffect(() => {
    calcularEstimativa(itensCarrinho);
  }, [entregaSolicitada, itensCarrinho]);

  // Função para limpar dados inconsistentes (buyers nulos, etc.)
  const limparDadosInconsistentes = (carrinhoData) => {
    if (!carrinhoData.buyerCartProgress) {
      return carrinhoData;
    }

    // Filtrar apenas progresso com buyer válido
    const progressoLimpo = carrinhoData.buyerCartProgress.filter(progress => {
      return progress.buyer !== null && progress.buyer !== undefined;
    });

    return {
      ...carrinhoData,
      buyerCartProgress: progressoLimpo
    };
  };

  // Função para buscar dados atualizados do carrinho antes de verificar pedidos
  const buscarDadosAtualizados = async () => {
    try {
      setVerificandoPedido(true);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        setVerificandoPedido(false);
        return;
      }
      
      console.log('[DADOS] Buscando dados atualizados do carrinho...');
      
      // Buscar dados mais recentes do carrinho
      const response = await fetch(`${BASE_URL}/api/carts/${item._id}`, {
        headers: { Authorization: token },
      });
      
      if (response.ok) {
        const carrinhoAtualizado = await response.json();
        console.log('[DADOS] Carrinho atualizado:', carrinhoAtualizado);
        
        // Limpar dados inconsistentes (buyers nulos)
        const carrinhoLimpo = limparDadosInconsistentes(carrinhoAtualizado);
        console.log('[DADOS] Carrinho após limpeza:', carrinhoLimpo);
        
        // Atualizar o item com dados mais recentes e limpos
        const itemAtualizado = { ...item, ...carrinhoLimpo };
        
        // Agora verificar pedidos com dados atualizados
        await verificarPedidoExistente(itemAtualizado);
      } else {
        // Se falhar, usar dados atuais (mas limpos)
        const dadosLimpos = limparDadosInconsistentes(item);
        await verificarPedidoExistente(dadosLimpos);
      }
    } catch (error) {
      console.error('[DADOS] Erro ao buscar dados atualizados:', error);
      // Se falhar, usar dados atuais (mas limpos)
      const dadosLimpos = limparDadosInconsistentes(item);
      await verificarPedidoExistente(dadosLimpos);
    }
  };

  // Verificar dados sempre que a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('[FOCUS] Tela recebeu foco, verificando dados atualizados...');
      buscarDadosAtualizados();
    }, [])
  );

  // Função para verificar se já existe pedido ativo neste carrinho
  const verificarPedidoExistente = async (dadosCarrinho = item) => {
    try {
      setVerificandoPedido(true);
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");
      
      if (!token || !userId) {
        setVerificandoPedido(false);
        return;
      }

      // Verificar se o usuário atual já tem progresso neste carrinho
      const progressoUsuario = dadosCarrinho.buyerCartProgress?.find(
        progress => {
          // Verificar se buyer existe e não é null antes de acessar suas propriedades
          if (!progress.buyer) {
            return false;
          }
          
          // Comparar corretamente se buyer é objeto ou string
          const buyerId = typeof progress.buyer === 'object' ? progress.buyer._id : progress.buyer;
          return buyerId === userId;
        }
      );

      if (progressoUsuario) {
        // Verificar se o pedido foi cancelado - bloqueio permanente
        if (progressoUsuario.status === 'Cancelado') {
          setCarrinhoBloquado(true);
          setMotivoBloqueio('Você cancelou seu pedido neste carrinho e não pode fazer novos pedidos aqui.');
          setPedidoAtivo(progressoUsuario);
          setPodeEnviarPedido(false);
          setPodeAdicionarItens(false);
          return;
        }
        
        // Apenas permitir adições se o status for inicial ou em progresso
        const statusPermitidos = ['Em Progresso', 'Pendente', 'Aguardando']; 
        
        // Todos os outros status bloqueiam adições
        const statusBloqueados = [
          'Aceite', 'Enviado', 'Entregue', 'Pedido Feito', 'Pedido Aceito',
          'Finalizado', 'Fechado', 'Rejeitado', 'Expirado'
        ];
        
        // Sempre há um pedido ativo se tem progresso
        setPedidoAtivo(progressoUsuario);
        setPodeEnviarPedido(false);
        
        if (statusPermitidos.includes(progressoUsuario.status)) {
          setPodeAdicionarItens(true);
        } else {
          setPodeAdicionarItens(false);
        }
      } else {
        setCarrinhoBloquado(false);
        setMotivoBloqueio('');
        setPedidoAtivo(null);
        setPodeEnviarPedido(true);
        setPodeAdicionarItens(true);
      }
    } catch (error) {
      console.error("Erro ao verificar pedidos existentes:", error);
      setCarrinhoBloquado(false);
      setPodeEnviarPedido(true);
      setPodeAdicionarItens(true);
    } finally {
      setVerificandoPedido(false);
    }
  };

  const renderStars = (rating) => {
    let stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < rating ? (
          <Star key={`star_${i}`} size={18} color="#FFC107" weight="fill" />
        ) : (
          <Star key={`star_${i}`} size={18} color="#FFC107" />
        )
      );
    }
    return stars;
  };

  const adicionarItem = () => {
    // Verificação se carrinho está bloqueado
    if (carrinhoBloquado) {
      showCustomAlert(
        'error',
        'Carrinho Bloqueado',
        motivoBloqueio,
        () => navigation.goBack()
      );
      return;
    }
    
    // Verificação extra antes de adicionar item
    if (!podeAdicionarItens) {
      mostrarAlertaBloqueado();
      return;
    }
    
    if (!link || !preco || imagensSelecionadas.length === 0 || !quantidade || isNaN(quantidade) || parseInt(quantidade) < 1) {
      showToast(
        'warning',
        "Preencha todos os campos e adicione pelo menos uma imagem."
      );
      return;
    }
    const precoFinal = parseFloat(preco) * (item.exchangeRate || 1);
    if (itemEditando) {
      // Atualização
      const itensAtualizados = itensCarrinho.map((i) =>
        i.id === itemEditando.id
          ? {
              ...i,
              link,
              preco: precoFinal,
              imagens: imagensSelecionadas.map((img) => img.uri),
              descricao,
              quantidade: parseInt(quantidade),
            }
          : i
      );
      setItensCarrinho(itensAtualizados);
      calcularEstimativa(itensAtualizados);
    } else {
      // Adição
      const novoItem = {
        id: Date.now().toString(),
        nome: "Item " + (itensCarrinho.length + 1),
        link,
        imagens: imagensSelecionadas.map((img) => img.uri),
        descricao,
        exchangeRate: item.exchangeRate || 1,
        preco: precoFinal,
        quantidade: parseInt(quantidade),
      };
      const novaLista = [...itensCarrinho, novoItem];
      setItensCarrinho(novaLista);
      calcularEstimativa(novaLista);
    }
    // Resetar campos
    setLink("");
    setDescricao("");
    setImagensSelecionadas([]);
    setPreco("");
    setQuantidade("1");
    setItemEditando(null);
    setModalVisible(false);
  };

  const removerItem = (id) => {
    const filtrados = itensCarrinho.filter((item) => item.id !== id);
    setItensCarrinho(filtrados);
    calcularEstimativa(filtrados);
  };

  const calcularEstimativa = (itens) => {
    const totalItens = itens.reduce((soma, item) => soma + ((item.preco || 0) * (item.quantidade || 1)), 0);
    const taxaEntrega = entregaSolicitada && item.deliveryFee ? parseFloat(item.deliveryFee) : 0;
    const total = totalItens + taxaEntrega;
    setEstimativa(total);
  };

  const removerImagem = (id) => {
    const novasImagens = imagensSelecionadas.filter((img) => img.id !== id);
    setImagensSelecionadas(novasImagens);
  };

  const escolherImagem = async () => {
    if (imagensSelecionadas.length >= 4) {
      showToast('warning', 'Você só pode adicionar até 4 imagens.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: false, // expo-image-picker não permite múltiplas
    });

    if (!result.canceled) {
      const novaImagem = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
      };
      setImagensSelecionadas([...imagensSelecionadas, novaImagem]);
    }
  };

  // Função para lidar com pedido quando já existe um ativo
  const handlePedidoComAtivo = () => {
    // Redirecionar diretamente para OrderScreen para gerenciar itens
    navigation.navigate("OrderScreen", { cart: item });
  };

  // Função para mostrar toast customizado
  const showToast = (type, message) => {
    setToast({
      visible: true,
      type,
      message,
    });
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Função para mostrar alerta quando tentam adicionar itens após aceite
  const mostrarAlertaBloqueado = () => {
    const status = pedidoAtivo?.status?.toLowerCase() || 'processado';
    showCustomAlert(
      'warning',
      'Adição Bloqueada',
      `Não é possível adicionar mais itens porque seu pedido está ${status}. Modificações só são permitidas quando o pedido está "Em Progresso".`,
      null, // Sem ação no confirmar (apenas fechar)
      () => navigation.navigate("MyOrder", { cart: item }) // Ver pedido no cancelar
    );
  };

  const enviarPedido = async () => {
    if (loading) return;
    
    // VERIFICAÇÃO CRÍTICA: Bloqueio por carrinho cancelado
    if (carrinhoBloquado) {
      showCustomAlert(
        'error',
        'Carrinho Bloqueado',
        motivoBloqueio,
        () => navigation.goBack()
      );
      return;
    }
    
    if (!podeEnviarPedido) {
      handlePedidoComAtivo();
      return;
    }
    
    // Buscar dados atualizados antes de enviar
    await buscarDadosAtualizados();
    
    // Verificar novamente após atualização
    if (!podeEnviarPedido) {
      handlePedidoComAtivo();
      return;
    }
    
    setLoading(true);
    if (itensCarrinho.length === 0) {
      showToast('warning', 'Adicione pelo menos um item ao carrinho.');
      setLoading(false);
      return;
    }

    const token = await AsyncStorage.getItem("token");
    const buyerId = await AsyncStorage.getItem("userId");

    if (!token || !buyerId) {
      showToast('error', 'Token ou ID de usuário não encontrado.');
      setLoading(false);
      return;
    }

    try {
      for (let item1 of itensCarrinho) {
        const formData = new FormData();
        formData.append("cart", item._id); // Cart ID principal
        formData.append("buyer", buyerId);
        formData.append("productLink", item1.link);
        formData.append(
          "priceUSD",
          (item1.preco / (item?.exchangeRate || 1)).toFixed(2)
        );
        formData.append("description", item1.descricao);
        formData.append("quantity", item1.quantidade || 1);
        formData.append("deliveryRequested", entregaSolicitada); // Informação de entrega
        if (entregaSolicitada && item.deliveryFee) {
          formData.append("deliveryFee", item.deliveryFee);
        }
        
        // Log para debug
        console.log(`[DEBUG] Enviando pedido com entrega solicitada: ${entregaSolicitada}`);
        if (entregaSolicitada && item.deliveryFee) {
          console.log(`[DEBUG] Taxa de entrega: ${item.deliveryFee}`);
        }

        item1.imagens.forEach((uri, index) => {
          // Corrigir extração da extensão
          let ext = uri.split('.').pop().split('?')[0];
          if (ext.length > 5) ext = 'jpg'; // fallback para extensões estranhas
          formData.append("images", {
            uri,
            name: `image_${index}.${ext}`,
            type: `image/${ext}`,
          });
        });

        const response = await fetch(`${BASE_URL}/api/orders`, {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Erro ao enviar item:", text);
          showToast('error', 'Erro ao enviar item. Tente novamente.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("Item enviado com sucesso:", data);
      }

      // Criar/buscar conversa entre comprador e vendedor
      const sellerId = item.seller?._id || item.seller;
      if (sellerId && buyerId) {
        try {
          const convRes = await fetch(`${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`, {
            headers: { Authorization: token },
          });
          const convData = await convRes.json();
          console.log("Conversa criada/buscada:", convData);
        } catch (err) {
          console.error("Erro ao criar/buscar conversa:", err);
        }
      }

      showToast('success', 'Pedido enviado com sucesso!');
      setTimeout(() => navigation.navigate("Home"), 1500);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      showToast('error', 'Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar pedido existente
  const atualizarPedido = async () => {
    try {
      setLoading(true);
      
      if (itensCarrinho.length === 0) {
        showToast('warning', 'Adicione pelo menos um item ao carrinho antes de atualizar o pedido.');
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("userId");

      if (!token || !userId) {
        showToast('error', 'Usuário não autenticado');
        return;
      }

      // Preparar dados do pedido atualizado
      const formData = new FormData();
      
      // Adicionar dados básicos
      formData.append("cart", item._id);
      formData.append("description", `Pedido atualizado - ${itensCarrinho.length} itens`);
      formData.append("deliveryRequested", entregaSolicitada);
      if (entregaSolicitada && item.deliveryFee) {
        formData.append("deliveryFee", item.deliveryFee.toString());
      }

      // Calcular totais atualizados
      const totalAtualizado = itensCarrinho.reduce((sum, item) => {
        return sum + (parseFloat(item.preco) || 0) * (parseInt(item.quantidade) || 1);
      }, 0);

      formData.append("priceUSD", totalAtualizado.toString());
      formData.append("productLink", itensCarrinho.map(item => item.link).join(", "));

      // Adicionar imagens atualizadas
      const todasImagens = itensCarrinho.flatMap(item => item.imagens || []);
      todasImagens.forEach((imagem, index) => {
        if (typeof imagem === 'string' && imagem.startsWith('file://')) {
          // Nova imagem selecionada
          formData.append("images", {
            uri: imagem,
            type: "image/jpeg",
            name: `item_${index}.jpg`,
          });
        }
      });

      console.log('[UPDATE-ORDER] Atualizando pedido para carrinho:', item._id);

      const response = await fetch(`${BASE_URL}/api/orders/update/${item._id}/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        showToast('success', 'Pedido atualizado com sucesso!');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        const errorText = await response.text();
        console.error("Erro ao atualizar pedido:", errorText);
        showToast('error', 'Erro ao atualizar pedido. Tente novamente.');
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const showItemDetails = (item) => {
    // Função para mostrar detalhes do item
    console.log("Detalhes do item:", item);
    // Aqui você pode navegar para uma tela de detalhes ou exibir um modal
    setItemEditando(item);
    setModalVisible(true);
    setLink(item.link || "");
    setPreco(item.preco ? item.preco.toString() : "");
    setDescricao(item.descricao || "");
    setQuantidade(item.quantidade ? item.quantidade.toString() : "1");
    setImagensSelecionadas(
      item.imagens && Array.isArray(item.imagens) 
        ? item.imagens.map((uri, index) => ({ id: index.toString(), uri }))
        : []
    );
  };

  const cleanItem = () => {
    setLink("");
    setPreco("");
    setDescricao("");
    setImagensSelecionadas([]);
    setQuantidade("1");
    setItemEditando(null);
    setModalVisible(false);
  };

  const solicitarEntrega = async () => {
    if (entregaSolicitada) {
      // Se já foi solicitada, permitir cancelar
      showCustomAlert(
        'warning',
        'Cancelar Entrega',
        'Deseja cancelar a solicitação de entrega?',
        () => {
          setEntregaSolicitada(false);
          showToast('info', 'Entrega cancelada. Você pode retirar no local.');
        },
        null // Não fazer nada no cancelar
      );
    } else {
      // Se não foi solicitada, permitir solicitar
      showCustomAlert(
        'info',
        'Solicitar Entrega',
        'Deseja solicitar entrega para este carrinho?',
        () => {
          setEntregaSolicitada(true);
          showToast('success', 'Entrega solicitada! A taxa será adicionada ao total.');
        },
        null // Não fazer nada no cancelar
      );
    }
  };

  // Mostrar loading enquanto busca dados do carrinho
  if (loadingCart) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFF" 
          translucent={false}
        />
        <Header page={"Detalhes do Carrinho"} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: '#666' }}>Carregando carrinho...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar erro se não há item nem cartId
  if (!item && !cartId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFF" 
          translucent={false}
        />
        <Header page={"Detalhes do Carrinho"} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: '#666' }}>Erro: Dados do carrinho não encontrados</Text>
          <TouchableOpacity 
            style={styles.botaoAdicionar} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.textoBotaoAdicionar}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFF" 
        translucent={false}
      />
      <Header page={"Detalhes do Carrinho"} />
      <ScrollView style={styles.scrollViewStyle} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Imagem do carrinho em cima sozinha */}
          <View style={styles.imageContainer}>
            <Image
              source={
                item?.imageUrls && item.imageUrls.length > 0
                  ? {
                      uri: `${BASE_URL}/${item.imageUrls[0].replace(
                        /\\/g,
                        "/"
                      )}`,
                    }
                  : require("../../assets/imagens/zara.avif") // Imagem padrão
              }
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Card com informações do carrinho */}
          <View style={styles.infoCard}>
            <Text style={styles.itemTitle}>{item.cartName || item.nome || item.name || 'Carrinho'}</Text>
            
            {/* Informações do vendedor */}
            {item.seller && (
              <View style={styles.vendorSection}>
                <Image
                  source={{
                    uri: `${BASE_URL}/${item.seller?.profileImage?.replace(/\\/g, "/")}`,
                  }}
                  style={styles.vendorAvatar}
                />
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{item.seller?.name || 'Vendedor'}</Text>
                  <View style={styles.vendorRating}>
                    {renderStars(item.seller?.rating || 0)}
                    <Text style={styles.ratingText}>
                      {(item.seller?.rating || 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.itemInfoRow}>
              <Ionicons name="play-circle" size={16} color="#704F38" />
              <Text style={styles.itemSpace}>
                Abertura: {new Date(item.openDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.itemInfoRow}>
              <Ionicons name="stop-circle" size={16} color="#704F38" />
              <Text style={styles.itemSpace}>
                Fecho: {new Date(item.closeDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.itemInfoRow}>
              <Ionicons name="time" size={16} color="#704F38" />
              <Text style={styles.itemSpace}>
                Tempo estimado:{" "}
                {new Date(item.deliveryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.itemInfoRow}>
              <Ionicons name="trending-up" size={16} color="#704F38" />
              <Text style={styles.itemSpace}>Câmbio: {item.exchangeRate}</Text>
            </View>
            {item.province && (
              <View style={styles.itemInfoRow}>
                <Ionicons name="map" size={16} color="#704F38" />
                <Text style={styles.itemSpace}>
                  Província: {item.province}
                </Text>
              </View>
            )}
            {item.pickupLocation && (
              <View style={styles.itemInfoRow}>
                <Ionicons name="home" size={16} color="#704F38" />
                <Text style={styles.itemSpace}>
                  Local de Retirada: {item.pickupLocation}
                </Text>
              </View>
            )}
            {item.deliveryFee && (
              <View style={styles.itemInfoRow}>
                <Ionicons name="cash" size={16} color="#704F38" />
                <Text style={styles.itemSpace}>
                  Taxa de Entrega: {item.deliveryFee} Kz
                </Text>
              </View>
            )}
            
            {/* Botão para solicitar entrega - só aparece se houver taxa de entrega */}
            {item.deliveryFee && !carrinhoBloquado && (
              <TouchableOpacity
                style={[
                  styles.smallDeliveryButton,
                  entregaSolicitada && styles.smallDeliveryButtonActive
                ]}
                onPress={solicitarEntrega}
              >
                <Ionicons 
                  name={entregaSolicitada ? "checkmark-circle" : "car"} 
                  size={14} 
                  color={entregaSolicitada ? "#FFFFFF" : "#2E8B57"} 
                  style={styles.smallDeliveryButtonIcon} 
                />
                <Text style={[
                  styles.smallDeliveryButtonText,
                  entregaSolicitada && styles.smallDeliveryButtonTextActive
                ]}>
                  {entregaSolicitada ? "Entrega Solicitada" : "Solicitar Entrega"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Descrição</Text>
          
          {/* Seção de carrinho bloqueado por cancelamento */}
          {carrinhoBloquado ? (
            <View style={[styles.pedidoAtivoContainer, styles.carrinhoBloquadoContainer]}>
              <Text style={styles.carrinhoBloquadoTitulo}>
                <Ionicons name="ban" size={16} color="#E53E3E" />
                {' Carrinho Bloqueado'}
              </Text>
              <Text style={styles.carrinhoBloquadoTexto}>
                {motivoBloqueio}
              </Text>
              <TouchableOpacity 
                style={styles.voltarButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.voltarButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Seção de pedido ativo */
            pedidoAtivo && (
              <View style={[
                styles.pedidoAtivoContainer,
                !podeAdicionarItens && { backgroundColor: '#FFE6E6', borderColor: '#FF9999' }
              ]}>
                <Text style={[
                  styles.pedidoAtivoTitulo,
                  !podeAdicionarItens && { color: '#CC0000' }
                ]}>
                  <Ionicons 
                    name={!podeAdicionarItens ? "lock-closed" : "cube"} 
                    size={16} 
                    color={!podeAdicionarItens ? '#CC0000' : '#856404'} 
                  />
                  {!podeAdicionarItens ? ' Pedido Aceito - Bloqueado' : ' Pedido Ativo'}
                </Text>
                <Text style={[
                  styles.pedidoAtivoTexto,
                  !podeAdicionarItens && { color: '#CC0000' }
                ]}>
                  Seu pedido está <Text style={styles.statusText}>{pedidoAtivo.status}</Text>.
                  {!podeAdicionarItens && ' Não é possível adicionar novos itens após a aprovação do vendedor.'}
                </Text>
                <TouchableOpacity 
                  style={[
                    styles.verPedidoButton,
                    !podeAdicionarItens && { backgroundColor: '#CC0000' }
                  ]}
                  onPress={() => navigation.navigate("MyOrder", { cart: item })}
                >
                  <Text style={styles.verPedidoButtonText}>Ver Meu Pedido</Text>
                </TouchableOpacity>
              </View>
            )
          )}
          <View style={{}}>
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{item.description || item.descricao || 'Sem descrição'}</Text>
            </View>
          </View>

          
          <Text style={styles.sectionTitle}>Faça o seu pedido</Text>

          <TouchableOpacity
            style={[
              styles.addButton1,
              (!podeAdicionarItens || verificandoPedido) && { opacity: 0.5, backgroundColor: '#CCCCCC' }
            ]}
            onPress={podeAdicionarItens ? () => setModalVisible(true) : () => mostrarAlertaBloqueado()}
            disabled={verificandoPedido}
          >
            <Text style={[
              styles.addButtonText1,
              !podeAdicionarItens && { color: '#666666' }
            ]}>
              {verificandoPedido 
                ? 'Verificando...' 
                : !podeAdicionarItens 
                  ? 'Pedido Processado - Bloqueado'
                  : 'Adicionar item'
              }
            </Text>
            {podeAdicionarItens && <Ionicons name="add-circle" size={24} color="#704F38" />}
          </TouchableOpacity>

          {itensCarrinho.map((item) => (
            // Renderiza cada item do carrinho
            <TouchableOpacity
              onPress={podeAdicionarItens ? () => showItemDetails(item) : () => mostrarAlertaBloqueado()}
              style={[
                styles.itemTouchable,
                !podeAdicionarItens && { opacity: 0.6 }
              ]}
              key={item.id}
            >
              <View key={item.id} style={styles.itemCarrinhoContainer}>
                {/* Botão X no canto superior direito */}
                {podeAdicionarItens ? (
                  <TouchableOpacity
                    onPress={() => removerItem(item.id)}
                    style={styles.removerItemTopRight}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF4444" />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.removerItemTopRight, { opacity: 0.3 }]}>
                    <Ionicons name="close-circle" size={20} color="#CCCCCC" />
                  </View>
                )}
                
                <View style={styles.itemHeader}>
                  {/* Mostrar primeira imagem em vez de "Item X" */}
                  {item.imagens && item.imagens.length > 0 ? (
                    <Image 
                      source={{ uri: item.imagens[0] }} 
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={24} color="#999" />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNome}>
                      Produto {itensCarrinho.indexOf(item) + 1} {!podeAdicionarItens && '🔒'}
                    </Text>
                    {item.descricao && (
                      <Text style={styles.itemDescricao} numberOfLines={2}>
                        {item.descricao}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.row}>
                  <Text style={styles.itemPreco}>
                    {(item.preco || 0).toFixed(2)} AOA x {item.quantidade || 1}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.estimativaContainer}>
            <View style={styles.estimativaDetalhes}>
              <View style={styles.estimativaLinha}>
                <Text style={styles.estimativaTexto}>Subtotal (Itens)</Text>
                <Text style={styles.estimativaValor}>
                  {(estimativa - (entregaSolicitada && item.deliveryFee ? parseFloat(item.deliveryFee) : 0)).toFixed(2)} AOA
                </Text>
              </View>
              {entregaSolicitada && item.deliveryFee && (
                <View style={styles.estimativaLinha}>
                  <Text style={styles.estimativaTexto}>Taxa de Entrega</Text>
                  <Text style={styles.estimativaValor}>
                    {parseFloat(item.deliveryFee).toFixed(2)} AOA
                  </Text>
                </View>
              )}
              <View style={[styles.estimativaLinha, styles.estimativaTotal]}>
                <Text style={styles.estimativaTotalTexto}>Total Estimado</Text>
                <Text style={styles.estimativaTotalValor}>
                  {estimativa.toFixed(2)} AOA
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.orderButton, 
              (loading || verificandoPedido || carrinhoBloquado) && { opacity: 0.5 },
              !podeEnviarPedido && { backgroundColor: '#FFB84D' },
              carrinhoBloquado && { backgroundColor: '#E53E3E' }
            ]}
            onPress={() => {
              if (carrinhoBloquado) {
                Alert.alert(
                  "Carrinho Bloqueado", 
                  motivoBloqueio,
                  [{ text: "OK", onPress: () => navigation.goBack() }]
                );
                return;
              }
              
              if (podeEnviarPedido) {
                if (modoEdicao) {
                  atualizarPedido();
                } else {
                  enviarPedido();
                }
              } else {
                handlePedidoComAtivo();
              }
            }}
            disabled={loading || verificandoPedido}
          >
            <Text style={styles.orderButtonText}>
              {carrinhoBloquado 
                ? 'Carrinho Bloqueado'
                : verificandoPedido 
                  ? 'Verificando...' 
                  : loading 
                    ? (modoEdicao ? 'Atualizando...' : 'Enviando...') 
                    : !podeEnviarPedido 
                      ? 'Gerenciar Pedido'
                      : modoEdicao 
                        ? 'Atualizar Pedido'
                        : 'Fazer Pedido'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ScrollView style={styles.scroll}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderText}>Detalhes do item</Text>
                <TouchableOpacity
                  onPress={cleanItem}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.addButton2}
                onPress={escolherImagem}
              >
                <Text style={styles.addButtonText2}>Adicionar foto </Text>
                <Ionicons name="add-circle" size={20} color="#704F38" style={styles.searchIcon} />
              </TouchableOpacity>

              <View style={styles.imagensContainer}>
                {imagensSelecionadas.map((item) => (
                  <View key={item.id} style={styles.imagemWrapper}>
                    <Image source={{ uri: item.uri }} style={styles.foto} />
                    <TouchableOpacity
                      onPress={() => removerImagem(item.id)}
                      style={styles.removerIcon}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                placeholder="Cole o link do produto aqui"
                placeholderTextColor={"#878787"}
                style={styles.input}
                value={link}
                onChangeText={setLink}
              />

              <Text style={styles.inputLabel}>Preço</Text>
              <TextInput
                style={styles.input}
                placeholder="Valor em dolares (USD)"
                placeholderTextColor={"#878787"}
                value={preco}
                onChangeText={setPreco}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Quantidade</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={"#878787"}
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                multiline
                placeholderTextColor={"#878787"}
                placeholder="Especificações sobre o pedido..."
                value={descricao}
                onChangeText={setDescricao}
              />

              <TouchableOpacity
                style={styles.orderButton1}
                onPress={adicionarItem}
              >
                <Text style={styles.addButtonText}>
                  {itemEditando ? "Atualizar item" : "Adicionar item"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toast.visible && (
        <View style={[styles.toastContainer, styles[`toast${toast.type}`]]}>
          <View style={styles.toastContent}>
            <Ionicons 
              name={
                toast.type === 'success' ? 'checkmark-circle' :
                toast.type === 'error' ? 'close-circle' :
                toast.type === 'warning' ? 'warning' :
                'information-circle'
              } 
              size={24} 
              color="#FFF" 
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}

      {/* Modal de Alert Customizado */}
      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideCustomAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <View style={[styles.alertIconContainer, styles[`alert${customAlert.type}`]]}>
              <Ionicons 
                name={
                  customAlert.type === 'success' ? 'checkmark-circle' :
                  customAlert.type === 'error' ? 'close-circle' :
                  customAlert.type === 'warning' ? 'warning' :
                  'information-circle'
                } 
                size={40} 
                color="#FFF" 
              />
            </View>
            
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            
            <View style={styles.alertButtonContainer}>
              {customAlert.onCancel && (
                <TouchableOpacity 
                  style={[styles.alertButton, styles.alertButtonSecondary]}
                  onPress={handleCancel}
                >
                  <Text style={styles.alertButtonTextSecondary}>
                    {customAlert.type === 'warning' ? 'Ver Pedido' : 'Cancelar'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.alertButton, styles[`alertButton${customAlert.type}`], !customAlert.onCancel && styles.fullWidthButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.alertButtonText}>
                  {customAlert.onCancel ? 
                    (customAlert.type === 'warning' ? 'Adicionar Itens' : 'Confirmar') : 
                    'OK'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight - 40 || 0,
      },
    }),
  },
  scrollViewStyle: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    marginHorizontal: 16,
    backgroundColor: "#F8F9FA",
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  header: {
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "300",
    margin: 16,
  },
  imageContainer: {
    width: "100%",
    height: 170,
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  vendorSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  vendorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#704F38",
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 4,
  },
  vendorRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#704F38",
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
  itemSpace: {
    paddingBottom: 3,
    color: "#878787",
    fontFamily: "Poppins_400Regular",
    marginLeft: 8,
  },
  itemInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  itemTitle: {
    fontWeight: "600",
    fontSize: 20,
    marginBottom: 8,
    fontFamily: "Poppins_600SemiBold",
    color: "#2C3E50",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginLeft: 20,
    marginTop: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#2C3E50",
  },
  descriptionContainer: {
    marginTop: 20,
    borderWidth: 1,
    marginHorizontal: 0,
    borderColor: "#E8E8E8",
    minHeight: 120,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  description: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  deliveryInfoContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  deliveryInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  deliveryInfoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deliveryInfoLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#704F38",
    marginLeft: 8,
  },
  deliveryInfoValue: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    flex: 2,
    textAlign: "right",
  },
  vendedorInfo: {
    flexDirection: "row",
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  vendedorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  vendedorDetails: {
    marginLeft: 10,
    fontFamily: "Poppins_400Regular",
  },
  vendedorName: {
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  totalCarrinhos: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  starsContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  addButton1: {
    marginTop: 25,
    marginHorizontal: 20,
    paddingVertical: 5,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#704F38",
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addButton2: {
    marginTop: 10,
    paddingVertical: 10,

    flexDirection: "row",
  },

  addButtonText1: {
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
  },
  addButtonText2: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },

  orderButton: {
    marginTop: 20,
    backgroundColor: "#704F38",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 20,
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  orderButton1: {
    marginTop: 20,
    backgroundColor: "#704F38",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 20,
  },
  orderButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_400Regular",
  },
  smallDeliveryButton: {
    marginTop: 12,
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2E8B57",
    alignSelf: "flex-start",
  },
  smallDeliveryButtonActive: {
    backgroundColor: "#2E8B57",
    borderColor: "#2E8B57",
  },
  smallDeliveryButtonIcon: {
    marginRight: 6,
  },
  smallDeliveryButtonText: {
    color: "#2E8B57",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
  },
  smallDeliveryButtonTextActive: {
    color: "#FFFFFF",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  scroll: {
    width: "100%",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    height: "75%",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeaderText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
  },
  closeButton: {
    padding: 10, // Para aumentar a área de toque
  },
  modalBody: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 16,
    marginTop: 25,
    fontFamily: "Poppins_400Regular",
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 5,
  },
  descriptionInput: {
    textAlignVertical: "top", // Para alinhar o texto no topo no Android
    height: 140,
    fontFamily: "Poppins_400Regular",
  },
  foto: {
    width: 100,
    height: 90,
    borderRadius: 5,
    marginRight: 10,
    marginTop: 5,
  },
  addButton: {
    backgroundColor: "#704F38",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
    width: "100%",
    alignItems: "center",
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Poppins_400Regular",
  },
  openModalButton: {
    // Estilos para o botão que abre o modal
  },
  openModalButtonText: {
    // Estilos para o texto do botão que abre o modal
  },
  itemCarrinhoContainer: {
    flexDirection: "column",
    position: "relative", // Para permitir posicionamento absoluto do botão X
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  removerItemTopRight: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#704F38",
    fontFamily: "Poppins_400Regular",
    marginBottom: 4,
  },
  itemDescricao: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  row: {
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
  },
  itemPreco: {
    fontSize: 16,
    color: "#704F38", // Cor do texto para o preço do item
    fontFamily: "Poppins_400Regular",
  },
  removerItem: {
    padding: 8, // Para aumentar a área de toque
  },
  estimativaContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#e1e1e1",
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  estimativaDetalhes: {
    width: "100%",
  },
  estimativaLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  estimativaTotal: {
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    marginTop: 8,
    paddingTop: 8,
  },
  estimativaTexto: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  estimativaValor: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  estimativaTotalTexto: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Poppins_600SemiBold",
  },
  estimativaTotalValor: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#704F38",
    fontFamily: "Poppins_600SemiBold",
  },
  orderButton: {
    backgroundColor: "#704F38",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 30,
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  orderButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Poppins_400Regular",
  },
  imagensContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  imagemWrapper: {
    position: "relative",
  },
  removerIcon: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#00000088",
    borderRadius: 10,
    padding: 2,
    zIndex: 1,
  },
  foto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  
  // Estilos para pedido ativo
  pedidoAtivoContainer: {
    backgroundColor: "#FFF3CD",
    borderWidth: 1.5,
    borderColor: "#FFEAA7",
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
    marginHorizontal: 20,
    shadowColor: "#F39C12",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pedidoAtivoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 8,
    fontFamily: "Poppins_600SemiBold",
  },
  pedidoAtivoTexto: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 12,
    fontFamily: "Poppins_400Regular",
  },
  statusText: {
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  verPedidoButton: {
    backgroundColor: "#856404",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: "flex-start",
    shadowColor: "#856404",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  verPedidoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
  
  // Estilos para carrinho bloqueado
  carrinhoBloquadoContainer: {
    backgroundColor: "#FED7D7",
    borderColor: "#FC8181",
    shadowColor: "#E53E3E",
  },
  carrinhoBloquadoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E53E3E",
    marginBottom: 8,
    fontFamily: "Poppins_600SemiBold",
  },
  carrinhoBloquadoTexto: {
    fontSize: 14,
    color: "#C53030",
    marginBottom: 15,
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },
  voltarButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#E53E3E",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  voltarButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },

  // Estilos para Toast
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  toastsuccess: {
    backgroundColor: "#4CAF50",
  },
  toasterror: {
    backgroundColor: "#FF4444",
  },
  toastwarning: {
    backgroundColor: "#FF9800",
  },
  toastinfo: {
    backgroundColor: "#2196F3",
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    marginLeft: 12,
    flex: 1,
  },

  // Estilos para Alert Customizado
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  alertContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 15,
    minWidth: 300,
    maxWidth: 350,
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertsuccess: {
    backgroundColor: "#4CAF50",
  },
  alerterror: {
    backgroundColor: "#FF4444",
  },
  alertwarning: {
    backgroundColor: "#FF9800",
  },
  alertinfo: {
    backgroundColor: "#2196F3",
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  alertButtonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  alertButtonsuccess: {
    backgroundColor: "#4CAF50",
  },
  alertButtonerror: {
    backgroundColor: "#FF4444",
  },
  alertButtonwarning: {
    backgroundColor: "#FF9800",
  },
  alertButtoninfo: {
    backgroundColor: "#2196F3",
  },
  alertButtonSecondary: {
    backgroundColor: "#E0E0E0",
    borderWidth: 1,
    borderColor: "#BDBDBD",
  },
  alertButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  alertButtonTextSecondary: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
});

export default DetailsCarrinhoScreen1;
