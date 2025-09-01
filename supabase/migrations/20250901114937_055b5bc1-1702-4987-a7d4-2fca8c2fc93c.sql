-- Fix function search path security issue
ALTER FUNCTION public.cleanup_expired_weather_cache() 
SET search_path = public;