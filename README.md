# Dashboard de Gestão de Pátio - Oficina Mecânica CHEVRON

## 📋 Sobre o Projeto

Sistema completo de gestão de pátio para oficina mecânica CHEVRON Bosch Car Service. O dashboard oferece controle total sobre ordens de serviço, desde a entrada do veículo até a entrega final, com interface Kanban intuitiva e sistema de alertas em tempo real.

## 🚀 Funcionalidades Principais

### ✅ Gestão de Ordens de Serviço
- **Criação e edição** de O.S. com informações completas do veículo e cliente
- **Sistema Kanban** com 8 status diferentes para acompanhamento visual
- **Movimentação rápida** entre status com botões de navegação
- **Busca e filtros** para localização rápida de veículos

### ✅ Sistema de Usuários
- **Login por perfil** (Gestor, Atendente, Mecânico)
- **Controle de responsabilidades** por status e função
- **Rastreamento de ações** com identificação do usuário

### ✅ Painel de Alertas Inteligente
- **Monitoramento em tempo real** de status críticos
- **Alertas visuais** com LED piscante e animações
- **Painel retrátil** para otimização do espaço
- **Acesso direto** aos veículos em situação de atenção

### ✅ Histórico e Timeline
- **Registro completo** de todas as ações realizadas
- **Timeline visual** com ícones diferenciados por tipo de ação
- **Controle de peças** e valores utilizados
- **Timestamps precisos** de todas as operações

### ✅ Galeria de Mídia
- **Upload de fotos e vídeos** via câmera ou galeria
- **Visualização em lightbox** com navegação
- **Armazenamento em nuvem** via ImgBB
- **Download e compartilhamento** de mídias

### ✅ Interface Responsiva
- **Design mobile-first** para uso em tablets e smartphones
- **Layout adaptativo** que funciona em qualquer dispositivo
- **Otimização touch** para interações em tela sensível ao toque

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Tailwind CSS
- **Ícones**: Boxicons
- **Fontes**: Google Fonts (Roboto, Orbitron)
- **Backend**: Firebase Realtime Database
- **Storage**: ImgBB API para hospedagem de imagens
- **Responsividade**: CSS Grid e Flexbox

## 📁 Estrutura do Projeto

```
dashboard-oficina-chevron/
├── index.html              # Página principal
├── css/
│   └── styles.css          # Estilos customizados
├── js/
│   └── app.js             # Lógica principal da aplicação
├── assets/                # Recursos estáticos (imagens, ícones)
├── docs/                  # Documentação adicional
└── README.md              # Este arquivo
```

## 🔧 Configuração e Instalação

### Pré-requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexão com internet para CDNs e APIs

### Instalação Local
1. **Clone ou baixe** o projeto
2. **Abra** o arquivo `index.html` em um navegador
3. **Configure** as credenciais do Firebase (se necessário)
4. **Teste** todas as funcionalidades

### Configuração do Firebase
O projeto já vem configurado com uma instância do Firebase. Para usar sua própria instância:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o Realtime Database
4. Substitua as credenciais em `js/app.js`:

```javascript
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Configuração do ImgBB
Para upload de imagens, configure sua chave da API ImgBB:

1. Acesse [ImgBB API](https://api.imgbb.com/)
2. Obtenha sua chave de API
3. Substitua em `js/app.js`:

```javascript
const imgbbApiKey = "sua-chave-imgbb";
```

## 👥 Sistema de Usuários

### Perfis Disponíveis
- **Augusto** - Gestor
- **William Barbosa** - Atendente  
- **Thiago Ventura Valencio** - Atendente
- **Fernando** - Mecânico
- **Gustavo** - Mecânico
- **Marcelo** - Mecânico

### Permissões por Perfil
- **Gestores**: Acesso completo a todas as funcionalidades
- **Atendentes**: Criação de O.S., movimentação de status, registros
- **Mecânicos**: Visualização, registros de serviços, movimentação específica

## 📊 Status das Ordens de Serviço

1. **Aguardando Mecânico** - Veículo aguarda análise inicial
2. **Em Análise** - Mecânico realizando diagnóstico
3. **Orçamento Enviado** - Orçamento elaborado e enviado ao cliente
4. **Aguardando Aprovação** - Cliente analisando proposta
5. **Serviço Autorizado** - Cliente aprovou, serviço pode iniciar
6. **Em Execução** - Serviços sendo realizados
7. **Finalizado Aguardando Retirada** - Serviço concluído
8. **Entregue** - Veículo entregue ao cliente

## 🎨 Personalização Visual

### Cores por Status
- **Aguardando Mecânico**: Amarelo (#f59e0b)
- **Em Análise**: Roxo (#8b5cf6)
- **Orçamento Enviado**: Ciano (#06b6d4)
- **Aguardando Aprovação**: Magenta (#d946ef)
- **Serviço Autorizado**: Verde (#10b981)
- **Em Execução**: Vermelho (#ef4444)
- **Finalizado**: Laranja (#f97316)
- **Entregue**: Cinza (#6b7280)

### Temas e Estilos
- **Painel de Alertas**: Tema escuro com fonte Orbitron
- **Cards**: Design clean com sombras suaves
- **Modais**: Layout moderno com backdrop blur
- **Animações**: Transições suaves e feedback visual

## 📱 Compatibilidade Mobile

### Recursos Mobile
- **Layout responsivo** que se adapta a qualquer tela
- **Touch gestures** otimizados para dispositivos móveis
- **Câmera integrada** para captura direta de fotos
- **Interface simplificada** em telas menores

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

## 🔒 Segurança e Backup

### Medidas de Segurança
- **Validação client-side** de todos os formulários
- **Sanitização** de dados de entrada
- **Controle de acesso** por perfil de usuário
- **Logs de auditoria** de todas as ações

### Backup de Dados
- **Firebase Realtime Database** com backup automático
- **Exportação manual** disponível via console Firebase
- **Redundância** em múltiplas regiões

## 🚀 Deploy e Hospedagem

### Opções de Deploy
1. **GitHub Pages** - Gratuito para projetos públicos
2. **Netlify** - Deploy automático com CI/CD
3. **Vercel** - Otimizado para aplicações frontend
4. **Firebase Hosting** - Integração nativa com Firebase

### Configuração para Produção
1. **Minifique** os arquivos CSS e JS
2. **Otimize** as imagens para web
3. **Configure** HTTPS obrigatório
4. **Teste** em diferentes dispositivos e navegadores

## 📈 Métricas e Analytics

### KPIs Monitorados
- **Tempo médio** por status
- **Volume de O.S.** por período
- **Performance** por mecânico
- **Taxa de conclusão** de serviços

### Relatórios Disponíveis
- **Dashboard executivo** com métricas principais
- **Relatório de produtividade** por usuário
- **Análise de tempo** por tipo de serviço
- **Histórico completo** de movimentações

## 🛠️ Manutenção e Suporte

### Atualizações Regulares
- **Backup** antes de qualquer alteração
- **Teste** em ambiente de desenvolvimento
- **Deploy gradual** para produção
- **Monitoramento** pós-deploy

### Troubleshooting Comum
- **Erro de conexão**: Verificar credenciais Firebase
- **Upload falha**: Verificar chave ImgBB
- **Layout quebrado**: Limpar cache do navegador
- **Performance lenta**: Otimizar consultas ao banco

## 📞 Suporte Técnico

### Contatos
- **Desenvolvedor**: Disponível para customizações
- **Documentação**: README.md e comentários no código
- **Issues**: Reporte bugs via GitHub Issues
- **Updates**: Acompanhe releases no repositório

### Customizações Disponíveis
- **Novos status** de O.S.
- **Campos adicionais** nos formulários
- **Relatórios personalizados**
- **Integrações** com outros sistemas
- **Temas visuais** customizados

## 📄 Licença

Este projeto foi desenvolvido especificamente para a Oficina CHEVRON Bosch Car Service. Todos os direitos reservados.

---

**Versão**: 2.0  
**Última Atualização**: Dezembro 2024  
**Compatibilidade**: Navegadores modernos (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

