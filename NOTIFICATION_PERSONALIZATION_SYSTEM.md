# Sistema de Personalização de Notificações - GoandBuy

## Visão Geral
Implementamos um sistema completo de personalização para notificações que inclui:
- **Ícones específicos** para cada tipo de notificação
- **Cores temáticas** para identificação visual rápida
- **Navegação inteligente** baseada no tipo de notificação
- **Sistema de fallback** para notificações sem tipo definido

## Tipos de Notificações Identificados

### 1. **`pedido`** - Novo Pedido
- **Ícone:** 🛍️ ShoppingBag
- **Cor:** Azul (#2563EB)
- **Navegação:** OrderScreen1 (tela de gerenciamento de pedidos para vendedor)
- **Contexto:** Quando um comprador faz um novo pedido

### 2. **`comprovativo`** - Comprovativo de Pagamento
- **Ícone:** 🧾 Receipt
- **Cor:** Verde (#059669)
- **Navegação:** DetailOrder (detalhes do pedido específico)
- **Contexto:** Quando um comprovativo de pagamento é enviado

### 3. **`status`** - Atualização de Status
- **Ícone:** ℹ️ Info
- **Cor:** Laranja (#EA580C)
- **Navegação:** MyOrder (meus pedidos para comprador)
- **Contexto:** Quando o status de um pedido é atualizado

### 4. **`message`** - Nova Mensagem
- **Ícone:** 💬 ChatCircle
- **Cor:** Roxo (#7C3AED)
- **Navegação:** CompradorChatScreen (tela de chat)
- **Contexto:** Novas mensagens no sistema de chat

### 5. **`feedback`** - Feedback/Avaliação
- **Ícone:** ⭐ Star
- **Cor:** Vermelho (#DC2626)
- **Navegação:** MyCartDetailScreen (detalhes do carrinho finalizado)
- **Contexto:** Quando um pedido é finalizado sem feedback

### 6. **`carrinho`** - Carrinho
- **Ícone:** 🛒 ShoppingCart
- **Cor:** Ciano (#0891B2)
- **Navegação:** CarrinhosScreen (lista de carrinhos)
- **Contexto:** Atualizações relacionadas a carrinhos

### 7. **`token_refresh`** - Atualização de Sistema
- **Ícone:** 🔄 ArrowsClockwise
- **Cor:** Cinza (#6B7280)
- **Navegação:** Nenhuma (apenas informativo)
- **Contexto:** Atualizações automáticas do sistema

### 8. **`teste`** - Notificação de Teste
- **Ícone:** 🧪 FlaskEmpty
- **Cor:** Roxo claro (#8B5CF6)
- **Navegação:** Comportamento padrão
- **Contexto:** Testes do sistema de notificações

### 9. **`rating`** - Nova Avaliação Recebida
- **Ícone:** ⭐ Star
- **Cor:** Dourado (#F59E0B)
- **Navegação:** MyCartDetailScreen (ver detalhes do carrinho avaliado)
- **Contexto:** Quando um comprador avalia o vendedor com estrelas

## Funcionalidades Implementadas

### 🎨 **Personalização Visual**
- Cada tipo tem ícone único e cor específica
- Indicador visual de não lidas com cor do tipo
- Background colorido para os ícones
- Texto de ação personalizado para cada tipo

### 🧭 **Navegação Inteligente**
- Navegação específica baseada no tipo da notificação
- Passa dados relevantes (cartId, orderId, conversationId)
- Sistema de fallback para navegação genérica
- Busca dados atualizados antes da navegação quando necessário

### 🔍 **Sistema de Fallback**
- Análise de conteúdo para notificações sem tipo
- Mapeamento por palavras-chave no título/descrição
- Navegação segura com fallback para Home

### 📊 **Estatísticas**
- Contagem de notificações por tipo
- Separação entre lidas e não lidas
- Função para estatísticas visuais (preparada para uso futuro)

## Estrutura do Código

### `getNotificationConfig(type)`
Retorna configuração específica para cada tipo:
```javascript
{
    icon: 'ShoppingBag',     // Nome do ícone
    color: '#2563EB',        // Cor principal
    bgColor: '#EFF6FF',      // Cor de fundo
    title: 'Novo Pedido',    // Título amigável
    action: 'Visualizar pedido' // Texto da ação
}
```

### `handleNotificationPress(notification)`
Processa clique na notificação:
1. Marca como lida
2. Identifica o tipo
3. Navega para tela apropriada
4. Passa dados relevantes

### `navigateToCart(cartId, preferredScreen)`
Navegação inteligente para carrinhos:
- Busca dados atualizados
- Respeita tela preferida
- Fallback em caso de erro

### `renderIcon(type, size)`
Renderiza ícone baseado no tipo:
- Suporte a todos os tipos implementados
- Ícone padrão para tipos desconhecidos
- Configuração dinâmica de cor e tamanho

## Como Usar

### Para Desenvolvedores Backend
Ao criar notificações, sempre especifique o tipo:

```javascript
await sendNotification({
    userId: compradorId,
    sender: vendedorId,
    type: 'pedido',           // ← IMPORTANTE: Especificar tipo
    title: 'Novo pedido recebido',
    message: 'Você recebeu um novo pedido.',
    data: { 
        cartId: cartId,       // ← Dados relevantes
        orderId: orderId 
    },
    io
});
```

### Para Desenvolvedores Frontend
O sistema funciona automaticamente. Para adicionar novos tipos:

1. Adicione configuração em `getNotificationConfig()`
2. Importe ícone necessário do phosphor-react-native
3. Adicione caso no `switch` de `handleNotificationPress()`
4. Adicione caso no `renderIcon()` se necessário

## Melhorias Futuras

### 🔔 **Push Notifications**
- Aplicar mesma personalização para push notifications
- Ícones e cores nas notificações push

### 📈 **Analytics**
- Dashboard de estatísticas de notificações
- Métricas de engajamento por tipo

### 🎛️ **Configurações**
- Permitir usuário personalizar cores
- Opções de desabilitar tipos específicos

### 🌐 **Internacionalização**
- Suporte a múltiplos idiomas
- Textos de ação localizados

## Testes Necessários

- [ ] Navegação para cada tipo de notificação
- [ ] Passagem correta de parâmetros
- [ ] Comportamento com dados ausentes
- [ ] Sistema de fallback
- [ ] Performance com muitas notificações
- [ ] Compatibilidade com diferentes tamanhos de tela

## Estrutura de Dados Esperada

```javascript
{
    id: "notification_id",
    type: "pedido",           // Tipo da notificação
    title: "Título",
    description: "Descrição",
    data: {                   // Dados específicos do tipo
        cartId: "cart_id",
        orderId: "order_id",
        conversationId: "conv_id"
    },
    read: false,
    createdAt: "2025-01-01T00:00:00Z"
}
```

---

**Desenvolvido para o projeto GoandBuy**  
*Sistema implementado em: NotificationsScreen.js*