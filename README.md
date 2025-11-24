# ServiceTrack Cloud

Aplicativo de gerenciamento de serviços Frontend (React + Vite + Supabase).

## 🚀 Instalação

1. Instale: `npm install`
2. Execute: `npm run dev`

---

## 📸 NOVA FUNCIONALIDADE: GALERIA DE FOTOS

Para habilitar o suporte a múltiplas fotos no seu projeto, vá no **Supabase** > **SQL Editor** e rode este comando:

```sql
-- Adiciona a coluna 'images' do tipo array de texto, se ela ainda não existir
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT array[]::text[];
```

---

## 🚑 SOS: CORREÇÃO DE DADOS (ERRO DE EXCLUSÃO)

Se não consegue excluir, verifique o "Dono do Serviço" no rodapé da página. Se for diferente do seu ID, rode:

```sql
UPDATE public.services
SET user_id = auth.uid()
WHERE user_id IS NULL OR user_id != auth.uid();
```

---

## 🗄️ SQL COMPLETO (RESET TOTAL)

Use se estiver configurando do zero.

```sql
-- 1. TABELA
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  name text NOT NULL,
  description text,
  responsible text,
  start_date text,
  end_date text,
  status text DEFAULT 'Pendente',
  process text,
  result text,
  notes text[] DEFAULT array[]::text[],
  image_url text,
  images text[] DEFAULT array[]::text[] -- Nova coluna de galeria
);

-- 2. POLÍTICAS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para o dono" ON public.services;
CREATE POLICY "Permitir tudo para o dono" ON public.services FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('service-evidence', 'service-evidence', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Public View" ON storage.objects;
CREATE POLICY "Public View" ON storage.objects FOR SELECT USING ( bucket_id = 'service-evidence' );
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" ON storage.objects FOR ALL USING ( bucket_id = 'service-evidence' AND auth.role() = 'authenticated' );
```