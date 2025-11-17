// Classe principal da aplicação
class WeatherTimeApp {
    constructor() {
        // Inicializa elementos do DOM
        this.initializeElements();
        // Configura event listeners
        this.setupEventListeners();
        // Carrega lista de timezones
        this.loadTimezones();
    }

    // Inicializa referências dos elementos DOM
    initializeElements() {
        // Elementos de entrada
        this.cityInput = document.getElementById('cityInput');
        this.timezoneSelect = document.getElementById('timezoneSelect');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.retryBtn = document.getElementById('retryBtn');

        // Seções da interface
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.errorSection = document.getElementById('errorSection');

        // Elementos de clima
        this.weatherLocation = document.getElementById('weatherLocation');
        this.temperature = document.getElementById('temperature');
        this.weatherIcon = document.getElementById('weatherIcon');
        this.weatherDescription = document.getElementById('weatherDescription');
        this.humidity = document.getElementById('humidity');
        this.windSpeed = document.getElementById('windSpeed');
        this.visibility = document.getElementById('visibility');
        this.feelsLike = document.getElementById('feelsLike');

        // Elementos de horário
        this.timezoneInfo = document.getElementById('timezoneInfo');
        this.currentTime = document.getElementById('currentTime');
        this.currentDate = document.getElementById('currentDate');
        this.timezoneAbbr = document.getElementById('timezoneAbbr');
        this.dayOfYear = document.getElementById('dayOfYear');
        this.weekNumber = document.getElementById('weekNumber');
        this.utcOffset = document.getElementById('utcOffset');

        // Elemento de mensagem de erro
        this.errorMessage = document.getElementById('errorMessage');
    }

    // Configura todos os event listeners
    setupEventListeners() {
        // Botão de busca
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        
        // Botão de localização
        this.locationBtn.addEventListener('click', () => this.handleLocationSearch());
        
        // Botão de retry
        this.retryBtn.addEventListener('click', () => this.handleRetry());
        
        // Enter no input da cidade
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Mudança no select de timezone
        this.timezoneSelect.addEventListener('change', () => {
            if (this.cityInput.value && this.timezoneSelect.value) {
                this.handleSearch();
            }
        });
    }

    // Carrega lista de timezones disponíveis
    async loadTimezones() {
        try {
            // Faz requisição para obter lista de timezones
            const response = await fetch('/api/timezones');
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const timezones = await response.json();
            
            // Limpa opções existentes
            this.timezoneSelect.innerHTML = '<option value="">Selecione um fuso horário...</option>';
            
            // Adiciona timezones populares primeiro
            const popularTimezones = [
                'America/Sao_Paulo',
                'America/New_York',
                'Europe/London',
                'Europe/Paris',
                'Asia/Tokyo',
                'Australia/Sydney'
            ];

            // Adiciona seção de timezones populares
            const popularGroup = document.createElement('optgroup');
            popularGroup.label = 'Fusos Populares';
            
            popularTimezones.forEach(tz => {
                if (timezones.includes(tz)) {
                    const option = document.createElement('option');
                    option.value = tz;
                    option.textContent = this.formatTimezone(tz);
                    popularGroup.appendChild(option);
                }
            });
            
            this.timezoneSelect.appendChild(popularGroup);

            // Adiciona todos os outros timezones
            const allGroup = document.createElement('optgroup');
            allGroup.label = 'Todos os Fusos';
            
            timezones
                .filter(tz => !popularTimezones.includes(tz))
                .sort()
                .forEach(timezone => {
                    const option = document.createElement('option');
                    option.value = timezone;
                    option.textContent = this.formatTimezone(timezone);
                    allGroup.appendChild(option);
                });
            
            this.timezoneSelect.appendChild(allGroup);

        } catch (error) {
            console.error('Erro ao carregar timezones:', error);
            this.timezoneSelect.innerHTML = '<option value="">Erro ao carregar timezones</option>';
        }
    }

    // Formata nome da timezone para exibição
    formatTimezone(timezone) {
        return timezone
            .replace(/_/g, ' ')
            .replace(/\//g, ' / ')
            .replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    // Manipula busca por cidade e timezone
    async handleSearch() {
        const city = this.cityInput.value.trim();
        const timezone = this.timezoneSelect.value;

        // Validação dos campos
        if (!city) {
            this.showError('Por favor, digite o nome de uma cidade.');
            return;
        }

        if (!timezone) {
            this.showError('Por favor, selecione um fuso horário.');
            return;
        }

        // Armazena valores para retry
        this.lastSearchCity = city;
        this.lastSearchTimezone = timezone;

        // Executa busca
        await this.searchWeatherAndTime(city, timezone);
    }

    // Manipula busca por localização atual
    async handleLocationSearch() {
        // Verifica se geolocalização está disponível
        if (!navigator.geolocation) {
            this.showError('Geolocalização não é suportada neste navegador.');
            return;
        }

        this.showLoading();

        try {
            // Obtém posição atual
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            // Busca dados climáticos por coordenadas
            const weatherResponse = await fetch(`/api/weather/coords/${latitude}/${longitude}`);
            
            if (!weatherResponse.ok) {
                throw new Error(`Erro na API de clima: ${weatherResponse.status}`);
            }

            const weatherData = await weatherResponse.json();
            
            // Atualiza campo da cidade com o nome encontrado
            this.cityInput.value = weatherData.name;

            // Se timezone não estiver selecionado, usa um padrão baseado na localização
            if (!this.timezoneSelect.value) {
                // Tenta determinar timezone baseado no país
                const countryTimezones = {
                    'BR': 'America/Sao_Paulo',
                    'US': 'America/New_York',
                    'GB': 'Europe/London',
                    'FR': 'Europe/Paris',
                    'JP': 'Asia/Tokyo',
                    'AU': 'Australia/Sydney'
                };
                
                const timezone = countryTimezones[weatherData.sys.country] || 'America/Sao_Paulo';
                this.timezoneSelect.value = timezone;
            }

            // Executa busca completa
            await this.searchWeatherAndTime(weatherData.name, this.timezoneSelect.value);

        } catch (error) {
            console.error('Erro ao obter localização:', error);
            this.showError('Erro ao obter sua localização. Verifique as permissões do navegador.');
        }
    }

    // Promise wrapper para geolocalização
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutos
            });
        });
    }

    // Busca dados de clima e horário
    async searchWeatherAndTime(city, timezone) {
        this.showLoading();

        try {
            // Faz requisição para endpoint combinado
            const response = await fetch(`/api/weather-time/${encodeURIComponent(city)}/${encodeURIComponent(timezone)}`);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            // Atualiza interface com os dados
            this.updateWeatherDisplay(data.weather);
            this.updateTimeDisplay(data.time);
            
            // Mostra seção de resultados
            this.showResults();

        } catch (error) {
            console.error('Erro na busca:', error);
            this.showError('Erro ao buscar informações. Verifique os dados inseridos e tente novamente.');
        }
    }

    // Atualiza display das informações climáticas
    updateWeatherDisplay(weatherData) {
        // Informações principais
        this.weatherLocation.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
        this.temperature.textContent = Math.round(weatherData.main.temp);
        this.weatherDescription.textContent = weatherData.weather[0].description;

        // Ícone do clima
        const iconCode = weatherData.weather[0].icon;
        this.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        this.weatherIcon.alt = weatherData.weather[0].description;
        this.weatherIcon.style.display = 'block';

        // Detalhes climáticos
        this.humidity.textContent = `${weatherData.main.humidity}%`;
        this.windSpeed.textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`; // Converte m/s para km/h
        this.visibility.textContent = `${(weatherData.visibility / 1000).toFixed(1)} km`; // Converte metros para km
        this.feelsLike.textContent = `${Math.round(weatherData.main.feels_like)}°C`;
    }

    // Atualiza display das informações de horário
    updateTimeDisplay(timeData) {
        // Cria objeto Date a partir do datetime ISO
        const dateTime = new Date(timeData.datetime);
        
        // Informações principais
        this.timezoneInfo.textContent = timeData.timezone;
        
        // Formata horário (HH:MM:SS)
        const timeString = dateTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTime.textContent = timeString;

        // Formata data
        const dateString = dateTime.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.currentDate.textContent = dateString;

        // Detalhes de horário
        this.timezoneAbbr.textContent = timeData.abbreviation;
        this.dayOfYear.textContent = timeData.day_of_year;
        this.weekNumber.textContent = timeData.week_number;
        this.utcOffset.textContent = timeData.utc_offset;

        // Inicia atualização automática do horário
        this.startTimeUpdate(timeData.timezone);
    }

    // Inicia atualização automática do horário a cada segundo
    startTimeUpdate(timezone) {
        // Limpa interval anterior se existir
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }

        // Atualiza a cada segundo
        this.timeUpdateInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/time/${encodeURIComponent(timezone)}`);
                if (response.ok) {
                    const timeData = await response.json();
                    const dateTime = new Date(timeData.datetime);
                    
                    const timeString = dateTime.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    
                    this.currentTime.textContent = timeString;
                }
            } catch (error) {
                console.error('Erro ao atualizar horário:', error);
                // Para a atualização em caso de erro
                clearInterval(this.timeUpdateInterval);
            }
        }, 1000);
    }

    // Manipula retry da última busca
    handleRetry() {
        if (this.lastSearchCity && this.lastSearchTimezone) {
            this.cityInput.value = this.lastSearchCity;
            this.timezoneSelect.value = this.lastSearchTimezone;
            this.searchWeatherAndTime(this.lastSearchCity, this.lastSearchTimezone);
        } else {
            this.hideError();
        }
    }

    // Mostra seção de loading
    showLoading() {
        this.hideAllSections();
        this.loadingSection.style.display = 'block';
    }

    // Mostra seção de resultados
    showResults() {
        this.hideAllSections();
        this.resultsSection.style.display = 'block';
    }

    // Mostra seção de erro
    showError(message) {
        this.hideAllSections();
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
    }

    // Esconde seção de erro
    hideError() {
        this.errorSection.style.display = 'none';
    }

    // Esconde todas as seções
    hideAllSections() {
        this.resultsSection.style.display = 'none';
        this.loadingSection.style.display = 'none';
        this.errorSection.style.display = 'none';
    }

    // Cleanup quando a página é fechada
    cleanup() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Cria instância da aplicação
    const app = new WeatherTimeApp();
    
    // Cleanup quando a página é fechada
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
    
    // Torna a instância global para debug (opcional)
    window.weatherTimeApp = app;
});

// Função utilitária para debug (pode ser removida em produção)
function debugApp() {
    console.log('Estado da aplicação:', {
        cityInput: document.getElementById('cityInput').value,
        timezoneSelect: document.getElementById('timezoneSelect').value,
        resultsVisible: document.getElementById('resultsSection').style.display !== 'none',
        loadingVisible: document.getElementById('loadingSection').style.display !== 'none',
        errorVisible: document.getElementById('errorSection').style.display !== 'none'
    });
}
