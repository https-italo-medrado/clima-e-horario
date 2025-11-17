# 🌤️ clima e horário mundial

app web que mostra clima e horário de qualquer lugar do mundo. feito com node.js e javascript

## o que faz

- busca clima por cidade
- mostra horário mundial
- funciona no celular
- atualiza sozinho

## como usar

1. instale as dependências:
   ```bash
   npm install
   ```

2. rode o servidor:
   ```bash
   npm start
   ```

3. abra no navegador:
   ```
   http://localhost:2040
   ```

## apis que usa

- **open-meteo**: pra dados do clima
- **worldtimeapi**: pra horário mundial

## rotas da api

- `GET /` - página principal
- `GET /api/weather/:city` - clima da cidade
- `GET /api/time/:timezone` - horário do fuso
- `GET /api/timezones` - lista de fusos
- `GET /api/weather-time/:city/:timezone` - clima e horário juntos

## tecnologias

- node.js
- express.js
- html/css/javascript
- mobile first

## estrutura

```
├── server.js       # servidor principal
├── package.json    # dependências
└── public/         # arquivos do front
    ├── index.html  # página
    ├── styles.css  # estilos
    └── script.js   # javascript
```

## como funciona

1. digite uma cidade
2. escolha um fuso horário
3. clique em buscar
4. vê o clima e horário

ou

1. clique em "usar localização"
2. permite acesso
3. vê seus dados locais

---

projeto feito pra faculdade. apis são gratuitas.
