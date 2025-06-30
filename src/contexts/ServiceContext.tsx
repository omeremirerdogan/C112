import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, platformsApi, servicesApi, Platform as DBPlatform, Service as DBService } from '../lib/supabase';

// Legacy interface'leri koruyoruz (geriye dönük uyumluluk için)
export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  category: string;
  platform: string;
  prices: Array<{
    amount: number;
    price: number;
  }>;
  features: string[];
  deliveryTime: string;
  quality: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  isActive: boolean;
  order: number;
  image?: string;
}

interface ServiceContextType {
  services: ServicePackage[];
  platforms: Platform[];
  loading: boolean;
  addService: (service: Omit<ServicePackage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateService: (id: string, updates: Partial<ServicePackage>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  getServicesByPlatform: (platform: string) => ServicePackage[];
  addPlatform: (platform: Omit<Platform, 'id'>) => Promise<void>;
  updatePlatform: (id: string, updates: Partial<Platform>) => Promise<void>;
  deletePlatform: (id: string) => Promise<void>;
  syncData: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Database verilerini legacy format'a çevir
const convertDBPlatformToLegacy = (dbPlatform: DBPlatform): Platform => ({
  id: dbPlatform.id,
  name: dbPlatform.name,
  icon: dbPlatform.icon,
  description: dbPlatform.description,
  color: dbPlatform.color,
  isActive: dbPlatform.is_active,
  order: dbPlatform.order_index,
  image: dbPlatform.image
});

const convertDBServiceToLegacy = (dbService: DBService): ServicePackage => ({
  id: dbService.id,
  name: dbService.name,
  description: dbService.description,
  category: dbService.category,
  platform: dbService.platform?.name || '',
  prices: dbService.prices,
  features: dbService.features,
  deliveryTime: dbService.delivery_time,
  quality: dbService.quality,
  isActive: dbService.is_active,
  createdAt: dbService.created_at,
  updatedAt: dbService.updated_at
});

// Legacy format'ı database format'ına çevir
const convertLegacyPlatformToDB = (platform: Omit<Platform, 'id'>): Omit<DBPlatform, 'id' | 'created_at' | 'updated_at'> => ({
  name: platform.name,
  icon: platform.icon,
  description: platform.description,
  color: platform.color,
  is_active: platform.isActive,
  order_index: platform.order,
  image: platform.image
});

const convertLegacyServiceToDB = (service: Omit<ServicePackage, 'id' | 'createdAt' | 'updatedAt'>, platformId: string): Omit<DBService, 'id' | 'created_at' | 'updated_at' | 'platform'> => ({
  name: service.name,
  description: service.description,
  category: service.category,
  platform_id: platformId,
  prices: service.prices,
  features: service.features,
  delivery_time: service.deliveryTime,
  quality: service.quality,
  is_active: service.isActive
});

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  // Verileri Supabase'den yükle
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading data from Supabase...');

      // Platformları ve hizmetleri paralel olarak yükle
      const [dbPlatforms, dbServices] = await Promise.all([
        platformsApi.getActive(),
        servicesApi.getActive()
      ]);

      // Legacy format'a çevir
      const legacyPlatforms = dbPlatforms.map(convertDBPlatformToLegacy);
      const legacyServices = dbServices.map(convertDBServiceToLegacy);

      setPlatforms(legacyPlatforms);
      setServices(legacyServices);

      console.log('✅ Data loaded successfully:', {
        platforms: legacyPlatforms.length,
        services: legacyServices.length
      });

    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
      
      // Fallback: varsayılan verileri kullan
      const fallbackData = getFallbackData();
      setPlatforms(fallbackData.platforms);
      setServices(fallbackData.services);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription setup
  useEffect(() => {
    // İlk veri yükleme
    loadData();

    // Real-time subscriptions
    const platformsSubscription = supabase
      .channel('platforms_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'platforms' },
        (payload) => {
          console.log('🔄 Platform change detected:', payload);
          loadData();
        }
      )
      .subscribe();

    const servicesSubscription = supabase
      .channel('services_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => {
          console.log('🔄 Service change detected:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      platformsSubscription.unsubscribe();
      servicesSubscription.unsubscribe();
    };
  }, []);

  const addService = async (service: Omit<ServicePackage, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Platform ID'sini bul
      const platform = platforms.find(p => p.name === service.platform);
      if (!platform) {
        throw new Error('Platform bulunamadı');
      }

      const dbService = convertLegacyServiceToDB(service, platform.id);
      await servicesApi.create(dbService);
      
      toast.success('Yeni hizmet eklendi!');
      // Real-time subscription otomatik olarak güncelleyecek
    } catch (error) {
      console.error('Service add error:', error);
      toast.error('Hizmet eklenirken hata oluştu');
    }
  };

  const updateService = async (id: string, updates: Partial<ServicePackage>) => {
    try {
      // Legacy updates'i DB format'ına çevir
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.prices !== undefined) dbUpdates.prices = updates.prices;
      if (updates.features !== undefined) dbUpdates.features = updates.features;
      if (updates.deliveryTime !== undefined) dbUpdates.delivery_time = updates.deliveryTime;
      if (updates.quality !== undefined) dbUpdates.quality = updates.quality;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      // Platform değişikliği varsa platform_id'yi güncelle
      if (updates.platform) {
        const platform = platforms.find(p => p.name === updates.platform);
        if (platform) {
          dbUpdates.platform_id = platform.id;
        }
      }

      await servicesApi.update(id, dbUpdates);
      toast.success('Hizmet güncellendi!');
    } catch (error) {
      console.error('Service update error:', error);
      toast.error('Hizmet güncellenirken hata oluştu');
    }
  };

  const deleteService = async (id: string) => {
    try {
      await servicesApi.delete(id);
      toast.success('Hizmet silindi!');
    } catch (error) {
      console.error('Service delete error:', error);
      toast.error('Hizmet silinirken hata oluştu');
    }
  };

  const getServicesByPlatform = (platform: string) => {
    return services.filter(service => 
      service.platform.toLowerCase() === platform.toLowerCase() && service.isActive
    );
  };

  const addPlatform = async (platform: Omit<Platform, 'id'>) => {
    try {
      const dbPlatform = convertLegacyPlatformToDB(platform);
      await platformsApi.create(dbPlatform);
      toast.success('Yeni platform eklendi!');
    } catch (error) {
      console.error('Platform add error:', error);
      toast.error('Platform eklenirken hata oluştu');
    }
  };

  const updatePlatform = async (id: string, updates: Partial<Platform>) => {
    try {
      // Legacy updates'i DB format'ına çevir
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.order !== undefined) dbUpdates.order_index = updates.order;
      if (updates.image !== undefined) dbUpdates.image = updates.image;

      await platformsApi.update(id, dbUpdates);
      toast.success('Platform güncellendi!');
    } catch (error) {
      console.error('Platform update error:', error);
      toast.error('Platform güncellenirken hata oluştu');
    }
  };

  const deletePlatform = async (id: string) => {
    try {
      await platformsApi.delete(id);
      toast.success('Platform silindi!');
    } catch (error) {
      console.error('Platform delete error:', error);
      toast.error('Platform silinirken hata oluştu');
    }
  };

  const syncData = async () => {
    await loadData();
  };

  const forceRefresh = async () => {
    await loadData();
  };

  return (
    <ServiceContext.Provider value={{
      services,
      platforms,
      loading,
      addService,
      updateService,
      deleteService,
      getServicesByPlatform,
      addPlatform,
      updatePlatform,
      deletePlatform,
      syncData,
      forceRefresh
    }}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return context;
};

// Fallback data (Supabase bağlantısı yoksa)
function getFallbackData() {
  const platforms: Platform[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      description: 'Instagram hesabınızı büyütmek için gereken tüm hizmetler',
      color: 'from-pink-500 to-purple-600',
      isActive: true,
      order: 1
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '🎥',
      description: 'YouTube kanalınızı büyütmek için etkili çözümler',
      color: 'from-red-500 to-red-600',
      isActive: true,
      order: 2
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      description: 'TikTok hesabınızı viral yapmak için profesyonel hizmetler',
      color: 'from-gray-800 to-gray-900',
      isActive: true,
      order: 3
    }
  ];

  const services: ServicePackage[] = [
    {
      id: 'instagram_followers_1',
      name: 'Premium Türk Takipçi',
      description: 'Gerçek Türk kullanıcılardan takipçi',
      category: 'Takipçi',
      platform: 'Instagram',
      prices: [
        { amount: 100, price: 15.00 },
        { amount: 250, price: 35.00 },
        { amount: 500, price: 65.00 },
        { amount: 1000, price: 120.00 }
      ],
      features: ['Gerçek Türk hesaplar', 'Drop koruması', 'Hızlı teslimat'],
      deliveryTime: '0-2 saat',
      quality: 'Premium',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return { platforms, services };
}