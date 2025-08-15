# Guia de Instalação - Dashboard CHEVRON

## 🚀 Instalação Rápida (Recomendada)

### Opção 1: Uso Direto
1. **Baixe** o arquivo ZIP do projeto
2. **Extraia** em uma pasta de sua escolha
3. **Abra** o arquivo `index.html` em um navegador moderno
4. **Pronto!** O sistema já está funcionando

### Opção 2: Servidor Local
```bash
# Se tiver Python instalado
cd dashboard-oficina-chevron
python -m http.server 8000

# Ou se tiver Node.js
npx serve .

# Acesse: http://localhost:8000
```

## 🌐 Deploy em Produção

### GitHub Pages (Gratuito)
1. **Crie** um repositório no GitHub
2. **Faça upload** dos arquivos do projeto
3. **Vá** em Settings > Pages
4. **Selecione** branch main como source
5. **Aguarde** alguns minutos para ativação
6. **Acesse** via URL fornecida pelo GitHub

### Netlify (Recomendado)
1. **Acesse** [netlify.com](https://netlify.com)
2. **Arraste** a pasta do projeto para o deploy
3. **Aguarde** o processamento
4. **Receba** URL personalizada
5. **Configure** domínio próprio (opcional)

### Vercel
1. **Instale** Vercel CLI: `npm i -g vercel`
2. **Execute** `vercel` na pasta do projeto
3. **Siga** as instruções no terminal
4. **Acesse** URL fornecida

### Firebase Hosting
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto
firebase init hosting

# Deploy
firebase deploy
```

## ⚙️ Configuração Avançada

### Configurando Firebase Próprio

#### 1. Criar Projeto Firebase
1. **Acesse** [console.firebase.google.com](https://console.firebase.google.com)
2. **Clique** "Adicionar projeto"
3. **Nomeie** o projeto (ex: oficina-chevron-2024)
4. **Desabilite** Google Analytics (opcional)
5. **Clique** "Criar projeto"

#### 2. Configurar Realtime Database
1. **No console**, vá em "Realtime Database"
2. **Clique** "Criar banco de dados"
3. **Escolha** localização (Brasil: southamerica-east1)
4. **Inicie** em modo de teste
5. **Anote** a URL do banco (ex: https://projeto-default-rtdb.firebaseio.com)

#### 3. Obter Credenciais
1. **Vá** em Configurações do projeto (ícone engrenagem)
2. **Role** até "Seus aplicativos"
3. **Clique** no ícone web (</>)
4. **Registre** o app com nome "Dashboard Oficina"
5. **Copie** as credenciais fornecidas

#### 4. Atualizar Código
Edite o arquivo `js/app.js` e substitua:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Configurando ImgBB Próprio

#### 1. Criar Conta ImgBB
1. **Acesse** [imgbb.com](https://imgbb.com)
2. **Crie** uma conta gratuita
3. **Vá** em "API" no menu
4. **Copie** sua chave de API

#### 2. Atualizar Código
No arquivo `js/app.js`, substitua:

```javascript
const imgbbApiKey = "SUA_CHAVE_IMGBB_AQUI";
```

## 🔒 Configurações de Segurança

### Regras do Firebase Database
No console Firebase, vá em Database > Regras e configure:

```json
{
  "rules": {
    "serviceOrders": {
      ".read": true,
      ".write": true
    }
  }
}
```

**⚠️ Importante**: Para produção, implemente regras mais restritivas com autenticação.

### HTTPS Obrigatório
- **GitHub Pages**: HTTPS automático
- **Netlify**: HTTPS automático  
- **Vercel**: HTTPS automático
- **Servidor próprio**: Configure certificado SSL

## 📱 Configuração Mobile

### PWA (Progressive Web App)
Para transformar em app instalável, adicione ao `index.html`:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#3b82f6">
```

Crie `manifest.json`:
```json
{
  "name": "Dashboard CHEVRON",
  "short_name": "CHEVRON",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🛠️ Customizações

### Alterando Usuários
No arquivo `js/app.js`, modifique o array `USERS`:

```javascript
const USERS = [
  { name: 'Seu Nome', role: 'Gestor' },
  { name: 'Funcionário 1', role: 'Atendente' },
  // Adicione mais usuários conforme necessário
];
```

### Adicionando Status
Modifique o array `STATUS_LIST`:

```javascript
const STATUS_LIST = [
  'Aguardando-Mecanico',
  'Em-Analise',
  'Novo-Status-Aqui', // Adicione aqui
  'Orcamento-Enviado',
  // ... resto dos status
];
```

### Personalizando Cores
No arquivo `css/styles.css`, adicione:

```css
.vehicle-card.status-Novo-Status-Aqui { 
  border-left-color: #sua-cor-hex; 
}
```

## 🔧 Troubleshooting

### Problemas Comuns

#### Firebase não conecta
- **Verifique** credenciais no `js/app.js`
- **Confirme** URL do database
- **Teste** regras de segurança

#### ImgBB falha no upload
- **Verifique** chave da API
- **Confirme** limite de upload (32MB)
- **Teste** conexão com internet

#### Layout quebrado
- **Limpe** cache do navegador
- **Verifique** CDNs do Tailwind e Boxicons
- **Teste** em modo incógnito

#### Performance lenta
- **Otimize** imagens antes do upload
- **Limite** número de O.S. simultâneas
- **Use** CDN para assets estáticos

### Logs de Debug
Adicione ao `js/app.js` para debug:

```javascript
// No início do arquivo
console.log('Dashboard iniciado');

// Nas funções principais
console.log('Dados carregados:', allServiceOrders);
```

## 📊 Monitoramento

### Firebase Analytics
1. **Ative** Analytics no console Firebase
2. **Adicione** código de tracking
3. **Monitore** uso em tempo real

### Google Analytics
Adicione ao `<head>` do `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## 🔄 Backup e Restauração

### Backup Manual
1. **Acesse** console Firebase
2. **Vá** em Database
3. **Clique** nos 3 pontos > "Exportar JSON"
4. **Salve** arquivo em local seguro

### Backup Automático
Configure via Firebase CLI:

```bash
# Exportar dados
firebase database:get / --output backup.json

# Importar dados
firebase database:set / backup.json
```

### Restauração
1. **Acesse** console Firebase
2. **Vá** em Database
3. **Clique** nos 3 pontos > "Importar JSON"
4. **Selecione** arquivo de backup

## 📈 Otimização

### Performance
- **Minifique** CSS e JS para produção
- **Otimize** imagens (WebP quando possível)
- **Use** lazy loading para mídias
- **Implemente** service worker para cache

### SEO (se aplicável)
```html
<meta name="description" content="Dashboard de gestão para oficina mecânica">
<meta name="keywords" content="oficina, gestão, dashboard, mecânica">
<meta property="og:title" content="Dashboard CHEVRON">
<meta property="og:description" content="Sistema de gestão de pátio">
```

## 🆘 Suporte Técnico

### Antes de Solicitar Suporte
1. **Consulte** este guia completo
2. **Verifique** console do navegador (F12)
3. **Teste** em navegador diferente
4. **Anote** mensagens de erro exatas

### Informações Necessárias
- **Versão** do navegador
- **Sistema operacional**
- **URL** onde está hospedado
- **Passos** para reproduzir problema
- **Screenshots** do erro

### Contatos
- **Email**: [seu-email@exemplo.com]
- **GitHub Issues**: [link-do-repositorio]
- **Documentação**: Este arquivo e README.md

---

**🎯 Dica Final**: Mantenha sempre um backup dos dados antes de fazer alterações importantes no sistema!

