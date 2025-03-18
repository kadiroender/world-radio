import { useState, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Typography, 
  Grid, 
  Box,
  IconButton,
  ThemeProvider,
  createTheme,
  Paper,
  Divider,
  CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SearchIcon from '@mui/icons-material/Search';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

interface RadioStation {
  id: string;
  name: string;
  country: string;
  url: string;
  favicon: string;
  geo_lat: number;
  geo_long: number;
  city: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}

function App() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [audio] = useState(new Audio());
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (currentStation) {
      fetchWeather(currentStation.city);
    }
  }, [currentStation]);

  const fetchStations = async () => {
    try {
      const response = await axios.get('https://de1.api.radio-browser.info/json/stations/search', {
        params: {
          limit: 100,
          hidebroken: true,
          has_extended_info: true,
          has_geo_info: true,
        }
      });
      setStations(response.data);
      if (response.data.length > 0) {
        setMapCenter([response.data[0].geo_lat, response.data[0].geo_long]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (city: string) => {
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: city,
          appid: import.meta.env.VITE_OPENWEATHERMAP_API_KEY,
          units: 'metric',
          lang: 'tr'
        }
      });
      setWeatherData({
        temperature: Math.round(response.data.main.temp),
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredStations = stations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayStation = (station: RadioStation) => {
    if (currentStation?.id === station.id) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      audio.pause();
      audio.src = station.url;
      audio.play();
      setCurrentStation(station);
      setIsPlaying(true);
      setMapCenter([station.geo_lat, station.geo_long]);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'background.default'
        }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="xl">
          <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ color: 'primary.main', mb: 4 }}>
            World Radio Garden
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by station name, country, or city..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />,
              }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ height: '600px', overflow: 'hidden' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={2}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {filteredStations.map((station) => (
                    <Marker
                      key={station.id}
                      position={[station.geo_lat, station.geo_long]}
                    >
                      <Popup>
                        <Box sx={{ p: 1 }}>
                          <Typography variant="h6">{station.name}</Typography>
                          <Typography variant="body2">{station.city}, {station.country}</Typography>
                          <IconButton 
                            onClick={() => handlePlayStation(station)}
                            color="primary"
                            sx={{ mt: 1 }}
                          >
                            {currentStation?.id === station.id && isPlaying ? 
                              <PauseIcon /> : 
                              <PlayArrowIcon />
                            }
                          </IconButton>
                        </Box>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '600px', overflow: 'auto' }}>
                {currentStation ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {currentStation.favicon && (
                        <img 
                          src={currentStation.favicon} 
                          alt={currentStation.name}
                          style={{ width: 60, height: 60, marginRight: 16, borderRadius: '50%' }}
                        />
                      )}
                      <Box>
                        <Typography variant="h5" gutterBottom>
                          {currentStation.name}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {currentStation.city}, {currentStation.country}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    {weatherData && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Weather in {currentStation.city}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <img 
                            src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                            alt={weatherData.description}
                            style={{ width: 50, height: 50 }}
                          />
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="h4">
                              {weatherData.temperature}°C
                            </Typography>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                              {weatherData.description}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="h6" color="text.secondary" align="center">
                    Select a radio station from the map to see details
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
