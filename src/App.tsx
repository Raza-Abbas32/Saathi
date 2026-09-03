import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import DiseaseDetectionPage from '@/pages/DiseaseDetectionPage';
import CropRecommendationPage from '@/pages/CropRecommendationPage';
import MarketPricesPage from '@/pages/MarketPricesPage';
import MarketplacePage from '@/pages/MarketplacePage';
import AssistantPage from '@/pages/AssistantPage';
import ProfilePage from '@/pages/ProfilePage';
import FarmProfilePage from '@/pages/FarmProfilePage';
import FarmWatchPage from '@/pages/FarmWatchPage';
import FarmPlanPage from '@/pages/FarmPlanPage';
import FarmMemoryPage from '@/pages/FarmMemoryPage';
import FarmIntelligencePage from '@/pages/FarmIntelligencePage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                      path="/disease-detection"
                      element={
                        <ProtectedRoute>
                          <DiseaseDetectionPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/crop-recommendation"
                      element={
                        <ProtectedRoute>
                          <CropRecommendationPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/market-prices"
                      element={
                        <ProtectedRoute>
                          <MarketPricesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketplace"
                      element={
                        <ProtectedRoute>
                          <MarketplacePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/assistant"
                      element={
                        <ProtectedRoute>
                          <AssistantPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/farm-profile" element={<FarmProfilePage />} />
                    <Route
                      path="/farm-watch"
                      element={
                        <ProtectedRoute>
                          <FarmWatchPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/farm-plan"
                      element={
                        <ProtectedRoute>
                          <FarmPlanPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/farm-memory"
                      element={
                        <ProtectedRoute>
                          <FarmMemoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/farm-intelligence"
                      element={
                        <ProtectedRoute>
                          <FarmIntelligencePage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
