import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, ClipboardText, Handshake, Package, AirplaneTakeoff, Truck } from 'phosphor-react-native';

const statusToIcon = {
  'feito': ClipboardText,
  'aceite': Handshake,
  'em progresso': Package,
  'enviado': AirplaneTakeoff,
  'entregue': Truck,
};

const OrderProgress = ({ status }) => {
  const orderStatuses = ['feito', 'aceite', 'em progresso', 'enviado', 'entregue'];

  const getStatusIcon = (currentStatus, iconStatus) => {
    const Icon = statusToIcon[iconStatus];
    return <Icon color={currentStatus === iconStatus ? "#704F38" : "#E0E0E0"} size={35} />;
  };

  return (
    <View style={styles.progressContainer}>
      {orderStatuses.map((iconStatus, index) => (
        <View key={iconStatus} style={styles.state}>
          <View style={styles.stateDetails}>
            <CheckCircle weight="fill" color={status === iconStatus ? "#704F38" : "#E0E0E0"} size={40} />
            <View style={styles.stateText}>
              <Text style={styles.actualState}>
                {iconStatus.charAt(0).toUpperCase() + iconStatus.slice(1)}
              </Text>
              {/* Remova o Text para stateDate se não for usado */}
            </View>
          </View>
          {getStatusIcon(status, iconStatus)}
          {index !== orderStatuses.length - 1 && <View style={styles.verticalLine} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  stateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateText: {
    marginLeft: 10,
  },
  actualState: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#704F38',
  },
  verticalLine: {
    height: 50,
    width: 2,
    backgroundColor: '#E0E0E0',
    position: 'absolute',
    left: '50%',
    zIndex: -1,
  },
  // Adicione outros estilos conforme necessário
});

export default OrderProgress;
