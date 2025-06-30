import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ve Anon Key gerekli. Lütfen .env dosyasını kontrol edin.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  is_active: boolean;
  order_index: number;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  platform_id: string;
  prices: Array<{
    amount: number;
    price: number;
  }>;
  features: string[];
  delivery_time: string;
  quality: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  platform?: Platform;
}

// Database functions
export const platformsApi = {
  // Tüm platformları getir
  async getAll(): Promise<Platform[]> {
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('Platforms fetch error:', error);
      throw error;
    }
    
    return data || [];
  },

  // Aktif platformları getir
  async getActive(): Promise<Platform[]> {
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('Active platforms fetch error:', error);
      throw error;
    }
    
    return data || [];
  },

  // Platform ekle
  async create(platform: Omit<Platform, 'id' | 'created_at' | 'updated_at'>): Promise<Platform> {
    const { data, error } = await supabase
      .from('platforms')
      .insert([platform])
      .select()
      .single();
    
    if (error) {
      console.error('Platform create error:', error);
      throw error;
    }
    
    return data;
  },

  // Platform güncelle
  async update(id: string, updates: Partial<Platform>): Promise<Platform> {
    const { data, error } = await supabase
      .from('platforms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Platform update error:', error);
      throw error;
    }
    
    return data;
  },

  // Platform sil
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('platforms')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Platform delete error:', error);
      throw error;
    }
  }
};

export const servicesApi = {
  // Tüm hizmetleri getir (platform bilgisi ile)
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        platform:platforms(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Services fetch error:', error);
      throw error;
    }
    
    return data || [];
  },

  // Aktif hizmetleri getir
  async getActive(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        platform:platforms(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Active services fetch error:', error);
      throw error;
    }
    
    return data || [];
  },

  // Platform'a göre hizmetleri getir
  async getByPlatform(platformName: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        platform:platforms(*)
      `)
      .eq('platforms.name', platformName)
      .eq('is_active', true);
    
    if (error) {
      console.error('Services by platform fetch error:', error);
      throw error;
    }
    
    return data || [];
  },

  // Hizmet ekle
  async create(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'platform'>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select(`
        *,
        platform:platforms(*)
      `)
      .single();
    
    if (error) {
      console.error('Service create error:', error);
      throw error;
    }
    
    return data;
  },

  // Hizmet güncelle
  async update(id: string, updates: Partial<Service>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        platform:platforms(*)
      `)
      .single();
    
    if (error) {
      console.error('Service update error:', error);
      throw error;
    }
    
    return data;
  },

  // Hizmet sil
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Service delete error:', error);
      throw error;
    }
  }
};