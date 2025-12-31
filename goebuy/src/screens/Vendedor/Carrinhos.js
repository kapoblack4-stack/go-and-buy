import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { MagnifyingGlass } from "phosphor-react-native";
import carrinhosData from "../../mocks/mocks";
import { BellSimple, CaretLeft } from "phosphor-react-native";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../../config";

// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const CarrinhosScreen = () => {
  // Estados para campos avançados
  const [plataforma, setPlataforma] = React.useState("");
  const [cambioMin, setCambioMin] = React.useState("");
  const [cambioMax, setCambioMax] = React.useState("");
  const [itemCount, setItemCount] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [provincia, setProvincia] = React.useState("");
  const [localEntrega, setLocalEntrega] = React.useState("");
  const [showDateAbertura, setShowDateAbertura] = React.useState(false);
  const [showDateFechamento, setShowDateFechamento] = React.useState(false);
  const navigation = useNavigation();
  const [search, setSearch] = React.useState("");
  const [carrinhos, setCarrinhos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dataAbertura, setDataAbertura] = React.useState("");
  const [dataFechamento, setDataFechamento] = React.useState("");
  const [vendedor, setVendedor] = React.useState("");
  const [modalVisible, setModalVisible] = React.useState(false);
  // 🧪 Estado para modo teste - carrega todos os carrinhos (ativos e inativos)
  const [modoTeste, setModoTeste] = React.useState(false);

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearch("");
    setPlataforma("");
    setCambioMin("");
    setCambioMax("");
    setItemCount("");
    setRating("");
    setDataAbertura("");
    setDataFechamento("");
    setVendedor("");
    setProvincia("");
    setLocalEntrega("");
    setModoTeste(false); // 🧪 Resetar modo teste também
  };

  // Função para contar filtros ativos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (search.trim()) count++;
    if (plataforma.trim()) count++;
    if (cambioMin.trim()) count++;
    if (cambioMax.trim()) count++;
    if (itemCount.trim()) count++;
    if (rating.trim()) count++;
    if (dataAbertura) count++;
    if (dataFechamento) count++;
    if (vendedor.trim()) count++;
    if (provincia.trim()) count++;
    if (localEntrega.trim()) count++;
    if (modoTeste) count++; // 🧪 Incluir modo teste na contagem
    return count;
  };

  // 🧪 Função para ativar/desativar modo teste
  const toggleModoTeste = () => {
    const novoModo = !modoTeste;
    setModoTeste(novoModo);
    
    if (novoModo) {
      console.log('🧪 Modo teste ativado - mostrando todos os carrinhos (ativos e fechados)');
    } else {
      console.log('🧪 Modo teste desativado - mostrando apenas carrinhos ativos');
    }
  };

  React.useEffect(() => {
    const fetchCarrinhos = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BASE_URL}/api/carts`);
        const data = await res.json();
        setCarrinhos(data);
      } catch (err) {
        console.log('Erro ao buscar carrinhos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCarrinhos();
  }, []);

  const handleItemPress = (item) => {
    navigation.navigate("DetailsCarrinhos1", { item: item ?? {} });
  };

   const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Filtra carrinhos com lógica melhorada
  const filteredCarrinhos = React.useMemo(() => {
    return carrinhos.filter((item) => {
      // 🧪 FILTRO PRINCIPAL: Status do carrinho (ativo/fechado)
      if (!modoTeste) {
        // Modo normal: apenas carrinhos ativos (não fechados)
        const isActive = item.status !== 'fechado' && 
                        item.status !== 'closed' && 
                        item.isActive !== false &&
                        !item.isClosed;
        if (!isActive) return false;
      }
      // Se modoTeste = true, mostra todos (ativos e fechados)
      
      // Filtro por nome do carrinho
      const nomeMatch = (item.cartName || "").toLowerCase().includes(search.toLowerCase());
      
      // Filtro por vendedor
      const vendedorMatch = vendedor.trim() === "" || 
        (item.seller?.name || "").toLowerCase().includes(vendedor.toLowerCase());
      
      // Filtro por plataforma
      const plataformaMatch = plataforma.trim() === "" || 
        (item.platform || "").toLowerCase().includes(plataforma.toLowerCase());
      
      // Filtro por data de abertura (a partir de)
      let aberturaMatch = true;
      if (dataAbertura) {
        try {
          const abertura = new Date(item.openDate);
          const filtroAbertura = new Date(dataAbertura);
          if (!isNaN(abertura.getTime()) && !isNaN(filtroAbertura.getTime())) {
            aberturaMatch = abertura >= filtroAbertura;
          }
        } catch (error) {
          console.log('Erro ao filtrar por data de abertura:', error);
        }
      }
      
      // Filtro por data de fechamento (até)
      let fechamentoMatch = true;
      if (dataFechamento) {
        try {
          const fechamento = new Date(item.closeDate);
          const filtroFechamento = new Date(dataFechamento);
          if (!isNaN(fechamento.getTime()) && !isNaN(filtroFechamento.getTime())) {
            fechamentoMatch = fechamento <= filtroFechamento;
          }
        } catch (error) {
          console.log('Erro ao filtrar por data de fechamento:', error);
        }
      }
      
      // Filtro por câmbio mínimo
      let cambioMinMatch = true;
      if (cambioMin.trim()) {
        const minValue = parseFloat(cambioMin);
        if (!isNaN(minValue) && item.exchangeRate !== undefined) {
          cambioMinMatch = item.exchangeRate >= minValue;
        }
      }
      
      // Filtro por câmbio máximo
      let cambioMaxMatch = true;
      if (cambioMax.trim()) {
        const maxValue = parseFloat(cambioMax);
        if (!isNaN(maxValue) && item.exchangeRate !== undefined) {
          cambioMaxMatch = item.exchangeRate <= maxValue;
        }
      }
      
      // Filtro por número de itens
      let itemCountMatch = true;
      if (itemCount.trim()) {
        const countValue = parseInt(itemCount);
        if (!isNaN(countValue)) {
          itemCountMatch = (item.itemCount || 0) >= countValue;
        }
      }
      
      // Filtro por rating do vendedor
      let ratingMatch = true;
      if (rating.trim()) {
        const ratingValue = parseFloat(rating);
        if (!isNaN(ratingValue) && item.seller?.rating !== undefined) {
          ratingMatch = item.seller.rating >= ratingValue;
        }
      }
      
      // Filtro por província
      let provinciaMatch = true;
      if (provincia.trim()) {
        provinciaMatch = (item.province || "").toLowerCase().includes(provincia.toLowerCase());
      }
      
      // Filtro por local de entrega
      let localEntregaMatch = true;
      if (localEntrega.trim()) {
        localEntregaMatch = (item.pickupLocation || "").toLowerCase().includes(localEntrega.toLowerCase());
      }
      
      return nomeMatch && vendedorMatch && plataformaMatch && 
             aberturaMatch && fechamentoMatch && cambioMinMatch && 
             cambioMaxMatch && itemCountMatch && ratingMatch &&
             provinciaMatch && localEntregaMatch;
    });
  }, [carrinhos, search, vendedor, plataforma, dataAbertura, dataFechamento, 
      cambioMin, cambioMax, itemCount, rating, provincia, localEntrega, modoTeste]);

  const renderItem = ({ item }) => {
    // Verificar se o carrinho está fechado
    const isFechado = item.status === 'fechado' || 
                     item.status === 'closed' || 
                     item.isActive === false ||
                     item.isClosed;
    
    return (
      <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.cardTouchable}>
        <View style={[styles.cardBox, isFechado && styles.cardBoxClosed]}>
          {/* 🧪 Badge de Status - Só aparece no modo teste */}
          {modoTeste && (
            <View style={[styles.statusBadge, isFechado ? styles.statusBadgeClosed : styles.statusBadgeActive]}>
              <Text style={[styles.statusBadgeText, isFechado && styles.statusBadgeTextClosed]}>
                {isFechado ? '🔒 FECHADO' : '✅ ATIVO'}
              </Text>
            </View>
          )}
          
          <Image
            source={{ uri: `${BASE_URL}/${item.imageUrls?.[0]?.replace(/\\/g, "/")}` }}
            style={[styles.cardImage, isFechado && styles.cardImageClosed]}
            resizeMode="cover"
          />
          <View style={styles.cardInfoBox}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, isFechado && styles.cardTitleClosed]}>{item.cartName}</Text>
              <View style={[styles.cardTag, styles[`tag${item.platform}`]]}>
                <Text style={styles.cardTagText}>{item.platform}</Text>
              </View>
            </View>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Abertura:</Text> {item.openDate ? new Date(item.openDate).toLocaleDateString() : "-"}</Text>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Fechamento:</Text> {item.closeDate ? new Date(item.closeDate).toLocaleDateString() : "-"}</Text>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Câmbio:</Text> {item.exchangeRate ? formatNumber(item.exchangeRate) + " AOA" : "-"}</Text>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Itens:</Text> {item.itemCount ?? 0}</Text>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Província:</Text> {item.province ?? "-"}</Text>
          <Text style={styles.cardText}><Text style={styles.cardLabel}>Local de Entrega:</Text> {item.pickupLocation ?? "-"}</Text>
          <View style={styles.cardInfoSeparator} />
          <View style={styles.cardVendedorBox}>
            <Text style={styles.cardLabel}>Vendedor:</Text>
            <Text style={styles.cardVendedorText}>{item.seller?.name ?? '-'}</Text>
          </View>
          <View style={styles.cardRatingRowBelow}>
            <Text style={styles.cardLabel}>Rating:</Text>
            <Text style={styles.cardRatingValue}>{item.seller?.rating ? item.seller.rating.toFixed(2) : '-'}</Text>
            <Text style={styles.cardStar}>★</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={22} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Todos os Carrinhos</Text>
        </View>
        {/* Barra de pesquisa */}
        <View style={styles.searchBox}>
          <MagnifyingGlass size={18} color="#878787" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar carrinho"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#878787"
          />
        </View>
        {/* Botão de filtro */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.filterButtonText}>
              Filtros {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Text>
          </TouchableOpacity>
          
          {/* 🧪 Botão de Teste - Remove quando não precisar mais */}
          <TouchableOpacity 
            style={[styles.testButton, modoTeste && styles.testButtonActive]} 
            onPress={toggleModoTeste}
          >
            <Text style={[styles.testButtonText, modoTeste && styles.testButtonTextActive]}>
              🧪 {modoTeste ? 'Sair Teste' : 'Modo Teste'}
            </Text>
          </TouchableOpacity>
          
          {getActiveFiltersCount() > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Modal de filtros */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
              {/* Data de abertura */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Abertura a partir de:</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDateAbertura(true)}>
                  <Text style={{ color: dataAbertura ? '#222' : '#878787' }}>
                    {dataAbertura ? new Date(dataAbertura).toLocaleDateString() : 'Selecionar data'}
                  </Text>
                </TouchableOpacity>
                {showDateAbertura && (
                  <DateTimePicker
                    value={dataAbertura ? new Date(dataAbertura) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    textColor="#000000"
                    accentColor="#000000"
                    themeVariant="light"
                    onChange={(event, date) => {
                      setShowDateAbertura(false);
                      if (date) setDataAbertura(date.toISOString());
                    }}
                  />
                )}
              </View>
              {/* Data de fechamento */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Fechamento até:</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDateFechamento(true)}>
                  <Text style={{ color: dataFechamento ? '#222' : '#878787' }}>
                    {dataFechamento ? new Date(dataFechamento).toLocaleDateString() : 'Selecionar data'}
                  </Text>
                </TouchableOpacity>
                {showDateFechamento && (
                  <DateTimePicker
                    value={dataFechamento ? new Date(dataFechamento) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    textColor="#5b000078"
                    accentColor="#414040ff"
                    themeVariant="light"
                    onChange={(event, date) => {
                      setShowDateFechamento(false);
                      if (date) setDataFechamento(date.toISOString());
                    }}
                  />
                )}
              </View>
              {/* Plataforma */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Plataforma:</Text>
                <View style={styles.dropdownBox}>
                  <TextInput
                    style={styles.dropdownInput}
                    placeholder="Selecionar plataforma"
                    value={plataforma}
                    onChangeText={setPlataforma}
                    placeholderTextColor="#878787"
                  />
                </View>
              </View>
              {/* Vendedor */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Vendedor:</Text>
                <TextInput
                  style={styles.filtroInput}
                  placeholder="Nome do vendedor"
                  value={vendedor}
                  onChangeText={setVendedor}
                  placeholderTextColor="#878787"
                />
              </View>
              {/* Câmbio */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Câmbio (AOA):</Text>
                <View style={styles.cambioRow}>
                  <TextInput
                    style={styles.cambioInput}
                    placeholder="Min"
                    value={cambioMin}
                    onChangeText={setCambioMin}
                    keyboardType="numeric"
                    placeholderTextColor="#878787"
                  />
                  <Text style={{ marginHorizontal: 6, color: '#878787' }}>-</Text>
                  <TextInput
                    style={styles.cambioInput}
                    placeholder="Max"
                    value={cambioMax}
                    onChangeText={setCambioMax}
                    keyboardType="numeric"
                    placeholderTextColor="#878787"
                  />
                </View>
              </View>
              {/* Número de itens */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Número de itens:</Text>
                <View style={styles.dropdownBox}>
                  <TextInput
                    style={styles.dropdownInput}
                    placeholder="Todos"
                    value={itemCount}
                    onChangeText={setItemCount}
                    placeholderTextColor="#878787"
                  />
                </View>
              </View>
              {/* Rating do vendedor */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Rating do vendedor:</Text>
                <View style={styles.dropdownBox}>
                  <TextInput
                    style={styles.dropdownInput}
                    placeholder="Todos"
                    value={rating}
                    onChangeText={setRating}
                    placeholderTextColor="#878787"
                  />
                </View>
              </View>
              {/* Província */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Província:</Text>
                <TextInput
                  style={styles.filtroInput}
                  placeholder="Digite a província"
                  value={provincia}
                  onChangeText={setProvincia}
                  placeholderTextColor="#878787"
                />
              </View>
              {/* Local de Entrega */}
              <View style={styles.modalField}>
                <Text style={styles.filtroLabel}>Local de Entrega:</Text>
                <TextInput
                  style={styles.filtroInput}
                  placeholder="Digite o local de entrega"
                  value={localEntrega}
                  onChangeText={setLocalEntrega}
                  placeholderTextColor="#878787"
                />
              </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalButton} 
                  onPress={() => {
                    setModalVisible(false);
                    // Os filtros são aplicados automaticamente via useMemo
                  }}
                >
                  <Text style={styles.modalButtonText}>Aplicar</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.modalButtonCancel]} 
                  onPress={() => {
                    clearAllFilters();
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#878787' }]}>Limpar Tudo</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, styles.modalButtonCancel]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: '#878787' }]}>Fechar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Indicador de resultados */}
        {!loading && (
          <View style={styles.resultsIndicator}>
            <Text style={styles.resultsText}>
              {filteredCarrinhos.length} de {carrinhos.length} carrinhos
              {getActiveFiltersCount() > 0 && ` (${getActiveFiltersCount()} filtro${getActiveFiltersCount() > 1 ? 's' : ''} ativo${getActiveFiltersCount() > 1 ? 's' : ''})`}
            </Text>
          </View>
        )}

        {/* 🧪 Indicador de modo teste e contagem */}
        {modoTeste && (
          <View style={styles.testIndicator}>
            <Text style={styles.testIndicatorText}>
              🧪 MODO TESTE: Mostrando todos os carrinhos (ativos e fechados)
            </Text>
          </View>
        )}
        
        <View style={styles.countersContainer}>
          <Text style={styles.counterText}>
            Mostrando: {filteredCarrinhos.length} carrinho{filteredCarrinhos.length !== 1 ? 's' : ''}
            {modoTeste && (
              <Text style={{ color: '#28a745' }}>
                {' '}(Ativos: {carrinhos.filter(item => 
                  item.status !== 'fechado' && 
                  item.status !== 'closed' && 
                  item.isActive !== false &&
                  !item.isClosed
                ).length}, Fechados: {carrinhos.filter(item => 
                  item.status === 'fechado' || 
                  item.status === 'closed' || 
                  item.isActive === false ||
                  item.isClosed
                ).length})
              </Text>
            )}
          </Text>
        </View>

        {/* Lista de carrinhos */}
        {loading ? (
          <Text style={{ textAlign: 'center', marginTop: 40 }}>Carregando carrinhos...</Text>
        ) : (
          <FlatList
            data={filteredCarrinhos}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.flatListContentContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  cardInfoSeparator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
    borderRadius: 2,
  },
  cardRowSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
    cardRatingRowBelow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      marginBottom: 2,
    },
  cardVendedorBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardVendedorText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#222',
    fontWeight: '400',
  },
  dateInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dropdownBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  dropdownInput: {
    height: 38,
    fontSize: 15,
    color: '#222',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  cambioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cambioInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    height: 38,
    width: 70,
    fontSize: 15,
    color: '#222',
    paddingHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 22,
    width: '85%',
    maxHeight: '80%', // Limita a altura máxima do modal
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  modalScrollView: {
    maxHeight: 400, // Altura máxima do scroll
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalField: {
    marginBottom: 14,
  },
  filtroLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
    marginBottom: 4,
  },
  filtroInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#222',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  modalButton: {
    backgroundColor: '#704F38',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    minWidth: 80,
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F7',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 4,
    marginRight: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222',
    marginLeft: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  clearButton: {
    backgroundColor: '#704F38',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F7',
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#704F38',
    textAlign: 'center',
    fontWeight: '500',
  },
  filterButtonText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '400',
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF", 
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: STATUSBAR_HEIGHT + 16,
    alignItems: "center",
    flexDirection: "row"
  },
  headerText: {
    fontSize: 24,
    fontWeight: "300",
    margin: 16,
  },
  searchInput: {
    height: 40,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  itemImage: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 8, // Adicione um borderRadius se as imagens deveriam ter cantos arredondados
  },
  cardTouchable: {
    marginBottom: 18,
  },
  cardBox: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    marginHorizontal: 12,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: "#F7F7F7",
    top: -30,
  },
  cardInfoBox: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
    marginRight: 8,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
    backgroundColor: "#EEE",
  },
  tagShein: { backgroundColor: "#E6E6FA" },
  tagZara: { backgroundColor: "#F0F0F0" },
  tagAliExpress: { backgroundColor: "#FFE4E1" },
  tagH_M: { backgroundColor: "#E0F7FA" },
  cardTagText: {
    fontSize: 12,
    color: "#704F38",
    fontWeight: "bold",
  },
  cardText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
  },
  cardLabel: {
    fontWeight: "500",
    color: "#704F38",
  },
  cardRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  cardRatingValue: {
    fontSize: 14,
    color: "#704F38",
    fontWeight: "bold",
    marginLeft: 4,
  },
  cardStar: {
    color: "#FFD700",
    fontSize: 16,
    marginLeft: 2,
    fontWeight: "bold",
  },
  searchIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    paddingRight: 10, // para garantir que o texto não sobreponha o ícone
    height: 40,
    fontSize: 16,
  },
  flatListContentContainer: {
    paddingBottom: 100, // Ajuste este valor conforme necessário
  },
  itemSpace: {
    paddingBottom: 3,
    color: "#878787"
  },
  itemTouchable: {

  },
  // 🧪 Estilos para o modo teste
  testButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  testButtonActive: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  testButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  testButtonTextActive: {
    color: '#fff',
  },
  testIndicator: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 10,
    marginBottom: 5,
  },
  testIndicatorText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  countersContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    margin: 10,
    marginTop: 5,
  },
  counterText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  // 🧪 Estilos para carrinhos fechados
  cardBoxClosed: {
    opacity: 0.7,
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  cardImageClosed: {
    opacity: 0.6,
  },
  cardTitleClosed: {
    color: '#6c757d',
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#28a745',
  },
  statusBadgeClosed: {
    backgroundColor: '#dc3545',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadgeTextClosed: {
    color: '#fff',
  },
  // Adicione estilos adicionais se necessário
});

export default CarrinhosScreen;
