// dependencias que usei
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// iniciando o express
const app = express();

// porta que to usando
const PORT = process.env.PORT || 2040;

// os middlewares que vou usar
app.use(cors()); // esse deixa receber requisicoes de diferentes lugares
app.use(express.json()); // deixa passar informações em JSON no body dos requiests
app.use(express.static('public')); // deixa a pasta public pra mostrar so arquivos estaticos

// rota principal pra o usuario ver a pagina principal
app.get('/', (req, res) => {
    // envia o html que ta na folder public
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// rota de teste pra verificar se o servidor ta funcionando
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Servidor funcionando!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// rota pra pegar os dados do clima de uma cidade especifica
app.get('/api/weather/:city', async (req, res) => {
    try {
        // pega o nome da cidade nos parametros da URL
        const city = req.params.city;
        
        // confere se a chave da api ta configurada
        
        // primeiro preciso pegar as coordenadas da cidade usando uma API de geocoding
        const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
        const geocodingResponse = await fetchWithTimeout(geocodingUrl);
        
        if (!geocodingResponse.ok) {
            throw new Error(`Erro na API de geocoding: ${geocodingResponse.status}`);
        }
        
        const geocodingData = await geocodingResponse.json();
        
        if (!geocodingData.results || geocodingData.results.length === 0) {
            return res.status(404).json({ 
                error: 'Cidade não encontrada' 
            });
        }
        
        const location = geocodingData.results[0];
        const { latitude, longitude } = location;

        // monta a url da api
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
        
        // faz a requisicao pra api externa
        const response = await fetchWithTimeout(weatherUrl);
        
        // confere se a requisião deu certo
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        // converte a resposta para JSON
        const weatherData = await response.json();
        
        // adapta os dados para o formato esperado pelo frontend
        const adaptedData = {
            name: location.name,
            sys: { country: location.country_code || location.country },
            main: {
                temp: weatherData.current.temperature_2m,
                humidity: weatherData.current.relative_humidity_2m,
                feels_like: weatherData.current.apparent_temperature
            },
            weather: [{
                description: getWeatherDescription(weatherData.current.weather_code),
                icon: getWeatherIcon(weatherData.current.weather_code)
            }],
            wind: {
                speed: weatherData.current.wind_speed_10m / 3.6, // converte km/h para m/s
                deg: weatherData.current.wind_direction_10m
            },
            visibility: 10000 // Open-Meteo não fornece visibilidade, usando valor padrão
        };
        
        // retorna os dados pro usuario
        res.json(adaptedData);
        
    } catch (error) {
        // trata os erro simples
        console.error('Erro ao buscar dados do clima:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar dados do clima',
            details: error.message 
        });
    }
});

// rota pra pegar os dados climáticos por coordenadas geográficas
app.get('/api/weather/coords/:lat/:lon', async (req, res) => {
    try {
        // pega a latitude e longitude nos parametros da URL
        const { lat, lon } = req.params;
        
        // confere se a chave da api ta configurada

        // monta a url da api
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
        
        // faz a requisicao pra api externa
        const response = await fetch(weatherUrl);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const weatherData = await response.json();
        
        // busca o nome da cidade pelas coordenadas
        const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=pt&format=json`;
        let locationName = 'Localização';
        let countryCode = 'XX';
        
        try {
            const geocodingResponse = await fetchWithTimeout(geocodingUrl);
            if (geocodingResponse.ok) {
                const geocodingData = await geocodingResponse.json();
                if (geocodingData.results && geocodingData.results.length > 0) {
                    locationName = geocodingData.results[0].name;
                    countryCode = geocodingData.results[0].country_code || geocodingData.results[0].country;
                }
            }
        } catch (error) {
            console.log('Erro ao buscar nome da localização:', error.message);
        }
        
        // adapta os dados para o formato esperado pelo frontend
        const adaptedData = {
            name: locationName,
            sys: { country: countryCode },
            main: {
                temp: weatherData.current.temperature_2m,
                humidity: weatherData.current.relative_humidity_2m,
                feels_like: weatherData.current.apparent_temperature
            },
            weather: [{
                description: getWeatherDescription(weatherData.current.weather_code),
                icon: getWeatherIcon(weatherData.current.weather_code)
            }],
            wind: {
                speed: weatherData.current.wind_speed_10m / 3.6, // converte km/h para m/s
                deg: weatherData.current.wind_direction_10m
            },
            visibility: 10000 // Open-Meteo não fornece visibilidade, usando valor padrão
        };
        
        res.json(adaptedData);
        
    } catch (error) {
        console.error('Erro ao buscar dados climáticos por coordenadas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar dados climáticos por coordenadas',
            details: error.message 
        });
    }
});

// rota pra pegar horário atual de uma timezone específica
app.get('/api/time/:timezone', async (req, res) => {
    try {
        // pega a timezone nos parametros da URL
        const timezone = req.params.timezone;
        
        // monta a url da api
        const timeUrl = `https://worldtimeapi.org/api/timezone/${timezone}`;
        
        // faz a requisicao pra api externa
        const response = await fetchWithTimeout(timeUrl);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        // converte a resposta pra JSON
        const timeData = await response.json();
        
        // retorna os dados pro usuario
        res.json(timeData);
        
    } catch (error) {
        // trata alguns erros
        console.error('Erro ao buscar dados de horário:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar dados de horário',
            details: error.message 
        });
    }
});

// rota pra pegar lista de todas as timezones disponíveis
app.get('/api/timezones', async (req, res) => {
    try {
        // url para obter lista de todas as timezones
        const timezonesUrl = 'https://worldtimeapi.org/api/timezone';
        
        // faz a requisicao pra api externa
        const response = await fetchWithTimeout(timezonesUrl);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const timezones = await response.json();
        res.json(timezones);
        
    } catch (error) {
        console.error('Erro ao buscar lista de timezones:', error);
        // fallback com lista de timezones principais
        const fallbackTimezones = [
            'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
            'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
            'Africa/Cairo', 'Africa/Johannesburg', 'America/Mexico_City'
        ];
        res.json(fallbackTimezones);
    }
});

// rota pra pegar dados combinados de clima e horário
app.get('/api/weather-time/:city/:timezone', async (req, res) => {
    try {
        // pega a cidade e timezone nos parametros da URL
        const { city, timezone } = req.params;
        
        // confere se a chave da api ta configurada
        // Open-Meteo não precisa de API key, mas vou manter a estrutura
        
        // primeiro busca as coordenadas da cidade
        const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
        const geocodingResponse = await fetchWithTimeout(geocodingUrl);
        
        if (!geocodingResponse.ok) {
            throw new Error(`Erro na API de geocoding: ${geocodingResponse.status}`);
        }
        
        const geocodingData = await geocodingResponse.json();
        
        if (!geocodingData.results || geocodingData.results.length === 0) {
            return res.status(404).json({ 
                error: 'Cidade não encontrada' 
            });
        }
        
        const location = geocodingData.results[0];
        const { latitude, longitude } = location;

        // faz as duas requisicoes simultaneamente usando Promise.all
        const [weatherResponse, timeResponse] = await Promise.all([
            fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`),
            fetchWithTimeout(`https://worldtimeapi.org/api/timezone/${timezone}`)
        ]);

        // confere se ambas as requisicoes deram certo
        if (!weatherResponse.ok || !timeResponse.ok) {
            throw new Error('Erro em uma das APIs');
        }

        // converte ambas as respostas pra JSON
        const [weatherData, timeData] = await Promise.all([
            weatherResponse.json(),
            timeResponse.json()
        ]);
        
        // adapta os dados do clima para o formato esperado
        const adaptedWeatherData = {
            name: location.name,
            sys: { country: location.country_code || location.country },
            main: {
                temp: weatherData.current.temperature_2m,
                humidity: weatherData.current.relative_humidity_2m,
                feels_like: weatherData.current.apparent_temperature
            },
            weather: [{
                description: getWeatherDescription(weatherData.current.weather_code),
                icon: getWeatherIcon(weatherData.current.weather_code)
            }],
            wind: {
                speed: weatherData.current.wind_speed_10m / 3.6, // converte km/h para m/s
                deg: weatherData.current.wind_direction_10m
            },
            visibility: 10000 // Open-Meteo não fornece visibilidade, usando valor padrão
        };

        // retorna os dados combinados
        res.json({
            weather: adaptedWeatherData,
            time: timeData,
            combined: true
        });

    } catch (error) {
        console.error('Erro ao buscar dados combinados:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar dados combinados',
            details: error.message 
        });
    }
});

// funcao auxiliar pra fazer requisicoes com timeout e retry
async function fetchWithTimeout(url, options = {}, timeout = 15000, retries = 3) {
    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.log(`Tentativa ${i + 1} falhou para ${url}:`, error.message);
            if (i === retries) {
                // se todas as tentativas falharam, tenta versao HTTP se era HTTPS
                if (url.startsWith('https://')) {
                    const httpUrl = url.replace('https://', 'http://');
                    console.log(`Tentando versão HTTP: ${httpUrl}`);
                    try {
                        const response = await fetch(httpUrl, {
                            ...options,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)',
                                ...options.headers
                            }
                        });
                        return response;
                    } catch (httpError) {
                        console.log(`HTTP também falhou: ${httpError.message}`);
                    }
                }
                throw error;
            }
            // espera um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}

// funcoes auxiliares pra converter os codigos de clima da Open-Meteo
function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'céu limpo',
        1: 'principalmente limpo',
        2: 'parcialmente nublado',
        3: 'nublado',
        45: 'nevoeiro',
        48: 'nevoeiro com geada',
        51: 'garoa leve',
        53: 'garoa moderada',
        55: 'garoa intensa',
        56: 'garoa gelada leve',
        57: 'garoa gelada intensa',
        61: 'chuva leve',
        63: 'chuva moderada',
        65: 'chuva intensa',
        66: 'chuva gelada leve',
        67: 'chuva gelada intensa',
        71: 'neve leve',
        73: 'neve moderada',
        75: 'neve intensa',
        77: 'granizo',
        80: 'pancadas de chuva leve',
        81: 'pancadas de chuva moderada',
        82: 'pancadas de chuva intensa',
        85: 'pancadas de neve leve',
        86: 'pancadas de neve intensa',
        95: 'tempestade',
        96: 'tempestade com granizo leve',
        99: 'tempestade com granizo intenso'
    };
    return descriptions[weatherCode] || 'condição desconhecida';
}

function getWeatherIcon(weatherCode) {
    // mapeia os codigos da Open-Meteo para icones similares do OpenWeatherMap
    const iconMap = {
        0: '01d', 
        1: '02d', 
        2: '03d', 
        3: '04d', 
        45: '50d', 
        48: '50d', 
        51: '09d', 
        53: '09d', 
        55: '09d', 
        56: '09d', 
        57: '09d', 
        61: '10d', 
        63: '10d', 
        65: '10d', 
        66: '10d', 
        67: '10d', 
        71: '13d', 
        73: '13d', 
        75: '13d', 
        77: '13d', 
        80: '09d', 
        81: '09d', 
        82: '09d', 
        85: '13d', 
        86: '13d', 
        95: '11d', 
        96: '11d', 
        99: '11d'  
    };
    return iconMap[weatherCode] || '01d';
}

// middleware pra tratar rotas nao encontradas (404)
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        message: 'A rota solicitada não existe neste servidor' 
    });
});

// middleware global pra tratar erros
app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro inesperado no servidor' 
    });
});

// inicia o servidor na porta que eu coloquei
app.listen(PORT, () => {
    console.log(`🌤️  Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Acesse: http://localhost:${PORT}`);
    console.log(`📚 APIs disponíveis:`);
    console.log(`   - GET /api/weather/:city`);
    console.log(`   - GET /api/weather/coords/:lat/:lon`);
    console.log(`   - GET /api/time/:timezone`);
    console.log(`   - GET /api/timezones`);
    console.log(`   - GET /api/weather-time/:city/:timezone`);
});

// to cansado bixo